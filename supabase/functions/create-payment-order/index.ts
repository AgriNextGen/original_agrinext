import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getRequiredEnv } from "../_shared/env.ts";
import { getRequestIdFromHeaders, makeResponseWithRequestId, logStructured } from "../_shared/request_context.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_KEY")!;
const RAZORPAY_KEY_ID = getRequiredEnv("RAZORPAY_KEY_ID");
const RAZORPAY_KEY_SECRET = getRequiredEnv("RAZORPAY_KEY_SECRET");

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const reqId = getRequestIdFromHeaders(req.headers);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Check profile status to block payments when restricted/locked
    const { data: profile } = await supabase.from("profiles").select("id, account_status, blocked_until").eq("id", user.id).maybeSingle();
    if (profile) {
      if (profile.account_status === 'locked') {
        return makeResponseWithRequestId(JSON.stringify({ error: "account_locked", message: "Account locked. Contact support." }), reqId, { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (profile.account_status === 'restricted') {
        return makeResponseWithRequestId(JSON.stringify({ error: "payments_blocked", message: "Payments temporarily blocked due to suspicious activity. Contact support." }), reqId, { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (profile.blocked_until && new Date(profile.blocked_until) > new Date()) {
        return makeResponseWithRequestId(JSON.stringify({ error: "temporarily_blocked", message: `Action blocked until ${profile.blocked_until}` }), reqId, { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const body = await req.json().catch(() => ({}));
    const { order_id, provider } = body;
    if (!order_id) return new Response(JSON.stringify({ error: "order_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // 1) Call RPC to validate & compute financials and mark initiated
    const rpcRes = await supabase.rpc("payment_initiate_v1", { p_order_id: order_id, p_provider: provider || 'razorpay' });
    if (rpcRes.error) return makeResponseWithRequestId(JSON.stringify({ error: rpcRes.error.message }), reqId, { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const payload = rpcRes.data as any;
    const amountPaise = payload?.amount_paise;
    const currency = payload?.currency || 'INR';

    // 2) Create Razorpay order
    const razorUrl = "https://api.razorpay.com/v1/orders";
    const basic = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    const rzBody = {
      amount: amountPaise,
      currency,
      receipt: order_id,
      payment_capture: 1,
      notes: { app: "agrinext", order_id }
    };

    const rzResp = await fetch(razorUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Basic ${basic}` },
      body: JSON.stringify(rzBody)
    });

    if (!rzResp.ok) {
      const txt = await rzResp.text();
      console.error("razorpay create order failed:", txt);
      logStructured({ request_id: reqId, endpoint: "create-payment-order", status: "provider_error", details: txt });
      return makeResponseWithRequestId(JSON.stringify({ error: "provider_error", details: txt }), reqId, { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const rzJson = await rzResp.json();
    const providerOrderId = rzJson.id;

    // 3) Attach provider order id back to DB (buyer-owned RPC)
    const attach = await supabase.rpc("payment_attach_provider_order_v1", { p_order_id: order_id, p_payment_order_id: providerOrderId, p_provider: provider || 'razorpay' });
    if (attach.error) {
      console.error("attach provider order failed:", attach.error);
      logStructured({ request_id: reqId, endpoint: "create-payment-order", status: "db_attach_failed", error: attach.error });
      return makeResponseWithRequestId(JSON.stringify({ error: attach.error.message }), reqId, { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    logStructured({ request_id: reqId, endpoint: "create-payment-order", status: "success", order_id, provider_order_id: providerOrderId });
    return makeResponseWithRequestId(JSON.stringify({
      key_id: RAZORPAY_KEY_ID,
      payment_order_id: providerOrderId,
      amount: amountPaise,
      currency,
      order_id
    }), reqId, { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    const reqId = getRequestIdFromHeaders(req.headers);
    console.error("create-payment-order error:", err);
    logStructured({ request_id: reqId, endpoint: "create-payment-order", status: "error", error: err instanceof Error ? err.message : String(err) });
    return makeResponseWithRequestId(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal' }), reqId, { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
