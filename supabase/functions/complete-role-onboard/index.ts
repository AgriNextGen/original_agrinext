/**
 * @function complete-role-onboard
 * @description Completes role onboarding for an authenticated user.
 *   Sets the user's role in user_roles, creates role-specific records
 *   (buyers, transporters, admin_users), and updates user_profiles.
 *
 * @auth verify_jwt = true (requires authenticated user)
 *
 * @request POST /functions/v1/complete-role-onboard
 *   { role: "farmer"|"agent"|"logistics"|"buyer" }
 *
 * @response
 *   200: { ok: true, role, dashboard_route }
 *   400: { error: { code, message } }
 *   401: { error: { code: "unauthorized", message } }
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type AppRole = "farmer" | "agent" | "logistics" | "buyer" | "vendor";

const VALID_ROLES = new Set<AppRole>(["farmer", "agent", "logistics", "buyer", "vendor"]);

const ROLE_DASHBOARD: Record<AppRole, string> = {
  farmer: "/farmer/dashboard",
  agent: "/agent/dashboard",
  logistics: "/logistics/dashboard",
  buyer: "/marketplace/dashboard",
  vendor: "/vendor/dashboard",
};

const headers = { ...corsHeaders, "Content-Type": "application/json" };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: { code: "METHOD_NOT_ALLOWED", message: "POST only" } }), { status: 405, headers });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ success: false, error: { code: "UNAUTHORIZED", message: "Missing authorization" } }), { status: 401, headers });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data: { user }, error: authError } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid token" } }), { status: 401, headers });
    }

    const body = await req.json();
    const role = body.role as AppRole;

    if (!role || !VALID_ROLES.has(role)) {
      return new Response(JSON.stringify({ success: false, error: { code: "INVALID_ROLE", message: "Role must be one of: farmer, agent, logistics, buyer, vendor" } }), { status: 400, headers });
    }

    const userId = user.id;
    const nowIso = new Date().toISOString();

    const { data: profile } = await admin.from("profiles").select("full_name, phone, district, village").eq("id", userId).maybeSingle();
    const fullName = profile?.full_name ?? user.user_metadata?.full_name ?? "User";
    const phone = profile?.phone ?? user.phone ?? null;
    const district = profile?.district ?? null;
    const village = profile?.village ?? null;

    await admin.from("user_roles").upsert(
      { user_id: userId, role, created_at: nowIso },
      { onConflict: "user_id" },
    );

    try {
      await admin.from("user_profiles").upsert(
        { user_id: userId, profile_type: role, display_name: fullName, phone, is_active: true },
        { onConflict: "user_id,profile_type" },
      );
    } catch {
      // user_profiles may not exist in all environments
    }

    if (role === "buyer") {
      await admin.from("buyers").upsert(
        { user_id: userId, name: fullName, phone, district, preferred_crops: ["onion", "tomato"], updated_at: nowIso },
        { onConflict: "user_id" },
      );
    }

    if (role === "logistics") {
      await admin.from("transporters").upsert(
        { user_id: userId, name: fullName, phone, operating_district: district, operating_village: village, updated_at: nowIso },
        { onConflict: "user_id" },
      );
    }

    return new Response(JSON.stringify({ success: true, data: { role, dashboard_route: ROLE_DASHBOARD[role] } }), { status: 200, headers });
  } catch (err) {
    console.error("complete-role-onboard error:", err);
    return new Response(JSON.stringify({ success: false, error: { code: "INTERNAL", message: "Internal error" } }), { status: 500, headers });
  }
});
