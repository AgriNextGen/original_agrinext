import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";

const KEYS_TO_CHECK = [
  "gemini_api_key",
  "perplexity_api_key",
  "firecrawl_api_key",
  "elevenlabs_api_key",
  "google_maps_api_key",
] as const;

Deno.serve((_req: Request) => {
  if (_req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const env: Record<string, boolean> = {};
  for (const key of KEYS_TO_CHECK) {
    const val = Deno.env.get(key);
    env[key] = typeof val === "string" && val.length > 0;
  }

  return new Response(JSON.stringify({ ok: true, env }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
