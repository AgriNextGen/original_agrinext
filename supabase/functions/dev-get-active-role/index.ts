/**
 * @function dev-get-active-role
 * @description DEV ONLY. Query the currently active role (real or acting via dev session).
 *   Returns isDevOverride=true when a dev_acting_sessions record is active for this user.
 *
 * @auth verify_jwt = true + x-dev-secret header
 * @env DEV_TOOLS_ENABLED must be "true"
 *
 * @request GET /functions/v1/dev-get-active-role
 *   Headers: Authorization: Bearer <jwt>, x-dev-secret: <DEV_TOOLS_SECRET>
 *
 * @response
 *   200: { success: true, data: { role: string, isDevOverride: boolean } }
 *   401/403: { error: { code: "unauthorized"|"dev_tools_disabled" } }
 *
 * @never Call this from any production UI path.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DEV_TOOLS_ENABLED = Deno.env.get("DEV_TOOLS_ENABLED") || "false";
const DEV_TOOLS_SECRET = Deno.env.get("DEV_TOOLS_SECRET") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") return null;
  return token.trim();
}

async function resolveUserId(token: string): Promise<string | null> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
    },
  });

  if (!response.ok) return null;

  const body = await response.json().catch(() => null);
  return typeof body?.id === "string" ? body.id : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return jsonResponse(405, { success: false, errorCode: "METHOD_NOT_ALLOWED", message: "Method not allowed" });
  }

  if (DEV_TOOLS_ENABLED !== "true") {
    return jsonResponse(404, { success: false, errorCode: "NOT_FOUND", message: "Not found" });
  }

  const maybeSecret = req.headers.get("x-dev-secret") || "";
  if (DEV_TOOLS_SECRET && DEV_TOOLS_SECRET !== "" && maybeSecret !== DEV_TOOLS_SECRET) {
    return jsonResponse(403, { success: false, errorCode: "FORBIDDEN", message: "Forbidden" });
  }

  const token = extractBearerToken(req);
  if (!token) {
    return jsonResponse(401, { success: false, errorCode: "UNAUTHORIZED", message: "Missing authorization" });
  }

  const userId = await resolveUserId(token);
  if (!userId) {
    return jsonResponse(401, { success: false, errorCode: "UNAUTHORIZED", message: "Invalid token" });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    const { data: roleData, error: roleErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (roleErr) {
      return jsonResponse(500, { success: false, errorCode: "ROLE_CHECK_FAILED", message: "role_check_failed" });
    }

    const realRole = roleData?.role ?? null;
    const isAdmin = realRole === "admin";

    const { data: allowRow, error: allowErr } = await supabase
      .from("dev_allowlist")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (allowErr) {
      return jsonResponse(500, { success: false, errorCode: "ALLOWLIST_CHECK_FAILED", message: "allowlist_check_failed" });
    }

    if (!isAdmin && !allowRow) {
      return jsonResponse(403, { success: false, errorCode: "FORBIDDEN", message: "Forbidden" });
    }

    const nowIso = new Date().toISOString();
    const { data: sessionRow, error: sessionErr } = await supabase
      .from("dev_acting_sessions")
      .select("acting_as_role, revoked_at, expires_at, created_at")
      .eq("developer_user_id", userId)
      .is("revoked_at", null)
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionErr) {
      return jsonResponse(500, { success: false, errorCode: "SESSION_LOOKUP_FAILED", message: "session_lookup_failed" });
    }

    const activeRole = sessionRow?.acting_as_role ?? realRole;
    const isDevOverride = !!sessionRow && sessionRow.acting_as_role !== realRole;

    return jsonResponse(200, {
      success: true,
      data: {
        role: activeRole,
        isDevOverride,
      },
    });
  } catch (error) {
    console.error("dev-get-active-role error:", error);
    return jsonResponse(500, {
      success: false,
      errorCode: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "server_error",
    });
  }
});
