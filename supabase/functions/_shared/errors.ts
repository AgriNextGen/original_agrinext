/**
 * Standardised response helpers for Edge Functions.
 *
 * Canonical response format (all Edge Functions MUST use this):
 *
 *   Success: { success: true, data: <payload> }
 *   Error:   { success: false, error: { code: "ERROR_CODE", message: "Human readable" } }
 *
 * Usage:
 *   return successResponse({ user_id: "abc" });
 *   return successResponse({ user_id: "abc" }, 201);
 *   return errorResponse("invalid_input", "Phone number is required", 400);
 *   return errorResponse("unauthorized", "Invalid token", 401);
 *   return errorResponse("not_found", "Trip not found", 404);
 */
import { corsHeaders } from "./cors.ts";

const jsonHeaders = { "Content-Type": "application/json", ...corsHeaders };

/** Returns a canonical success Response: { success: true, data } */
export function successResponse(data: unknown, status = 200) {
  return new Response(
    JSON.stringify({ success: true, data }),
    { status, headers: jsonHeaders }
  );
}

/** Returns a canonical error Response: { success: false, error: { code, message } } */
export function errorResponse(code: string, message: string, status = 400) {
  return new Response(
    JSON.stringify({ success: false, error: { code, message } }),
    { status, headers: jsonHeaders }
  );
}

export function notImplementedResponse(fnName: string) {
  return errorResponse("not_implemented", `Function ${fnName} is not implemented`, 501);
}

