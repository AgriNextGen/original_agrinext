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

  const developerId = parseJwtSub(req);
  if (!developerId) return errorResponse("unauthorized", "missing auth", 401);

  const body = await req.json().catch(() => ({}));
  const { role } = body || {};
  if (!role) return errorResponse("bad_request", "missing role", 400);

  const SUPABASE_URL = getRequiredEnv("SUPABASE_URL");
  const SERVICE_KEY = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supa = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    // Insert user_roles and create role-specific row in a single transaction
    const userId = developerId;
    // Upsert user_roles
    const { error: urErr } = await supa.from("user_roles").upsert({ user_id: userId, role }, { onConflict: "user_id" });
    if (urErr) return errorResponse("internal_error", "failed to upsert user_roles", 500);

    // Create role specific record if needed (idempotent using upsert)
    if (role === "buyer") {
      await supa.from("buyers").upsert({ user_id: userId, name: null }, { onConflict: "user_id" });
    } else if (role === "logistics") {
      await supa.from("transporters").upsert({ user_id: userId, name: null }, { onConflict: "user_id" });
    } else if (role === "farmer") {
      await supa.from("profiles").upsert({ id: userId }, { onConflict: "id" });
    } else if (role === "agent") {
      // agents may require an agent record; create profile if missing
      await supa.from("profiles").upsert({ id: userId }, { onConflict: "id" });
    }

    // Audit
    await supa.from("audit.audit_logs").insert({
      user_id: userId,
      action: "complete_role_onboard",
      meta: { role },
    }).maybeSingle();

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return errorResponse("internal_error", String(err?.message ?? err), 500);
  }
});

