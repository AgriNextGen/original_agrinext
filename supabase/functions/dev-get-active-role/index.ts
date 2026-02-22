import { serve } from "std/server";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DEV_TOOLS_ENABLED = Deno.env.get("DEV_TOOLS_ENABLED") || "false";
const DEV_TOOLS_SECRET = Deno.env.get("DEV_TOOLS_SECRET") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, x-dev-secret",
  "Content-Type": "application/json",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { ...corsHeaders, "Access-Control-Allow-Methods": "GET, OPTIONS" } });
  }
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  if (DEV_TOOLS_ENABLED !== "true") {
    return new Response(JSON.stringify({ ok: false, error: "Not found" }), { status: 404, headers: corsHeaders });
  }

  const maybeSecret = req.headers.get("x-dev-secret") || "";
  if (DEV_TOOLS_SECRET && DEV_TOOLS_SECRET !== "" && maybeSecret !== DEV_TOOLS_SECRET) {
    return new Response(JSON.stringify({ ok: false, error: "Forbidden" }), { status: 403, headers: corsHeaders });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return new Response(JSON.stringify({ ok: false, error: "Missing authorization" }), { status: 401, headers: corsHeaders });
  }
  const token = authHeader.split(" ")[1];

  // Get user info from Supabase Auth endpoint using the bearer token
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!userRes.ok) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid token" }), { status: 401, headers: corsHeaders });
  }
  const userJson = await userRes.json();
  const userId = userJson?.id;
  if (!userId) {
    return new Response(JSON.stringify({ ok: false, error: "Unable to determine user" }), { status: 401, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    const { data: roleData, error: roleErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybe_single();
    if (roleErr) {
      return new Response(JSON.stringify({ ok: false, error: "role_check_failed" }), { status: 500, headers: corsHeaders });
    }
    const isAdmin = roleData?.role === "admin";
    const { data: allowRow, error: allowErr } = await supabase
      .from("dev_allowlist")
      .select("user_id")
      .eq("user_id", userId)
      .maybe_single();
    if (allowErr) {
      return new Response(JSON.stringify({ ok: false, error: "allowlist_check_failed" }), { status: 500, headers: corsHeaders });
    }
    if (!isAdmin && !allowRow) {
      return new Response(JSON.stringify({ ok: false, error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    // Check for override that is not expired
    const { data: overrideData } = await supabase
      .from("dev_role_overrides")
      .select("active_role, expires_at")
      .eq("user_id", userId)
      .maybe_single();

    const real_role = roleData?.role ?? null;
    const hasOverride = overrideData && new Date(overrideData.expires_at) > new Date();
    const active_role = hasOverride ? overrideData.active_role : real_role;
    const expires_at = overrideData?.expires_at ?? null;

    return new Response(JSON.stringify({ ok: true, real_role, active_role, override: !!hasOverride, expires_at }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("dev-get-active-role error", err);
    return new Response(JSON.stringify({ ok: false, error: "server_error" }), { status: 500, headers: corsHeaders });
  }
});
