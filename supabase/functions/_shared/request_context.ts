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

