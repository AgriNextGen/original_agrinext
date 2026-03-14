/**
 * @function maps-service
 * @description Server-side proxy for Google Maps APIs (geocoding, directions, nearby search).
 *   Keeps GOOGLE_MAPS_API_KEY on the backend — never exposed to frontend.
 *   Rate-limited per user.
 *
 * @auth verify_jwt = true (JWT required)
 *
 * @routes
 *   GET  /geocode  — Geocode an address (cached)
 *   GET  /route    — Get driving directions between two points
 *   GET  /nearby   — Find nearby places by type
 *
 * @response
 *   200: { success: true, data: { ... } }
 *   400: { success: false, error: { code, message } }
 *   401: { success: false, error: { code: "unauthorized" } }
 *   429: { success: false, error: { code: "rate_limited" } }
 *   500: { success: false, error: { code: "maps_error"|"internal" } }
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { corsHeaders } from "../_shared/cors.ts";
import { successResponse, errorResponse } from "../_shared/errors.ts";
import { EnvError } from "../_shared/env.ts";
import { getRequestIdFromHeaders, logStructured } from "../_shared/request_context.ts";
import { geocodeAddress, getDirections, searchNearby } from "../_shared/maps_client.ts";

const SUPABASE_URL = (Deno.env.get("SUPABASE_URL") ?? "").trim();
const SUPABASE_ANON_KEY = (Deno.env.get("SUPABASE_ANON_KEY") ?? "").trim();
const SUPABASE_SERVICE_ROLE_KEY = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();

const MAPS_RATE_LIMIT = 60;
const MAPS_RATE_WINDOW_SECONDS = 3600;

type AuthUser = { id: string };

function extractBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") return null;
  return token.trim();
}

function parseJwtSub(token: string): string | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  let text = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  while (text.length % 4) text += "=";
  try {
    const body = JSON.parse(atob(text));
    return typeof body?.sub === "string" ? body.sub : null;
  } catch {
    return null;
  }
}

async function requireAuth(req: Request): Promise<AuthUser> {
  const token = extractBearerToken(req);
  if (!token) throw Object.assign(new Error("Unauthorized"), { status: 401, code: "unauthorized" });

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
    });
    if (res.ok) {
      const body = await res.json().catch(() => null);
      if (body?.id) return { id: String(body.id) };
    }
  }

  const sub = parseJwtSub(token);
  if (!sub) throw Object.assign(new Error("Unauthorized"), { status: 401, code: "unauthorized" });
  return { id: sub };
}

async function checkRateLimit(userId: string, reqId: string): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return true;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/consume_rate_limit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        p_key: `maps_service:${userId}`,
        p_limit: MAPS_RATE_LIMIT,
        p_window_seconds: MAPS_RATE_WINDOW_SECONDS,
      }),
    });
    if (!res.ok) return true;
    const body = await res.json().catch(() => true);
    return body === true;
  } catch {
    return true;
  }
}

function getSubroute(pathname: string): string {
  const marker = "/maps-service";
  const index = pathname.indexOf(marker);
  if (index < 0) return pathname;
  const sub = pathname.slice(index + marker.length);
  return sub ? (sub.startsWith("/") ? sub : `/${sub}`) : "/";
}

Deno.serve(async (req: Request) => {
  const reqId = getRequestIdFromHeaders(req.headers);
  const startedAt = Date.now();

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathname = url.pathname.replace(/\/+$/, "");
  const route = getSubroute(pathname);

  try {
    if (req.method !== "GET") {
      return errorResponse("method_not_allowed", "Only GET is supported", 405);
    }

    const user = await requireAuth(req);
    const allowed = await checkRateLimit(user.id, reqId);
    if (!allowed) {
      return errorResponse("rate_limited", "Maps rate limit exceeded. Try again later.", 429);
    }

    let data: unknown;

    if (route === "/geocode") {
      const address = url.searchParams.get("address") ?? "";
      if (!address.trim()) {
        return errorResponse("invalid_input", "address query parameter is required", 400);
      }
      data = await geocodeAddress(address, { requestId: reqId });

    } else if (route === "/route") {
      const origin = url.searchParams.get("origin") ?? "";
      const destination = url.searchParams.get("destination") ?? "";
      if (!origin.trim() || !destination.trim()) {
        return errorResponse("invalid_input", "origin and destination query parameters are required", 400);
      }
      data = await getDirections(origin, destination, { requestId: reqId });

    } else if (route === "/nearby") {
      const type = url.searchParams.get("type") ?? "";
      const lat = Number(url.searchParams.get("lat") ?? "");
      const lng = Number(url.searchParams.get("lng") ?? "");
      const radius = Number(url.searchParams.get("radius") ?? "5000");
      if (!type.trim() || !Number.isFinite(lat) || !Number.isFinite(lng)) {
        return errorResponse("invalid_input", "type, lat, and lng query parameters are required", 400);
      }
      data = await searchNearby({ type, lat, lng, radius, requestId: reqId });

    } else {
      return errorResponse("not_found", `Unknown route: ${route}`, 404);
    }

    logStructured({
      request_id: reqId,
      endpoint: "maps-service",
      route,
      user_id: user.id,
      latency_ms: Date.now() - startedAt,
    });

    return successResponse(data);
  } catch (error) {
    logStructured({
      request_id: reqId,
      endpoint: "maps-service",
      route,
      status: "error",
      latency_ms: Date.now() - startedAt,
      error: String((error as Error)?.message ?? error),
    });

    if (error instanceof EnvError) {
      return errorResponse("missing_secret", `Required secret ${error.secret} is not set`, 500);
    }
    const status = Number((error as { status?: number })?.status ?? 500);
    const code = String((error as { code?: string })?.code ?? "maps_error");
    const message = String((error as Error)?.message ?? "Unknown error");
    return errorResponse(code, message, Number.isFinite(status) ? status : 500);
  }
});
