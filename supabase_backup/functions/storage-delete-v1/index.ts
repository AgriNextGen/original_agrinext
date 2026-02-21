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
  const { file_id, bucket, path } = body || {};
  if (!file_id && !(bucket && path)) return errorResponse("bad_request", "missing file_id or bucket/path", 400);

  const SUPABASE_URL = getRequiredEnv("SUPABASE_URL");
  const SERVICE_KEY = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const ANON_KEY = getRequiredEnv("SUPABASE_ANON_KEY");
  const userClient = createClient(SUPABASE_URL, ANON_KEY);
  await userClient.auth.setAuth(token);
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return errorResponse("unauthorized", "invalid token", 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  try {
    if (file_id) {
      const { data: f } = await admin.from("files").select("bucket,object_path,owner_user_id").eq("id", file_id).maybeSingle();
      if (!f) return errorResponse("not_found", "file not found", 404);
      if (f.owner_user_id !== user.id && !(await admin.rpc('is_admin_bool').then(r=>r.data?.[0]))) return errorResponse("forbidden", "not owner", 403);
      await admin.storage.from(f.bucket).remove([f.object_path]).catch(()=>null);
      await admin.from("files").update({ status: 'failed', updated_at: new Date().toISOString() }).eq("id", file_id).catch(()=>null);
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }});
    } else {
      // bucket+path provided (admin only)
      if (!(await admin.rpc('is_admin_bool').then(r=>r.data?.[0]))) return errorResponse("forbidden", "admin only", 403);
      await admin.storage.from(bucket).remove([path]).catch(()=>null);
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }});
    }
  } catch (err) {
    return errorResponse("internal_error", String(err?.message ?? err), 500);
  }
});

