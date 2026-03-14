/**
 * @function dev-switch-role
 * @description DEV ONLY. Switch the acting role for a developer session without creating new accounts.
 *   Creates or updates a dev_acting_sessions record with 8-hour expiry.
 *   The frontend reads this session via dev-get-active-role to present the correct role UI.
 *
 * @auth verify_jwt = true + x-dev-secret header (matches DEV_TOOLS_SECRET env var)
 * @env DEV_TOOLS_ENABLED must be "true" — disabled in production
 *
 * @request POST /functions/v1/dev-switch-role
 *   Headers: Authorization: Bearer <jwt>, x-dev-secret: <DEV_TOOLS_SECRET>
 *   Body: { targetRole: "farmer" | "agent" | "logistics" | "buyer" | "admin" }
 *
 * @response
 *   200: { success: true, data: { activeRole: string, switchedAt: string } }
 *   400: { error: { code: "invalid_role" } }
 *   401: { error: { code: "unauthorized" } }
 *   403: { error: { code: "dev_tools_disabled"|"invalid_dev_secret" } }
 *
 * @guards DEV_TOOLS_ENABLED check, x-dev-secret header, JWT, admin OR dev_allowlist membership
 * @sideeffects Writes to dev_acting_sessions table. Session expires in 8 hours.
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

const VALID_ROLES = new Set(["farmer", "agent", "logistics", "buyer", "admin"]);

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

  if (req.method !== "POST") {
    return jsonResponse(405, { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed" } });
  }

  if (DEV_TOOLS_ENABLED !== "true") {
    return jsonResponse(404, { success: false, error: { code: "NOT_FOUND", message: "Not found" } });
  }

  const maybeSecret = req.headers.get("x-dev-secret") || "";
  if (DEV_TOOLS_SECRET && DEV_TOOLS_SECRET !== "" && maybeSecret !== DEV_TOOLS_SECRET) {
    return jsonResponse(403, { success: false, error: { code: "FORBIDDEN", message: "Forbidden" } });
  }

  const token = extractBearerToken(req);
  if (!token) {
    return jsonResponse(401, { success: false, error: { code: "UNAUTHORIZED", message: "Missing authorization" } });
  }

  const userId = await resolveUserId(token);
  if (!userId) {
    return jsonResponse(401, { success: false, error: { code: "UNAUTHORIZED", message: "Invalid token" } });
  }

  const body = await req.json().catch(() => ({}));
  const targetRole = typeof body?.targetRole === "string" ? body.targetRole : "";
  if (!VALID_ROLES.has(targetRole)) {
    return jsonResponse(400, { success: false, error: { code: "INVALID_ROLE", message: "Invalid targetRole" } });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    const { data: roleData, error: roleErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (roleErr) {
      return jsonResponse(500, { success: false, error: { code: "ROLE_CHECK_FAILED", message: "role_check_failed" } });
    }

    const isAdmin = roleData?.role === "admin";

    const { data: allowRow, error: allowErr } = await supabase
      .from("dev_allowlist")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (allowErr) {
      return jsonResponse(500, { success: false, error: { code: "ALLOWLIST_CHECK_FAILED", message: "allowlist_check_failed" } });
    }

    if (!isAdmin && !allowRow) {
      return jsonResponse(403, { success: false, error: { code: "FORBIDDEN", message: "Forbidden" } });
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const expiresAt = new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString();

    const { data: existingSession, error: existingErr } = await supabase
      .from("dev_acting_sessions")
      .select("id")
      .eq("developer_user_id", userId)
      .is("revoked_at", null)
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingErr) {
      return jsonResponse(500, { success: false, error: { code: "SESSION_LOOKUP_FAILED", message: "session_lookup_failed" } });
    }

    if (existingSession?.id) {
      const { error: updateErr } = await supabase
        .from("dev_acting_sessions")
        .update({
          acting_as_user_id: userId,
          acting_as_role: targetRole,
          expires_at: expiresAt,
          revoked_at: null,
        })
        .eq("id", existingSession.id);

      if (updateErr) {
        return jsonResponse(500, { success: false, error: { code: "SESSION_UPDATE_FAILED", message: updateErr.message } });
      }
    } else {
      const { error: insertErr } = await supabase
        .from("dev_acting_sessions")
        .insert([{
          developer_user_id: userId,
          acting_as_user_id: userId,
          acting_as_role: targetRole,
          expires_at: expiresAt,
          revoked_at: null,
        }]);

      if (insertErr) {
        return jsonResponse(500, { success: false, error: { code: "SESSION_INSERT_FAILED", message: insertErr.message } });
      }
    }

    return jsonResponse(200, {
      success: true,
      data: {
        activeRole: targetRole,
        switchedAt: nowIso,
      },
    });
  } catch (error) {
    console.error("dev-switch-role error:", error);
    return jsonResponse(500, {
      success: false,
      error: { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "server_error" },
    });
  }
});
