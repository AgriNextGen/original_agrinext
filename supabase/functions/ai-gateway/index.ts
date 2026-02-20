import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { errorResponse } from "../_shared/errors.ts";
import { getRequiredEnv } from "../_shared/env.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Basic auth guard: Supabase can enforce verify_jwt, but double-check presence
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) {
    return errorResponse("unauthorized", "missing or invalid Authorization header", 401);
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, ""); // trim trailing slash

  try {
    if (path.endsWith("/gemini/chat")) {
      // ensure secret exists
      getRequiredEnv("gemini_api_key");
      // TODO: proxy request to Gemini API here. For now return a safe mocked response.
      const body = await req.json().catch(() => ({}));
      return new Response(JSON.stringify({ ok: true, route: "gemini/chat", received: body }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path.endsWith("/firecrawl/fetch")) {
      getRequiredEnv("firecrawl_api_key");
      const body = await req.json().catch(() => ({}));
      return new Response(JSON.stringify({ ok: true, route: "firecrawl/fetch", received: body }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path.endsWith("/elevenlabs/tts")) {
      getRequiredEnv("elevenlabs_api_key");
      const body = await req.json().catch(() => ({}));
      return new Response(JSON.stringify({ ok: true, route: "elevenlabs/tts", received: body }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return errorResponse("not_found", `Unknown route: ${path}`, 404);
  } catch (err) {
    if (err && typeof (err as any).code === "string" && (err as any).code === "missing_secret") {
      return errorResponse("missing_secret", `Required secret ${(err as any).secret} is not set`, 500);
    }
    return errorResponse("internal_error", String(err?.message ?? err), 500);
  }
});

