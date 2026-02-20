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
  const { file_id } = body || {};
  if (!file_id) return errorResponse("bad_request", "missing file_id", 400);

  const SUPABASE_URL = getRequiredEnv("SUPABASE_URL");
  const SERVICE_KEY = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const ANON_KEY = getRequiredEnv("SUPABASE_ANON_KEY");
  const userClient = createClient(SUPABASE_URL, ANON_KEY);
  await userClient.auth.setAuth(token);
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return errorResponse("unauthorized", "invalid token", 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: f } = await admin.from("files").select("id,bucket,object_path,owner_user_id,visibility,status").eq("id", file_id).maybeSingle();
  if (!f) return errorResponse("not_found", "file not found", 404);
  if (f.visibility !== 'public' && f.owner_user_id !== user.id && !(await admin.rpc('is_admin_bool').then(r=>r.data?.[0]))) {
    return errorResponse("forbidden", "not authorized to read", 403);
  }
  if (f.status !== 'ready') return errorResponse("not_ready", "file not ready", 400);

  const { data: signed, error: signErr } = await admin.storage.from(f.bucket).createSignedUrl(f.object_path, 300);
  if (signErr || !signed) return errorResponse("internal_error", "failed to create signed url", 500);

  return new Response(JSON.stringify({ signed_read_url: signed.signedUrl, expires_in: 300 }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }});
});

