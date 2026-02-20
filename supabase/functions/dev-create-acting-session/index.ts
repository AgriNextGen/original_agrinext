import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { errorResponse } from "../_shared/errors.ts";
import { getRequiredEnv } from "../_shared/env.ts";
import { createClient } from "https://cdn.skypack.dev/@supabase/supabase-js";

function parseJwtSub(req: Request) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.replace("Bearer ", "").trim();
  try {
    const payload = token.split(".")[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded).sub;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const DEV_MODE = Deno.env.get("VITE_ENABLE_DEV_MODE") === "true";
  if (!DEV_MODE) return errorResponse("forbidden", "dev mode disabled", 403);

  const developerId = parseJwtSub(req);
  if (!developerId) return errorResponse("unauthorized", "missing auth", 401);

  const body = await req.json().catch(() => ({}));
  const { acting_as_user_id, acting_as_role, note } = body || {};
  if (!acting_as_user_id || !acting_as_role) return errorResponse("bad_request", "missing params", 400);

  const SUPABASE_URL = getRequiredEnv("SUPABASE_URL");
  const SERVICE_KEY = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supa = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    // Verify developer is allowlisted
    const { data: allow } = await supa.from("dev_allowlist").select("user_id").eq("user_id", developerId).maybeSingle();
    if (!allow) {
      return errorResponse("forbidden", "developer not allowlisted", 403);
    }

    // Prevent impersonating admins
    const { data: targetRole } = await supa.from("user_roles").select("role").eq("user_id", acting_as_user_id).maybeSingle();
    if (targetRole?.role === "admin") {
      return errorResponse("forbidden", "cannot impersonate admin users", 403);
    }

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes
    const insert = await supa.from("dev_acting_sessions").insert({
      developer_user_id: developerId,
      acting_as_user_id,
      acting_as_role,
      expires_at: expiresAt,
      note: note || null,
    }).select().maybeSingle();

    if (insert.error) {
      return errorResponse("internal_error", "failed to create acting session", 500);
    }

    // Audit log (best-effort)
    await supa.from("audit.audit_logs").insert({
      user_id: developerId,
      action: "create_acting_session",
      meta: { acting_session_id: insert.data?.id, acting_as_user_id, acting_as_role, note },
    }).maybeSingle();

    return new Response(JSON.stringify({ ok: true, acting_session_id: insert.data?.id, expires_at: expiresAt }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return errorResponse("internal_error", String(err?.message ?? err), 500);
  }
});

