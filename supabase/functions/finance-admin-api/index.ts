import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WORKER_SECRET = Deno.env.get("WORKER_SECRET")!;

const corsHeaders = {
  "Access-Control-Allow-Headers": "content-type, x-worker-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const secret = req.headers.get("x-worker-secret") || "";
  if (secret !== WORKER_SECRET) return new Response(JSON.stringify({ ok: false, error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action;
    switch (action) {
      case "approve_refund":
        await supabase.rpc("admin.approve_refund_v1", { p_refund_id: body.refund_id, p_note: body.note || null });
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      case "reject_refund":
        await supabase.rpc("admin.reject_refund_v1", { p_refund_id: body.refund_id, p_reason: body.reason || null });
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      case "queue_payout":
        {
          const res = await supabase.rpc("admin.queue_payout_v1", { p_order_id: body.order_id, p_note: body.note || null });
          if (res.error) return new Response(JSON.stringify({ ok: false, error: res.error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          return new Response(JSON.stringify({ ok: true, payout_id: res.data }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      case "mark_payout_initiated":
        await supabase.rpc("admin.mark_payout_initiated_v1", { p_payout_job_id: body.payout_job_id, p_reference_id: body.reference_id || null });
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      case "mark_payout_success":
        await supabase.rpc("admin.mark_payout_success_v1", { p_payout_job_id: body.payout_job_id, p_reference_id: body.reference_id || null });
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      case "mark_payout_failed":
        await supabase.rpc("admin.mark_payout_failed_v1", { p_payout_job_id: body.payout_job_id, p_error: body.error || null });
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      case "create_ops_item":
        {
          const r = await supabase.rpc("admin.create_ops_item_v1", { p_item_type: body.item_type, p_entity_type: body.entity_type, p_entity_id: body.entity_id, p_severity: body.severity || 'medium', p_summary: body.summary || null, p_metadata: body.metadata || {} });
          if (r.error) return new Response(JSON.stringify({ ok: false, error: r.error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          return new Response(JSON.stringify({ ok: true, id: r.data }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      default:
        return new Response(JSON.stringify({ ok: false, error: "unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (err) {
    console.error("finance-admin-api error", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
