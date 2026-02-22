import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  getRequestIdFromHeaders,
  logStructured,
  makeResponseWithRequestId,
} from "../_shared/request_context.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AppRole = "farmer" | "agent" | "logistics" | "buyer" | "admin";

type SignupErrorCode =
  | "PHONE_ALREADY_EXISTS"
  | "EMAIL_ALREADY_EXISTS"
  | "ROLE_CLOSED"
  | "SIGNUP_DISABLED"
  | "RATE_LIMITED"
  | "VALIDATION_ERROR"
  | "INTERNAL";

type SignupRequest = {
  role?: AppRole;
  phone?: string;
  password?: string;
  full_name?: string;
  email?: string | null;
  profile_metadata?: {
    village?: string;
    district?: string;
    preferred_language?: string;
  };
};

type SignupGuardResult = {
  allowed: boolean;
  error_code: SignupErrorCode | null;
  reason: string | null;
};

const ROLE_SET = new Set<AppRole>([
  "farmer",
  "agent",
  "logistics",
  "buyer",
  "admin",
]);

const ROLE_DASHBOARD: Record<AppRole, string> = {
  farmer: "/farmer/dashboard",
  agent: "/agent/dashboard",
  logistics: "/logistics/dashboard",
  buyer: "/marketplace/dashboard",
  admin: "/admin/dashboard",
};

function normalizePhone(phone: string): string {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (digits.length > 10) return `+91${digits.slice(-10)}`;
  return "";
}

function getAuthEmailFromPhone(phone: string): string {
  const digits = String(phone || "").replace(/\D/g, "");
  const normalized = digits.length === 10
    ? `91${digits}`
    : digits.startsWith("91")
    ? digits
    : `91${digits.slice(-10)}`;
  return `${normalized}@agrinext.local`;
}

function sanitizeText(input: unknown, max = 120): string | null {
  if (typeof input !== "string") return null;
  const value = input.trim();
  if (!value) return null;
  return value.slice(0, max);
}

function parseEmail(input: string | null | undefined): string | null {
  if (!input) return null;
  const candidate = input.trim().toLowerCase();
  if (!candidate) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate)) return null;
  return candidate;
}

function pickClientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  const first = forwarded.split(",").map((item) => item.trim()).find(Boolean);
  const ip = first || req.headers.get("x-real-ip") || null;
  return ip ? ip.slice(0, 64) : null;
}

function ipPrefix(ip: string | null): string | null {
  if (!ip) return null;
  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length >= 3) return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
  }
  if (ip.includes(":")) {
    const parts = ip.split(":");
    return `${parts.slice(0, 4).join(":")}::/64`;
  }
  return ip;
}

function jsonText(value: unknown): string {
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return "null";
  }
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const arr = Array.from(new Uint8Array(digest));
  return arr.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function parseConfigBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true") return true;
    if (v === "false") return false;
  }
  if (typeof value === "number") return value !== 0;
  return fallback;
}

function parseConfigInt(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(1, Math.floor(value));
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return Math.max(1, parsed);
  }
  return fallback;
}

function parseConfigStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

async function readAppConfig(admin: ReturnType<typeof createClient>) {
  const keys = [
    "SIGNUP_ENABLED",
    "SIGNUP_MINIMAL_MODE",
    "SIGNUP_MAX_PER_IP_5M",
    "SIGNUP_MAX_PER_PHONE_1H",
    "SIGNUP_BLOCKED_PHONE_PREFIXES",
    "SIGNUP_BLOCKED_IP_PREFIXES",
    "OPEN_SIGNUP_FARMER",
    "OPEN_SIGNUP_AGENT",
    "OPEN_SIGNUP_LOGISTICS",
    "OPEN_SIGNUP_BUYER",
    "OPEN_SIGNUP_ADMIN",
  ];

  const { data, error } = await admin
    .from("app_config")
    .select("key,value")
    .in("key", keys);

  if (error) {
    return {
      SIGNUP_ENABLED: true,
      SIGNUP_MINIMAL_MODE: true,
      SIGNUP_MAX_PER_IP_5M: 2000,
      SIGNUP_MAX_PER_PHONE_1H: 60,
      SIGNUP_BLOCKED_PHONE_PREFIXES: [] as string[],
      SIGNUP_BLOCKED_IP_PREFIXES: [] as string[],
      OPEN_SIGNUP_FARMER: true,
      OPEN_SIGNUP_AGENT: true,
      OPEN_SIGNUP_LOGISTICS: true,
      OPEN_SIGNUP_BUYER: true,
      OPEN_SIGNUP_ADMIN: false,
    };
  }

  const map = new Map<string, unknown>();
  for (const row of data ?? []) map.set(row.key, row.value);

  return {
    SIGNUP_ENABLED: parseConfigBool(map.get("SIGNUP_ENABLED"), true),
    SIGNUP_MINIMAL_MODE: parseConfigBool(map.get("SIGNUP_MINIMAL_MODE"), true),
    SIGNUP_MAX_PER_IP_5M: parseConfigInt(map.get("SIGNUP_MAX_PER_IP_5M"), 2000),
    SIGNUP_MAX_PER_PHONE_1H: parseConfigInt(
      map.get("SIGNUP_MAX_PER_PHONE_1H"),
      60,
    ),
    SIGNUP_BLOCKED_PHONE_PREFIXES: parseConfigStringArray(
      map.get("SIGNUP_BLOCKED_PHONE_PREFIXES"),
    ),
    SIGNUP_BLOCKED_IP_PREFIXES: parseConfigStringArray(
      map.get("SIGNUP_BLOCKED_IP_PREFIXES"),
    ),
    OPEN_SIGNUP_FARMER: parseConfigBool(map.get("OPEN_SIGNUP_FARMER"), true),
    OPEN_SIGNUP_AGENT: parseConfigBool(map.get("OPEN_SIGNUP_AGENT"), true),
    OPEN_SIGNUP_LOGISTICS: parseConfigBool(map.get("OPEN_SIGNUP_LOGISTICS"), true),
    OPEN_SIGNUP_BUYER: parseConfigBool(map.get("OPEN_SIGNUP_BUYER"), true),
    OPEN_SIGNUP_ADMIN: parseConfigBool(map.get("OPEN_SIGNUP_ADMIN"), false),
  };
}

function roleOpenFlag(config: Awaited<ReturnType<typeof readAppConfig>>, role: AppRole) {
  if (role === "farmer") return config.OPEN_SIGNUP_FARMER;
  if (role === "agent") return config.OPEN_SIGNUP_AGENT;
  if (role === "logistics") return config.OPEN_SIGNUP_LOGISTICS;
  if (role === "buyer") return config.OPEN_SIGNUP_BUYER;
  return config.OPEN_SIGNUP_ADMIN;
}

async function evaluateSignupGuard(
  admin: ReturnType<typeof createClient>,
  params: {
    role: AppRole;
    normalizedPhone: string;
    requestId: string;
    ipAddress: string | null;
    ipPrefix: string | null;
  },
): Promise<SignupGuardResult> {
  const config = await readAppConfig(admin);
  if (!config.SIGNUP_ENABLED) {
    return {
      allowed: false,
      error_code: "SIGNUP_DISABLED",
      reason: "signup_disabled",
    };
  }

  if (!roleOpenFlag(config, params.role)) {
    return {
      allowed: false,
      error_code: "ROLE_CLOSED",
      reason: "role_closed",
    };
  }

  const normalizedDigits = params.normalizedPhone.replace(/\D/g, "");
  const blockedPhone = config.SIGNUP_BLOCKED_PHONE_PREFIXES.some((prefix) =>
    params.normalizedPhone.startsWith(prefix) ||
    normalizedDigits.startsWith(prefix.replace(/\D/g, ""))
  );
  if (blockedPhone) {
    return {
      allowed: false,
      error_code: "SIGNUP_DISABLED",
      reason: "blocked_phone_prefix",
    };
  }

  if (
    params.ipAddress &&
    config.SIGNUP_BLOCKED_IP_PREFIXES.some((prefix) =>
      params.ipAddress?.startsWith(prefix)
    )
  ) {
    return {
      allowed: false,
      error_code: "SIGNUP_DISABLED",
      reason: "blocked_ip_prefix",
    };
  }

  try {
    const { data, error } = await admin.rpc("evaluate_signup_guard_v1", {
      p_request_id: params.requestId,
      p_role: params.role,
      p_phone: params.normalizedPhone,
      p_ip: params.ipAddress,
    });
    if (!error) {
      const row = Array.isArray(data) ? data[0] : data;
      if (row && typeof row.allowed === "boolean") {
        return {
          allowed: row.allowed,
          error_code: row.error_code ?? null,
          reason: row.reason ?? null,
        };
      }
    }
  } catch {
    // fallback below
  }

  const ipLimit = config.SIGNUP_MINIMAL_MODE
    ? Math.max(config.SIGNUP_MAX_PER_IP_5M, 2000)
    : config.SIGNUP_MAX_PER_IP_5M;
  const phoneLimit = config.SIGNUP_MINIMAL_MODE
    ? Math.max(config.SIGNUP_MAX_PER_PHONE_1H, 60)
    : config.SIGNUP_MAX_PER_PHONE_1H;

  const safeIpPrefix = params.ipPrefix ?? "unknown";
  const ipKey = `signup:ip:${safeIpPrefix}`;
  const phoneKey = `signup:phone:${normalizedDigits}`;

  const ipConsumed = await admin.rpc("consume_rate_limit", {
    p_key: ipKey,
    p_limit: ipLimit,
    p_window_seconds: 300,
  });
  if (!ipConsumed.error && ipConsumed.data === false) {
    return {
      allowed: false,
      error_code: "RATE_LIMITED",
      reason: "ip_rate_limited",
    };
  }

  const phoneConsumed = await admin.rpc("consume_rate_limit", {
    p_key: phoneKey,
    p_limit: phoneLimit,
    p_window_seconds: 3600,
  });
  if (!phoneConsumed.error && phoneConsumed.data === false) {
    return {
      allowed: false,
      error_code: "RATE_LIMITED",
      reason: "phone_rate_limited",
    };
  }

  return { allowed: true, error_code: null, reason: null };
}

async function listAuthUserByEmail(
  admin: ReturnType<typeof createClient>,
  email: string,
) {
  for (let page = 1; page <= 30; page += 1) {
    const listed = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (listed.error) return null;
    const users = listed.data?.users ?? [];
    const found = users.find((item) =>
      (item.email ?? "").toLowerCase() === email.toLowerCase()
    );
    if (found) return found;
    if (users.length < 200) break;
  }
  return null;
}

async function listAuthUserByPhone(
  admin: ReturnType<typeof createClient>,
  phone: string,
) {
  for (let page = 1; page <= 30; page += 1) {
    const listed = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (listed.error) return null;
    const users = listed.data?.users ?? [];
    const found = users.find((item) => (item.phone ?? "") === phone);
    if (found) return found;
    if (users.length < 200) break;
  }
  return null;
}

async function recordSignupAttempt(
  admin: ReturnType<typeof createClient>,
  payload: {
    request_id: string;
    normalized_phone_hash: string;
    ip_prefix: string | null;
    role: AppRole | null;
    status_code: number;
    error_code: SignupErrorCode | null;
    user_id?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  try {
    await admin.from("signup_attempts").insert({
      request_id: payload.request_id,
      normalized_phone_hash: payload.normalized_phone_hash,
      ip_prefix: payload.ip_prefix,
      role: payload.role,
      status_code: payload.status_code,
      error_code: payload.error_code,
      user_id: payload.user_id ?? null,
      metadata: payload.metadata ?? null,
      created_by: "signup-by-phone",
    });
  } catch {
    // best effort telemetry
  }
}

function responseHeaders() {
  return {
    ...corsHeaders,
    "Content-Type": "application/json",
  };
}

function errorResponse(
  requestId: string,
  status: number,
  errorCode: SignupErrorCode,
  message: string,
) {
  return makeResponseWithRequestId(
    jsonText({
      ok: false,
      error_code: errorCode,
      message,
      request_id: requestId,
    }),
    requestId,
    { status, headers: responseHeaders() },
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(jsonText({ error: "Method not allowed" }), {
      status: 405,
      headers: responseHeaders(),
    });
  }

  const requestId = getRequestIdFromHeaders(req.headers);
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const ipAddress = pickClientIp(req);
  const prefix = ipPrefix(ipAddress);

  let phoneHash = await sha256Hex("unknown");

  try {
    const body = (await req.json()) as SignupRequest;
    const role = body.role;
    const fullName = sanitizeText(body.full_name, 100);
    const normalizedPhone = normalizePhone(body.phone ?? "");
    const authEmail = parseEmail(body.email) ?? getAuthEmailFromPhone(normalizedPhone);
    const password = String(body.password ?? "");
    const metadata = body.profile_metadata ?? {};

    phoneHash = await sha256Hex(normalizedPhone || "invalid");

    if (!role || !ROLE_SET.has(role)) {
      await recordSignupAttempt(admin, {
        request_id: requestId,
        normalized_phone_hash: phoneHash,
        ip_prefix: prefix,
        role: null,
        status_code: 400,
        error_code: "VALIDATION_ERROR",
        metadata: { reason: "invalid_role" },
      });
      return errorResponse(
        requestId,
        400,
        "VALIDATION_ERROR",
        "Invalid role",
      );
    }

    if (!fullName || fullName.length < 2) {
      await recordSignupAttempt(admin, {
        request_id: requestId,
        normalized_phone_hash: phoneHash,
        ip_prefix: prefix,
        role,
        status_code: 400,
        error_code: "VALIDATION_ERROR",
        metadata: { reason: "invalid_name" },
      });
      return errorResponse(
        requestId,
        400,
        "VALIDATION_ERROR",
        "Full name is required",
      );
    }

    if (!normalizedPhone || normalizedPhone.length < 12) {
      await recordSignupAttempt(admin, {
        request_id: requestId,
        normalized_phone_hash: phoneHash,
        ip_prefix: prefix,
        role,
        status_code: 400,
        error_code: "VALIDATION_ERROR",
        metadata: { reason: "invalid_phone" },
      });
      return errorResponse(
        requestId,
        400,
        "VALIDATION_ERROR",
        "Invalid phone number",
      );
    }

    if (password.length < 8) {
      await recordSignupAttempt(admin, {
        request_id: requestId,
        normalized_phone_hash: phoneHash,
        ip_prefix: prefix,
        role,
        status_code: 400,
        error_code: "VALIDATION_ERROR",
        metadata: { reason: "weak_password" },
      });
      return errorResponse(
        requestId,
        400,
        "VALIDATION_ERROR",
        "Password must be at least 8 characters",
      );
    }

    if (!parseEmail(authEmail)) {
      await recordSignupAttempt(admin, {
        request_id: requestId,
        normalized_phone_hash: phoneHash,
        ip_prefix: prefix,
        role,
        status_code: 400,
        error_code: "VALIDATION_ERROR",
        metadata: { reason: "invalid_email" },
      });
      return errorResponse(
        requestId,
        400,
        "VALIDATION_ERROR",
        "Invalid email",
      );
    }

    const guard = await evaluateSignupGuard(admin, {
      role,
      normalizedPhone,
      requestId,
      ipAddress,
      ipPrefix: prefix,
    });
    if (!guard.allowed) {
      const code = guard.error_code ?? "SIGNUP_DISABLED";
      const status = code === "RATE_LIMITED" ? 429 : 403;
      await recordSignupAttempt(admin, {
        request_id: requestId,
        normalized_phone_hash: phoneHash,
        ip_prefix: prefix,
        role,
        status_code: status,
        error_code: code,
        metadata: { reason: guard.reason ?? "guard_deny" },
      });
      return errorResponse(
        requestId,
        status,
        code,
        guard.reason ?? "Signup is not available",
      );
    }

    const existingPhone = await admin
      .from("profiles")
      .select("id", { count: "exact" })
      .eq("phone", normalizedPhone)
      .limit(1);
    if ((existingPhone.count ?? 0) > 0 || (await listAuthUserByPhone(admin, normalizedPhone))) {
      await recordSignupAttempt(admin, {
        request_id: requestId,
        normalized_phone_hash: phoneHash,
        ip_prefix: prefix,
        role,
        status_code: 409,
        error_code: "PHONE_ALREADY_EXISTS",
      });
      return errorResponse(
        requestId,
        409,
        "PHONE_ALREADY_EXISTS",
        "Phone already exists",
      );
    }

    const existingEmail = await admin
      .from("profiles")
      .select("id", { count: "exact" })
      .eq("auth_email", authEmail)
      .limit(1);
    if ((existingEmail.count ?? 0) > 0 || (await listAuthUserByEmail(admin, authEmail))) {
      await recordSignupAttempt(admin, {
        request_id: requestId,
        normalized_phone_hash: phoneHash,
        ip_prefix: prefix,
        role,
        status_code: 409,
        error_code: "EMAIL_ALREADY_EXISTS",
      });
      return errorResponse(
        requestId,
        409,
        "EMAIL_ALREADY_EXISTS",
        "Email already exists",
      );
    }

    const nowIso = new Date().toISOString();
    const created = await admin.auth.admin.createUser({
      email: authEmail,
      password,
      phone: normalizedPhone,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone: normalizedPhone,
        role,
        auth_email: authEmail,
        created_by: "signup-by-phone",
        created_at: nowIso,
        profile_metadata: metadata,
      },
    });

    if (created.error || !created.data.user) {
      const message = created.error?.message ?? "Failed to create user";
      const lowered = message.toLowerCase();
      const code: SignupErrorCode = lowered.includes("phone")
        ? "PHONE_ALREADY_EXISTS"
        : lowered.includes("email")
        ? "EMAIL_ALREADY_EXISTS"
        : "INTERNAL";
      const status = code === "INTERNAL" ? 500 : 409;
      await recordSignupAttempt(admin, {
        request_id: requestId,
        normalized_phone_hash: phoneHash,
        ip_prefix: prefix,
        role,
        status_code: status,
        error_code: code,
        metadata: { create_error: message },
      });
      return errorResponse(requestId, status, code, message);
    }

    const userId = created.data.user.id;
    const district = sanitizeText(metadata.district, 80);
    const village = sanitizeText(metadata.village, 80);
    const preferredLanguage = sanitizeText(metadata.preferred_language, 16);

    await admin.from("profiles").upsert(
      {
        id: userId,
        full_name: fullName,
        phone: normalizedPhone,
        auth_email: authEmail,
        district,
        village,
        preferred_language: preferredLanguage ?? "en",
        updated_at: nowIso,
      },
      { onConflict: "id" },
    );

    await admin.from("user_roles").upsert(
      {
        user_id: userId,
        role,
        created_at: nowIso,
      },
      { onConflict: "user_id" },
    );

    try {
      await admin.from("user_profiles").upsert(
        {
          user_id: userId,
          profile_type: role,
          display_name: fullName,
          phone: normalizedPhone,
          is_active: true,
        },
        { onConflict: "user_id,profile_type" },
      );
    } catch {
      // optional table on some environments
    }

    if (role === "buyer") {
      await admin.from("buyers").upsert(
        {
          user_id: userId,
          name: fullName,
          phone: normalizedPhone,
          district,
          preferred_crops: ["onion", "tomato"],
          updated_at: nowIso,
        },
        { onConflict: "user_id" },
      );
    }

    if (role === "logistics") {
      await admin.from("transporters").upsert(
        {
          user_id: userId,
          name: fullName,
          phone: normalizedPhone,
          operating_district: district,
          operating_village: village,
          updated_at: nowIso,
        },
        { onConflict: "user_id" },
      );
    }

    if (role === "admin") {
      await admin.from("admin_users").upsert(
        {
          user_id: userId,
          name: fullName,
          phone: normalizedPhone,
          role: "super_admin",
          assigned_district: district,
          updated_at: nowIso,
        },
        { onConflict: "user_id" },
      );
    }

    const tokenRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
      },
      body: jsonText({
        email: authEmail,
        password,
      }),
    });
    const tokenBody = await tokenRes.json().catch(() => null);
    if (!tokenRes.ok || !tokenBody?.access_token || !tokenBody?.refresh_token) {
      await recordSignupAttempt(admin, {
        request_id: requestId,
        normalized_phone_hash: phoneHash,
        ip_prefix: prefix,
        role,
        status_code: 500,
        error_code: "INTERNAL",
        user_id: userId,
        metadata: { token_error: tokenBody },
      });
      return errorResponse(
        requestId,
        500,
        "INTERNAL",
        "User created but session initialization failed",
      );
    }

    await recordSignupAttempt(admin, {
      request_id: requestId,
      normalized_phone_hash: phoneHash,
      ip_prefix: prefix,
      role,
      status_code: 201,
      error_code: null,
      user_id: userId,
      metadata: { dashboard_route: ROLE_DASHBOARD[role] },
    });

    logStructured({
      request_id: requestId,
      endpoint: "signup-by-phone",
      status: "success",
      role,
      user_id: userId,
      ip_prefix: prefix,
    });

    return makeResponseWithRequestId(
      jsonText({
        ok: true,
        user_id: userId,
        role,
        phone: normalizedPhone,
        auth_email: authEmail,
        dashboard_route: ROLE_DASHBOARD[role],
        access_token: tokenBody.access_token,
        refresh_token: tokenBody.refresh_token,
        expires_in: tokenBody.expires_in,
        request_id: requestId,
      }),
      requestId,
      { status: 201, headers: responseHeaders() },
    );
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    await recordSignupAttempt(admin, {
      request_id: requestId,
      normalized_phone_hash: phoneHash,
      ip_prefix: prefix,
      role: null,
      status_code: 500,
      error_code: "INTERNAL",
      metadata: { uncaught: err },
    });
    logStructured({
      request_id: requestId,
      endpoint: "signup-by-phone",
      status: "error",
      error: err,
    });
    return errorResponse(requestId, 500, "INTERNAL", "Internal error");
  }
});
