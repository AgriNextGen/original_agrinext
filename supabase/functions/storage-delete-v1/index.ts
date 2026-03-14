import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { errorResponse } from "../_shared/errors.ts";
import { getRequiredEnv } from "../_shared/env.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer ")) return errorResponse("unauthorized", "missing auth", 401);
    const token = auth.replace("Bearer ", "").trim();
    const body = await req.json().catch(() => ({}));
    const { file_id, bucket, path } = body || {};
    if (!file_id && !(bucket && path)) {
      return errorResponse("bad_request", "missing file_id or bucket/path", 400);
    }

    const SUPABASE_URL = getRequiredEnv("SUPABASE_URL");
    const SERVICE_KEY = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return errorResponse("unauthorized", "invalid token", 401);

    if (file_id) {
      const { data: f } = await admin
        .from("files")
        .select("bucket,object_path,owner_user_id")
        .eq("id", file_id)
        .maybeSingle();
      if (!f) return errorResponse("not_found", "file not found", 404);

      if (f.owner_user_id !== user.id) {
        const { data: adminRow } = await admin.from("admin_users").select("id").eq("user_id", user.id).maybeSingle();
        if (!adminRow) return errorResponse("forbidden", "not owner", 403);
      }

      await admin.storage.from(f.bucket).remove([f.object_path]).catch(() => null);
      await admin
        .from("files")
        .update({ status: "deleted", updated_at: new Date().toISOString() })
        .eq("id", file_id)
        .catch(() => null);

      return new Response(
        JSON.stringify({ success: true, data: { deleted: true } }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // bucket + path mode: owner check via files table lookup, fallback to admin check
    const { data: fByPath } = await admin
      .from("files")
      .select("id,owner_user_id")
      .eq("bucket", bucket)
      .eq("object_path", path)
      .maybeSingle();

    if (fByPath && fByPath.owner_user_id !== user.id) {
      const { data: adminRow } = await admin.from("admin_users").select("id").eq("user_id", user.id).maybeSingle();
      if (!adminRow) return errorResponse("forbidden", "not owner", 403);
    }

    await admin.storage.from(bucket).remove([path]).catch(() => null);
    if (fByPath) {
      await admin
        .from("files")
        .update({ status: "deleted", updated_at: new Date().toISOString() })
        .eq("id", fByPath.id)
        .catch(() => null);
    }

    return new Response(
      JSON.stringify({ success: true, data: { deleted: true } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return errorResponse("internal_error", err instanceof Error ? err.message : "unexpected error", 500);
  }
});
