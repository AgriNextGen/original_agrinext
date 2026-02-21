import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getRequiredEnv } from "../_shared/env.ts";
import { getRequestIdFromHeaders, makeResponseWithRequestId, logStructured } from "../_shared/request_context.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RAZORPAY_WEBHOOK_SECRET = getRequiredEnv("RAZORPAY_WEBHOOK_SECRET");
const WORKER_SECRET = Deno.env.get("WORKER_SECRET") || "";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, x-worker-secret" };

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
    if (hex === signature) return true;
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
    const reqId = getRequestIdFromHeaders(req.headers);
    const body = await req.text();
    const json = JSON.parse(body || '{}');

    const signature = req.headers.get('x-razorpay-signature') || req.headers.get('X-Razorpay-Signature') || '';
    const verified = await verifyRazorpaySignature(body, signature, RAZORPAY_WEBHOOK_SECRET);
    if (!verified) return makeResponseWithRequestId(JSON.stringify({ error: 'Invalid signature' }), reqId, { status: 403, headers: { ...corsHeaders, "Content-Type":"application/json" } });

    const eventId = json?.id ?? json?.entity_id ?? (new Date().toISOString());
    const eventType = json?.event ?? json?.event_type ?? 'payment_webhook';
    const payload = json;
    const p_order_id = (json?.payload?.payment?.entity?.order_id) ?? (json?.payload?.order?.entity?.id) ?? null;
    const p_payment_id = (json?.payload?.payment?.entity?.id) ?? null;
    const p_amount = (json?.payload?.payment?.entity?.amount) ? (json.payload.payment.entity.amount / 100.0) : null;
    const p_status = (json?.payload?.payment?.entity?.status) ?? (json?.payload?.order?.entity?.status) ?? null;

    // insert webhook event record idempotently
    const insertRes = await supabase.from("secure.webhook_events").insert([{
      provider: 'razorpay',
      event_id: eventId,
      event_type: eventType,
      payload: payload,
      received_at: new Date().toISOString()
    }], { upsert: false }).select("id").maybeSingle();

    // call RPC using service role key; set app.webhook context by calling with service role (secure.apply_gateway_state_v1 checks app.webhook or admin)
    const rpc = await supabase.rpc('secure.apply_gateway_state_v1', {
      p_provider: 'razorpay',
      p_event_id: eventId,
      p_event_type: eventType,
      p_payment_order_id: p_order_id,
      p_payment_id: p_payment_id,
      p_order_id: p_order_id,
      p_status: p_status,
      p_amount: p_amount,
      p_payload: payload
    });

    if (rpc.error) {
      console.error('rpc webhook error', rpc.error);
      // update webhook_events to failed and schedule retry
      try {
        const up = await supabase.from("secure.webhook_events").update({
          processing_status: 'failed',
          last_error: rpc.error.message,
          attempts: (insertRes?.data?.attempts || 0) + 1,
          next_retry_at: new Date(Date.now() + 60 * 1000).toISOString()
        }).eq("provider", "razorpay").eq("event_id", eventId);

        // enqueue retry job
        await supabase.rpc("public.enqueue_job_v1", { p_job_type: "webhook_retry_failed_v1", p_payload: JSON.stringify({ event_id: eventId }), p_run_at: new Date().toISOString(), p_idempotency_key: eventId });
      } catch (uerr) {
        console.error('failed to mark webhook event failed', uerr);
      }
      // return 200 to provider to avoid infinite retries from provider
      return new Response(JSON.stringify({ ok: false, error: rpc.error.message }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // success
    try {
      await supabase.from("secure.webhook_events").update({ processing_status: 'processed', processed_at: new Date().toISOString(), attempts: 0, last_error: null, next_retry_at: null }).eq("provider", "razorpay").eq("event_id", eventId);
      // If webhook indicates a payment failure, record security event for downstream jobs
      try {
        const st = (p_status || '').toString().toLowerCase();
        if (st === 'failed' || st === 'failed_to_capture' || st === 'error') {
          await supabase.rpc("audit.log_security_event_v1", {
            p_request_id: reqId,
            p_event_type: 'payment_failure',
            p_severity: 'high',
            p_actor_user_id: null,
            p_rl_key: p_payment_id || p_order_id,
            p_ip_address: null,
            p_device_id: null,
            p_user_agent: null,
            p_risk_score_snapshot: null,
            p_blocked_until: null,
            p_metadata: { provider: 'razorpay', order_ref: p_order_id, payment_ref: p_payment_id, status: p_status }
          }).catch(()=>{});
          logStructured({ request_id: reqId, endpoint: "payment-webhook", event: eventType, status: "payment_failure", order: p_order_id, payment: p_payment_id });
        }
      } catch(e){ console.error('log security event failed', e); }
    } catch (e) { console.error('mark processed err', e); }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error('payment-webhook error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'internal' }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

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
    const reqId = getRequestIdFromHeaders(req.headers);
    const body = await req.text();
    const json = JSON.parse(body || '{}');

    const signature = req.headers.get('x-razorpay-signature') || req.headers.get('X-Razorpay-Signature') || '';
    const verified = await verifyRazorpaySignature(body, signature, RAZORPAY_WEBHOOK_SECRET);
    if (!verified) return makeResponseWithRequestId(JSON.stringify({ error: 'Invalid signature' }), reqId, { status: 403, headers: { ...corsHeaders, "Content-Type":"application/json" } });

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
      logStructured({ request_id: reqId, endpoint: "payment-webhook", status: "rpc_error", error: rpc.error });
      // Still respond 200 so provider doesn't retry infinitely; log in audit for investigation
      return makeResponseWithRequestId(JSON.stringify({ ok: false, error: rpc.error.message }), reqId, { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    logStructured({ request_id: reqId, endpoint: "payment-webhook", status: "processed", event: eventType, order: p_order_id, payment: p_payment_id });
    return makeResponseWithRequestId(JSON.stringify({ success: true }), reqId, { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const reqId = getRequestIdFromHeaders(req.headers);
    console.error('payment-webhook error:', err);
    logStructured({ request_id: reqId, endpoint: "payment-webhook", status: "error", error: err instanceof Error ? err.message : String(err) });
    return makeResponseWithRequestId(JSON.stringify({ error: err instanceof Error ? err.message : 'internal' }), reqId, { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

