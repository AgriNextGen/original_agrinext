// Template: supabase/functions/templates/with-request-id/index.ts
// Usage: copy this wrapper into an Edge Function and call `withRequestId(handler)`
import { serve } from 'std/server';

export function withRequestId(handler: (req: Request, ctx: { request_id: string }) => Promise<Response>) {
  return serve(async (req) => {
    // Prefer DB-generated request id for global traceability by calling public.new_request_id_v1 via REST RPC.
    // For a lightweight local id use crypto.randomUUID().
    const request_id = crypto.randomUUID();

    try {
      const res = await handler(req, { request_id });
      // Ensure JSON body is returned inside `data`
      let data = null;
      try { data = await res.json(); } catch { /* non-json response */ }
      const body = { success: res.ok, request_id, data: data ?? null };
      return new Response(JSON.stringify(body), { status: res.status, headers: { 'content-type': 'application/json' }});
    } catch (err) {
      // On error return standard envelope and include request_id
      const body = { success: false, request_id, error: String(err) };
      return new Response(JSON.stringify(body), { status: 500, headers: { 'content-type': 'application/json' }});
    }
  });
}

