import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getRequiredEnv } from "../_shared/env.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_KEY")!;
const RAZORPAY_KEY_ID = getRequiredEnv("RAZORPAY_KEY_ID");
const RAZORPAY_KEY_SECRET = getRequiredEnv("RAZORPAY_KEY_SECRET");

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const { order_id, provider } = body;
    if (!order_id) return new Response(JSON.stringify({ error: "order_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // 1) Call RPC to validate & compute financials and mark initiated
    const rpcRes = await supabase.rpc("payment_initiate_v1", { p_order_id: order_id, p_provider: provider || 'razorpay' });
    if (rpcRes.error) return new Response(JSON.stringify({ error: rpcRes.error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

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
      return new Response(JSON.stringify({ error: "provider_error", details: txt }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const rzJson = await rzResp.json();
    const providerOrderId = rzJson.id;

    // 3) Attach provider order id back to DB (buyer-owned RPC)
    const attach = await supabase.rpc("payment_attach_provider_order_v1", { p_order_id: order_id, p_payment_order_id: providerOrderId, p_provider: provider || 'razorpay' });
    if (attach.error) {
      console.error("attach provider order failed:", attach.error);
      return new Response(JSON.stringify({ error: attach.error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      key_id: RAZORPAY_KEY_ID,
      payment_order_id: providerOrderId,
      amount: amountPaise,
      currency,
      order_id
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("create-payment-order error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal' }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

