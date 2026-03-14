/**
 * @function image-upload
 * @description Validated image upload endpoint. Accepts multipart form data,
 *   validates image type/size/content, uploads to Supabase Storage,
 *   and records metadata in the files table.
 *
 * @auth verify_jwt = true (JWT required)
 *
 * @request POST /functions/v1/image-upload
 *   multipart/form-data: file (binary), upload_type (string), entity_id (string)
 *
 * @response
 *   200: { success: true, data: { file_id, file_path, signed_url, upload_type } }
 *   400: { success: false, error: { code, message } }
 *   401: { success: false, error: { code: "unauthorized" } }
 *   429: { success: false, error: { code: "rate_limited" } }
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

import { corsHeaders } from "../_shared/cors.ts";
import { successResponse, errorResponse } from "../_shared/errors.ts";
import { getRequestIdFromHeaders, logStructured } from "../_shared/request_context.ts";
import {
  validateImageFile,
  sanitizeFileName,
  getExtensionForType,
  UPLOAD_TYPE_BUCKET_MAP,
  VALID_UPLOAD_TYPES,
} from "../_shared/image_validator.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = (Deno.env.get("SUPABASE_ANON_KEY") ?? "").trim();

const IMAGE_RATE_LIMIT = 30;
const IMAGE_RATE_WINDOW_SECONDS = 3600;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const reqId = getRequestIdFromHeaders(req.headers);
  const startedAt = Date.now();

  try {
    if (req.method !== "POST") {
      return errorResponse("method_not_allowed", "Only POST is supported", 405);
    }

    // ── Auth ─────────────────────────────────────────────────────────
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return errorResponse("unauthorized", "Missing authorization", 401);
    }

    const { data: userRes } = await supabaseAdmin.auth.getUser(token);
    const user = userRes?.user ?? null;
    if (!user) {
      return errorResponse("unauthorized", "Invalid token", 401);
    }

    // ── Rate limit ───────────────────────────────────────────────────
    try {
      const { data: allowed } = await supabaseAdmin.rpc("consume_rate_limit", {
        p_key: `image_upload:${user.id}`,
        p_limit: IMAGE_RATE_LIMIT,
        p_window_seconds: IMAGE_RATE_WINDOW_SECONDS,
      });
      if (allowed === false) {
        return errorResponse("rate_limited", "Image upload rate limit exceeded", 429);
      }
    } catch {
      // Rate limit RPC failure is non-blocking
    }

    // ── Parse multipart form ─────────────────────────────────────────
    const contentType = req.headers.get("content-type") || "";
    let file: File | null = null;
    let uploadType = "";
    let entityId = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      file = formData.get("file") as File | null;
      uploadType = String(formData.get("upload_type") ?? "");
      entityId = String(formData.get("entity_id") ?? "");
    } else if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      uploadType = String(body.upload_type ?? "");
      entityId = String(body.entity_id ?? "");
      if (body.file_base64 && body.file_type) {
        const binary = Uint8Array.from(atob(body.file_base64), (c) => c.charCodeAt(0));
        file = new File([binary], body.file_name ?? "upload.jpg", { type: body.file_type });
      }
    }

    if (!file) {
      return errorResponse("invalid_input", "file is required", 400);
    }
    if (!uploadType || !VALID_UPLOAD_TYPES.includes(uploadType)) {
      return errorResponse(
        "invalid_input",
        `upload_type must be one of: ${VALID_UPLOAD_TYPES.join(", ")}`,
        400,
      );
    }
    if (!entityId) {
      return errorResponse("invalid_input", "entity_id is required", 400);
    }

    // ── Validate image ───────────────────────────────────────────────
    const arrayBuffer = await file.arrayBuffer();
    const fileBytes = new Uint8Array(arrayBuffer);
    const declaredType = file.type || "application/octet-stream";

    const validation = validateImageFile(fileBytes, declaredType, file.size);
    if (!validation.valid) {
      return errorResponse("invalid_image", validation.error ?? "Invalid image", 400);
    }

    // ── Upload to storage ────────────────────────────────────────────
    const bucket = UPLOAD_TYPE_BUCKET_MAP[uploadType];
    const ext = getExtensionForType(declaredType);
    const safeName = sanitizeFileName(file.name);
    const objectPath = `${uploadType}/${entityId}/${crypto.randomUUID()}_${safeName}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(objectPath, fileBytes, {
        contentType: declaredType,
        upsert: false,
      });

    if (uploadError) {
      logStructured({
        request_id: reqId,
        endpoint: "image-upload",
        status: "storage_upload_failed",
        error: uploadError.message,
      });
      return errorResponse("storage_error", `Upload failed: ${uploadError.message}`, 500);
    }

    // ── Insert into files table ──────────────────────────────────────
    const { data: fileRow, error: insertError } = await supabaseAdmin
      .from("files")
      .insert({
        bucket,
        object_path: objectPath,
        owner_user_id: user.id,
        entity_type: uploadType,
        entity_id: entityId,
        purpose: uploadType,
        mime_type: declaredType,
        size_bytes: file.size,
        visibility: "private",
        status: "ready",
      })
      .select("id")
      .maybeSingle();

    if (insertError) {
      logStructured({
        request_id: reqId,
        endpoint: "image-upload",
        status: "files_insert_failed",
        error: insertError.message,
      });
      return errorResponse("internal", "Failed to record file metadata", 500);
    }

    // ── Generate signed URL ──────────────────────────────────────────
    const { data: signedData } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(objectPath, 300);

    const signedUrl = signedData?.signedUrl ?? "";

    logStructured({
      request_id: reqId,
      endpoint: "image-upload",
      user_id: user.id,
      upload_type: uploadType,
      file_id: fileRow?.id,
      size_bytes: file.size,
      latency_ms: Date.now() - startedAt,
    });

    return successResponse({
      file_id: fileRow?.id ?? null,
      file_path: objectPath,
      signed_url: signedUrl,
      upload_type: uploadType,
      bucket,
      size_bytes: file.size,
    });
  } catch (error) {
    logStructured({
      request_id: reqId,
      endpoint: "image-upload",
      status: "error",
      latency_ms: Date.now() - startedAt,
      error: String((error as Error)?.message ?? error),
    });

    const status = Number((error as { status?: number })?.status ?? 500);
    const code = String((error as { code?: string })?.code ?? "internal");
    const message = String((error as Error)?.message ?? "Unknown error");
    return errorResponse(code, message, Number.isFinite(status) ? status : 500);
  }
});
