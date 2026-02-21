import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getRequestIdFromHeaders, makeResponseWithRequestId, logStructured } from "../_shared/request_context.ts";

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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const reqId = getRequestIdFromHeaders(req.headers);
    const { phone, password } = (await req.json()) as { phone?: string; password?: string };
    if (!phone || !password) return new Response(JSON.stringify({ error: "Invalid credentials" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) return new Response(JSON.stringify({ error: "Invalid credentials" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Basic profile status check: block or restricted handling
    const { data: profile } = await supabaseAdmin.from("profiles").select("id, account_status, blocked_until").eq("phone", normalizedPhone).maybeSingle();
    if (profile) {
      if (profile.account_status === 'locked') {
        return new Response(JSON.stringify({ error: "account_locked", message: "Account locked. Contact support." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (profile.blocked_until && new Date(profile.blocked_until) > new Date()) {
        return new Response(JSON.stringify({ error: "temporarily_blocked", message: `Too many attempts. Try again at ${profile.blocked_until}` }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Attempt auth via Supabase Auth
    const authEmail = profile?.id ? (profile as any).auth_email || getAuthEmailFromPhone(normalizedPhone) : getAuthEmailFromPhone(normalizedPhone);
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
      // record failed login via RPC for counting and potential blocking
      try {
        await supabaseAdmin.rpc("security.record_failed_login_v1", {
          p_request_id: reqId,
          p_phone: normalizedPhone,
          p_ip: req.headers.get("x-forwarded-for") || null,
          p_device_id: req.headers.get("user-agent") || null
        });
      } catch (e) { /* best-effort */ }
      logStructured({ request_id: reqId, endpoint: "login-by-phone", status: "failed", phone: normalizedPhone });
      return makeResponseWithRequestId(JSON.stringify({ error: "Invalid credentials" }), reqId, { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // on success: reset counters & set last_login_at
    try {
      await supabaseAdmin.from("profiles").update({ last_login_at: new Date().toISOString(), failed_login_count_window: 0, failed_login_window_started_at: null }).eq("phone", normalizedPhone);
    } catch (e) { /* best-effort */ }

    logStructured({ request_id: reqId, endpoint: "login-by-phone", status: "success", phone: normalizedPhone, user_id: (profile && (profile as any).id) || null });
    return makeResponseWithRequestId(JSON.stringify({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in
    }), reqId, { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    const reqId = getRequestIdFromHeaders(req.headers);
    console.error("login-by-phone error:", err);
    logStructured({ request_id: reqId, endpoint: "login-by-phone", status: "error", error: err instanceof Error ? err.message : String(err) });
    return makeResponseWithRequestId(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal' }), reqId, { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

