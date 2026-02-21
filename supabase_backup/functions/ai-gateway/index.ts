import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { errorResponse } from "../_shared/errors.ts";
import { getRequiredEnv } from "../_shared/env.ts";

// Configurable limits
const DEFAULT_LIMIT = 120; // requests per window
const DEFAULT_WINDOW = 60; // seconds

function base64UrlDecode(str: string) {
  // replace - and _ then pad
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  try {
    return atob(str);
  } catch {
    return null;
  }
}

function parseJwt(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1];
    const decoded = base64UrlDecode(payload);
    if (!decoded) return null;
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

async function checkRateLimit(userId: string) {
  // Call the DB RPC `consume_rate_limit` using service role to avoid race conditions
  const SUPABASE_URL = getRequiredEnv("SUPABASE_URL");
  const SERVICE_KEY = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  const key = `ai_gateway:${userId}`;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/consume_rate_limit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ p_key: key, p_limit: DEFAULT_LIMIT, p_window_seconds: DEFAULT_WINDOW }),
  });
  if (!res.ok) {
    // If RPC not found or error, default to allowing to avoid accidental lockout
    return { allowed: false, error: `rate limit rpc call failed: ${res.status}` };
  }
  const body = await res.json();
  // RPC returns boolean
  return { allowed: body === true };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) {
    return errorResponse("unauthorized", "missing or invalid Authorization header", 401);
  }
  const token = auth.replace("Bearer ", "").trim();
  const claims = parseJwt(token);
  const userId = claims?.sub ?? null;

  if (!userId) {
    return errorResponse("unauthorized", "unable to parse JWT for user id", 401);
  }

  // enforce rate limit (best-effort). If RPC missing, return a rate-limit error to be safe.
  try {
    const rl = await checkRateLimit(userId);
    if (!rl.allowed) {
      return errorResponse("rate_limited", "rate limit exceeded", 429);
    }
  } catch (e) {
    return errorResponse("internal_error", "rate limit check failed", 500);
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, "");

  try {
    if (path.endsWith("/gemini/chat")) {
      const key = getRequiredEnv("gemini_api_key");
      const body = await req.json().catch(() => ({}));
      const providerUrl = Deno.env.get("GEMINI_API_URL") || null;
      if (!providerUrl) {
        // proxy not configured yet
        return errorResponse("not_implemented", "Gemini provider URL not configured", 501);
      }
      const pres = await fetch(providerUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const presBody = await pres.text();
      return new Response(presBody, { status: pres.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (path.endsWith("/firecrawl/fetch")) {
      const key = getRequiredEnv("firecrawl_api_key");
      const body = await req.json().catch(() => ({}));
      const providerUrl = Deno.env.get("FIRECRAWL_API_URL") || "https://api.firecrawl.dev/fetch";
      const pres = await fetch(providerUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const presBody = await pres.text();
      return new Response(presBody, { status: pres.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (path.endsWith("/elevenlabs/tts")) {
      const key = getRequiredEnv("elevenlabs_api_key");
      const body = await req.json().catch(() => ({}));
      const providerUrl = Deno.env.get("ELEVENLABS_API_URL") || "https://api.elevenlabs.io/v1/text-to-speech/default";
      const pres = await fetch(providerUrl, {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const presBody = await pres.text();
      return new Response(presBody, { status: pres.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return errorResponse("not_found", `Unknown route: ${path}`, 404);
  } catch (err) {
    if (err && typeof (err as any).code === "string" && (err as any).code === "missing_secret") {
      return errorResponse("missing_secret", `Required secret ${(err as any).secret} is not set`, 500);
    }
    return errorResponse("internal_error", String(err?.message ?? err), 500);
  }
});

