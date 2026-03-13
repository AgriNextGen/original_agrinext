/**
 * Standardised error response helpers for Edge Functions.
 *
 * Usage:
 *   return errorResponse("invalid_input", "Phone number is required", 400);
 *   return errorResponse("unauthorized", "Invalid token", 401);
 *   return errorResponse("not_found", "Trip not found", 404);
 *
 * Response shape: { error: { code, message, request_id } }
 * Always returns CORS headers.
 */
import { corsHeaders } from "./cors.ts";

/** Returns a JSON error Response with CORS headers. Never leaks internal stack traces. */
export function errorResponse(code: string, message: string, status = 400) {
  return new Response(
    JSON.stringify({ error: { code, message, request_id: crypto.randomUUID() } }),
    { status, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

export function notImplementedResponse(fnName: string) {
  return errorResponse("not_implemented", `Function ${fnName} is not implemented`, 501);
}

