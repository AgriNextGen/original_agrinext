/**
 * Standard CORS headers for all Edge Functions.
 * Import and spread into every Response:
 *   new Response(body, { headers: { "Content-Type": "application/json", ...corsHeaders } })
 * Also handle OPTIONS preflight: if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
 */
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

