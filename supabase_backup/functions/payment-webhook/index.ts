import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getRequiredEnv } from "../_shared/env.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_KEY")!;
const RAZORPAY_WEBHOOK_SECRET = getRequiredEnv("RAZORPAY_WEBHOOK_SECRET");

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type" };

function hexFromArrayBuffer(buf: ArrayBuffer) {
  const b = new Uint8Array(buf);
  return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('');
}

async function verifyRazorpaySignature(body: string, signature: string, secret: string): Promise<boolean> {
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body));
    const hex = hexFromArrayBuffer(sig);
    // Razorpay may send hex or base64; compare both
    if (hex === signature) return true;
    // base64 comparison
    let binary = '';
    const bytes = new Uint8Array(sig);
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    const b64 = btoa(binary);
    return b64 === signature;
  } catch (e) {
    console.error('verify signature error', e);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  try {
    const body = await req.text();
    const json = JSON.parse(body || '{}');

    const signature = req.headers.get('x-razorpay-signature') || req.headers.get('X-Razorpay-Signature') || '';
    const verified = await verifyRazorpaySignature(body, signature, RAZORPAY_WEBHOOK_SECRET);
    if (!verified) return new Response('Invalid signature', { status: 403 });

    const eventId = json?.id ?? json?.entity_id ?? (new Date().toISOString());
    const eventType = json?.event ?? json?.event_type ?? 'payment_webhook';
    const payload = json;
    const p_order_id = (json?.payload?.payment?.entity?.order_id) ?? (json?.payload?.order?.entity?.id) ?? null;
    const p_payment_id = (json?.payload?.payment?.entity?.id) ?? null;
    const p_amount = (json?.payload?.payment?.entity?.amount) ? (json.payload.payment.entity.amount / 100.0) : null;
    const p_status = (json?.payload?.payment?.entity?.status) ?? (json?.payload?.order?.entity?.status) ?? null;

    // If we can map to internal order by payment_order_id, do it; else allow null order and let RPC be best-effort
    let internalOrderId = null;
    if (p_order_id) {
      const { data: moData, error: moErr } = await supabase.from('market_orders').select('id').eq('payment_order_id', p_order_id).maybeSingle();
      if (moErr) console.error('lookup order error', moErr);
      internalOrderId = moData?.id ?? null;
    }

    // Call RPC using service role key
    const rpc = await supabase.rpc('payment_apply_webhook_event_v1', {
      p_provider: 'razorpay',
      p_event_id: eventId,
      p_event_type: eventType,
      p_payment_order_id: p_order_id,
      p_payment_id: p_payment_id,
      p_order_id: internalOrderId,
      p_status: p_status,
      p_amount: p_amount,
      p_payload: payload
    });

    if (rpc.error) {
      console.error('rpc webhook error', rpc.error);
      // Still respond 200 so provider doesn't retry infinitely; log in audit for investigation
      return new Response(JSON.stringify({ ok: false, error: rpc.error.message }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error('payment-webhook error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'internal' }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

