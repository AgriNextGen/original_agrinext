import { corsHeaders } from "./cors.ts";

export function errorResponse(code: string, message: string, status = 400) {
  return new Response(
    JSON.stringify({ error: { code, message, request_id: crypto.randomUUID() } }),
    { status, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

export function notImplementedResponse(fnName: string) {
  return errorResponse("not_implemented", `Function ${fnName} is not implemented`, 501);
}

