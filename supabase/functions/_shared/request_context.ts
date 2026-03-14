/**
 * Request context utilities for Edge Functions.
 *
 * - getRequestIdFromHeaders: extract or generate a correlation request ID
 * - makeResponseWithRequestId: attach x-request-id to response for tracing
 * - logStructured: structured JSON logging (always includes timestamp)
 * - getActorFromSupabase: resolve authenticated user from a Supabase client
 *
 * Usage pattern in an Edge Function:
 *   const reqId = getRequestIdFromHeaders(req.headers);
 *   const actor = await getActorFromSupabase(supabaseClient);
 *   logStructured({ event: "accept_load", user_id: actor?.id, trip_id });
 *   return makeResponseWithRequestId(JSON.stringify({ success: true }), reqId, { status: 200 });
 */
export function getRequestIdFromHeaders(headers: Headers): string {
  const incoming = headers.get("x-request-id");
  return incoming || crypto.randomUUID();
}

export function makeResponseWithRequestId(body: BodyInit | null, reqId: string, init?: ResponseInit) {
  const headers = new Headers(init?.headers || {});
  headers.set("x-request-id", reqId);
  return new Response(body, { ...init, headers });
}

export function logStructured(obj: Record<string, any>) {
  try {
    const out = JSON.stringify({ ts: new Date().toISOString(), ...obj });
    console.log(out);
  } catch {
    console.log(String(obj));
  }
}

export async function getActorFromSupabase(supabaseClient: any) {
  try {
    const { data: user, error } = await supabaseClient.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

