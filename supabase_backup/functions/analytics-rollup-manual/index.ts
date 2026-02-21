// supabase/functions/analytics-rollup-manual/index.ts
import { serve } from 'std/server';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

serve(async (req) => {
  // This function requires a logged-in admin user; verify JWT via Supabase
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return new Response(JSON.stringify({ error: 'unauthenticated' }), { status: 401 });

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData) return new Response(JSON.stringify({ error: 'unauthenticated' }), { status: 401 });

  // NOTE: Adjust admin check depending on your DB function; here we attempt to call a lightweight RPC 'is_admin' if present.
  // If your project exposes an auth.is_admin RPC, adjust the call name accordingly.
  // We'll rely on server-side RLS and service_role for the actual rollup call below.

  const body = await req.json().catch(() => ({}));
  const p_start = body.p_start || body.day || null;
  const p_end = body.p_end || p_start;

  if (!p_start) return new Response(JSON.stringify({ error: 'missing day/start' }), { status: 400 });

  // Call RPC using service role key stored in env
  const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE')!;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/analytics.rollup_range_v1`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE || '',
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE || ''}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ p_start, p_end })
  });

  if (!res.ok) return new Response(JSON.stringify({ ok: false, status: res.status, text: await res.text() }), { status: 500 });

  return new Response(JSON.stringify({ ok: true, p_start, p_end }));
});

