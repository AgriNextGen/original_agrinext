/**
 * Login by phone + password + role
 * Deploy: supabase functions deploy login-by-phone --no-verify-jwt
 *
 * Input: { phone: string, password: string, role: string }
 * Output: { access_token, refresh_token, expires_in } or 401
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return digits.length >= 10 ? `+91${digits.slice(-10)}` : "";
}

function getAuthEmailFromPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.length === 10 ? `91${digits}` : digits.startsWith("91") ? digits : `91${digits.slice(-10)}`;
  return `${normalized}@agrinext.local`;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, password } = (await req.json()) as { phone?: string; password?: string };
    if (!phone || !password) {
      return new Response(
        JSON.stringify({ error: "Invalid credentials" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Enforce minimum password policy client-side also; server double-check
    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: "Invalid credentials" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone || normalizedPhone.length < 12) {
      return new Response(
        JSON.stringify({ error: "Invalid credentials" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // IP prefix for simple tracking
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const ipPrefix = ip.split(",")[0].trim().split(".").slice(0,3).join("."); // /24

    // Rate limiting checks using login_attempts table
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentFails } = await supabaseAdmin.rpc("sql", {
      -- placeholder, will replace with direct query
      -- but supabase-js doesn't support raw SQL via rpc easily; use from select
      p: null
    }).catch(() => ({ data: null }));

    // Simpler: count via select
    const { count: failCountPhone } = await supabaseAdmin
      .from("login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("phone", normalizedPhone)
      .gte("attempt_time", fiveMinsAgo);

    const { count: failCountIp } = await supabaseAdmin
      .from("login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip_prefix", ipPrefix)
      .gte("attempt_time", fiveMinsAgo);

    const totalFails = (failCountPhone || 0) + (failCountIp || 0);
    if (totalFails >= 10) {
      // Block for 15 minutes (return 429)
      await supabaseAdmin.from("audit.security_events").insert({
        event_type: "login_blocked",
        details: { phone: normalizedPhone, ip_prefix: ipPrefix, reason: "too_many_failed_attempts" }
      }).catch(()=>null);
      return new Response(JSON.stringify({ error: "Too many failed attempts" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (totalFails >= 5) {
      // Introduce delay
      await new Promise((r) => setTimeout(r, 2000));
    }

    // Find profile by phone
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, auth_email")
      .eq("phone", normalizedPhone)
      .maybeSingle();

    if (profileError || !profile) {
      // log failed attempt
      await supabaseAdmin.from("login_attempts").insert({ phone: normalizedPhone, ip_prefix: ipPrefix, success: false }).catch(()=>null);
      return new Response(
        JSON.stringify({ error: "Invalid credentials" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const authEmail = profile.auth_email || getAuthEmailFromPhone(normalizedPhone);

    const tokenRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email: authEmail, password }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      // log failed attempt
      await supabaseAdmin.from("login_attempts").insert({ phone: normalizedPhone, ip_prefix: ipPrefix, success: false }).catch(()=>null);
      return new Response(
        JSON.stringify({ error: "Invalid credentials" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Successful login: log success and return profiles
    await supabaseAdmin.from("login_attempts").insert({ phone: normalizedPhone, ip_prefix: ipPrefix, success: true }).catch(()=>null);

    // Fetch user_profiles for this user
    const { data: profiles } = await supabaseAdmin
      .from("user_profiles")
      .select("id, profile_type, display_name, phone, is_active")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: true });

    return new Response(
      JSON.stringify({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        profiles: profiles || []
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid credentials" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
