import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { errorResponse } from "../_shared/errors.ts";
import { getRequiredEnv } from "../_shared/env.ts";
import { createClient } from "https://cdn.skypack.dev/@supabase/supabase-js";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return errorResponse("unauthorized", "missing auth", 401);
  const token = auth.replace("Bearer ", "").trim();

  const body = await req.json().catch(() => ({}));
  const { entity, bucket, content_type, size_bytes, purpose, visibility } = body || {};
  if (!entity || !entity.type || !entity.id || !bucket || !content_type || !size_bytes) {
    return errorResponse("bad_request", "missing params", 400);
  }

  const SUPABASE_URL = getRequiredEnv("SUPABASE_URL");
  const SERVICE_KEY = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const ANON_KEY = getRequiredEnv("SUPABASE_ANON_KEY");

  // Validate user from token
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  await userClient.auth.setAuth(token);
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return errorResponse("unauthorized", "invalid token", 401);

  // Validate ownership of entity (basic checks)
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  if (entity.type === "trip") {
    const { data: t } = await admin.from("trips").select("transport_request_id").eq("id", entity.id).maybeSingle();
    if (!t) return errorResponse("not_found", "entity not found", 404);
    // only transporter or admin allowed to attach trip proofs
    const { data: trip } = await admin.from("trips").select("transporter_id").eq("id", entity.id).maybeSingle();
    if (trip?.transporter_id !== user.id && !(await admin.rpc('is_admin_bool').then(r=>r.data?.[0]))) {
      // fallback: allow admins only
      return errorResponse("forbidden", "not owner", 403);
    }
  }

  // Generate object path
  const ext = content_type.startsWith("image/") ? "jpg" : content_type === "application/pdf" ? "pdf" : "bin";
  const object_path = `${entity.type}/${entity.id}/${crypto.randomUUID()}.${ext}`;

  // Insert file record as pending (service role)
  const { data: fileRow, error: fileErr } = await admin.from("files").insert({
    bucket,
    object_path,
    owner_user_id: user.id,
    entity_type: entity.type,
    entity_id: entity.id,
    purpose: purpose || 'other',
    mime_type: content_type,
    size_bytes: size_bytes,
    visibility: visibility || 'private',
    status: 'pending',
  }).select().maybeSingle();

  if (fileErr) return errorResponse("internal_error", "failed to register file", 500);

  // Create signed upload URL/token (service role)
  const { data: signed, error: signErr } = await admin.storage.from(bucket).createSignedUploadUrl(object_path, 60);
  if (signErr || !signed) {
    return errorResponse("internal_error", "failed to create signed url", 500);
  }

  return new Response(JSON.stringify({
    file_id: fileRow.id,
    bucket,
    path: object_path,
    token: signed.signedUploadUrlToken || signed.signedUrl || null,
    expires_in: 60,
  }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }});
});

