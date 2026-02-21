// supabase/functions/analytics-rollup-daily/index.ts
import { serve } from 'std/server';

serve(async (req) => {
  const ANALYTICS_SECRET = Deno.env.get('ANALYTICS_CRON_SECRET');
  const authHeader = req.headers.get('authorization');
  const secretHeader = req.headers.get('x-analytics-secret');

  // Allow if bearer service_role token or secret header matches
  if (!authHeader && !secretHeader) {
    return new Response(JSON.stringify({ error: 'missing auth or secret' }), { status: 401 });
  }

  if (secretHeader && ANALYTICS_SECRET && secretHeader === ANALYTICS_SECRET) {
    // allowed via secret
  } else if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    // service_role bearer allowed (caller must provide service role)
    // no further validation here; caller should supply correct service role token
  } else {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 403 });
  }

  // compute yesterday in Asia/Kolkata
  const now = new Date();
  const istOffset = 5.5 * 60; // minutes
  const utc = new Date(now.toISOString());
  const ist = new Date(utc.getTime() + istOffset * 60 * 1000);
  const yesterday = new Date(ist.getTime() - 24 * 60 * 60 * 1000);
  const day = yesterday.toISOString().slice(0,10);

  // call DB RPC
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_KEY = (authHeader && authHeader.split(' ')[1]) || Deno.env.get('SUPABASE_SERVICE_ROLE');

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/analytics.rollup_daily_v1`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY || '',
      'Authorization': `Bearer ${SUPABASE_KEY || ''}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ p_day: day })
  });

  if (!res.ok) {
    const text = await res.text();
    return new Response(JSON.stringify({ ok: false, error: text }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true, day }));
});

