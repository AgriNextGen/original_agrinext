import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  getRequestIdFromHeaders,
  makeResponseWithRequestId,
  logStructured,
} from "../_shared/request_context.ts";

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
  const normalized = digits.length === 10
    ? `91${digits}`
    : digits.startsWith("91")
    ? digits
    : `91${digits.slice(-10)}`;
  return `${normalized}@agrinext.local`;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonHeaders() {
  return { ...corsHeaders, "Content-Type": "application/json" };
}

function secondsUntil(date: Date): number {
  return Math.max(1, Math.ceil((date.getTime() - Date.now()) / 1000));
}

function temporaryBlockResponse(reqId: string, blockedUntilRaw: string) {
  const blockedUntil = new Date(blockedUntilRaw);
  const retryAfterSeconds = Number.isFinite(blockedUntil.getTime())
    ? secondsUntil(blockedUntil)
    : 300;

  return makeResponseWithRequestId(
    JSON.stringify({
      error: "temporarily_blocked",
      message: `Too many attempts. Try again at ${blockedUntilRaw}`,
      retry_at: blockedUntilRaw,
      retry_after_seconds: retryAfterSeconds,
    }),
    reqId,
    {
      status: 429,
      headers: {
        ...jsonHeaders(),
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const reqId = getRequestIdFromHeaders(req.headers);
    const { phone, password } = (await req.json()) as {
      phone?: string;
      password?: string;
    };

    if (!phone || !password) {
      return makeResponseWithRequestId(
        JSON.stringify({ error: "Invalid credentials" }),
        reqId,
        { status: 401, headers: jsonHeaders() },
      );
    }

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return makeResponseWithRequestId(
        JSON.stringify({ error: "Invalid credentials" }),
        reqId,
        { status: 401, headers: jsonHeaders() },
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Account status checks run before token exchange.
    const { data: profileRows } = await supabaseAdmin
      .from("profiles")
      .select("id, auth_email, account_status, blocked_until, created_at")
      .eq("phone", normalizedPhone)
      .order("created_at", { ascending: false })
      .limit(2);
    const profile = profileRows?.[0] ?? null;

    if ((profileRows?.length ?? 0) > 1) {
      logStructured({
        request_id: reqId,
        endpoint: "login-by-phone",
        status: "ambiguous_phone_profiles",
        phone: normalizedPhone,
        matches: profileRows?.length ?? 0,
        selected_user_id: profile?.id ?? null,
      });
    }

    if (profile) {
      const accountStatus = profile.account_status ?? "active";
      const blockedUntil = profile.blocked_until
        ? new Date(profile.blocked_until)
        : null;
      const isBlockedNow = blockedUntil ? blockedUntil > new Date() : false;

      if (accountStatus === "locked" || accountStatus === "under_review") {
        return makeResponseWithRequestId(
          JSON.stringify({
            error: "account_locked",
            message: "Account locked. Contact support.",
          }),
          reqId,
          { status: 403, headers: jsonHeaders() },
        );
      }

      if (accountStatus === "restricted" && isBlockedNow) {
        return temporaryBlockResponse(reqId, String(profile.blocked_until));
      }

      if (accountStatus === "restricted" && !isBlockedNow) {
        await supabaseAdmin
          .from("profiles")
          .update({ account_status: "active", blocked_until: null })
          .eq("id", profile.id)
          .catch(() => null);
      }

      if (isBlockedNow) {
        return temporaryBlockResponse(reqId, String(profile.blocked_until));
      }
    }

    const authEmail = profile?.auth_email || getAuthEmailFromPhone(normalizedPhone);
    const tokenRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email: authEmail, password }),
    });
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      try {
        const rpcRes = await supabaseAdmin.rpc("record_failed_login_v1", {
          p_phone: normalizedPhone,
          p_ip: req.headers.get("x-forwarded-for") || null,
          p_device_id: req.headers.get("user-agent") || null,
        });
        if (rpcRes.error) {
          logStructured({
            request_id: reqId,
            endpoint: "login-by-phone",
            status: "failed_login_counter_error",
            phone: normalizedPhone,
            error: rpcRes.error.message,
          });
        }
      } catch {
        logStructured({
          request_id: reqId,
          endpoint: "login-by-phone",
          status: "failed_login_counter_error",
          phone: normalizedPhone,
          error: "rpc_exception",
        });
      }
      logStructured({
        request_id: reqId,
        endpoint: "login-by-phone",
        status: "failed",
        phone: normalizedPhone,
      });
      return makeResponseWithRequestId(
        JSON.stringify({ error: "Invalid credentials" }),
        reqId,
        { status: 401, headers: jsonHeaders() },
      );
    }

    try {
      await supabaseAdmin
        .from("profiles")
        .update({
          last_login_at: new Date().toISOString(),
          failed_login_count_window: 0,
          failed_login_window_started_at: null,
          blocked_until: null,
          account_status: "active",
        })
        .eq("phone", normalizedPhone);
    } catch {
      // best-effort
    }

    logStructured({
      request_id: reqId,
      endpoint: "login-by-phone",
      status: "success",
      phone: normalizedPhone,
      user_id: profile?.id ?? null,
    });
    return makeResponseWithRequestId(
      JSON.stringify({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
      }),
      reqId,
      { status: 200, headers: jsonHeaders() },
    );
  } catch (err) {
    const reqId = getRequestIdFromHeaders(req.headers);
    console.error("login-by-phone error:", err);
    logStructured({
      request_id: reqId,
      endpoint: "login-by-phone",
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    });
    return makeResponseWithRequestId(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal" }),
      reqId,
      { status: 500, headers: jsonHeaders() },
    );
  }
});
