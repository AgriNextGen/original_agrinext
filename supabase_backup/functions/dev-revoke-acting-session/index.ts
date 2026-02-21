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
  const { acting_session_id } = body || {};
  if (!acting_session_id) return errorResponse("bad_request", "missing acting_session_id", 400);

  const SUPABASE_URL = getRequiredEnv("SUPABASE_URL");
  const SERVICE_KEY = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supa = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    // Verify developer is allowlisted
    const { data: allow } = await supa.from("dev_allowlist").select("user_id").eq("user_id", developerId).maybeSingle();
    if (!allow) {
      return errorResponse("forbidden", "developer not allowlisted", 403);
    }

    // Revoke session
    const { error: updErr } = await supa.from("dev_acting_sessions").update({ revoked_at: new Date().toISOString() }).eq("id", acting_session_id);
    if (updErr) {
      return errorResponse("internal_error", "failed to revoke acting session", 500);
    }

    // Audit log (best-effort)
    await supa.from("audit.audit_logs").insert({
      user_id: developerId,
      action: "revoke_acting_session",
      meta: { acting_session_id },
    }).maybeSingle();

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return errorResponse("internal_error", String(err?.message ?? err), 500);
  }
});

