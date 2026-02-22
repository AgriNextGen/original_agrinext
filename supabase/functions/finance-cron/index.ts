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
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const secret = req.headers.get("x-worker-secret") || "";
  if (secret !== WORKER_SECRET) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  try {
    // enqueue reconciliation and retries
    await supabase.rpc("public.enqueue_job_v1", { p_job_type: "payments_reconcile_recent_v1", p_payload: JSON.stringify({ lookback_minutes: 1440 }), p_run_at: new Date().toISOString(), p_idempotency_key: `reconcile:${Date.now()}` });
    await supabase.rpc("public.enqueue_job_v1", { p_job_type: "webhook_retry_failed_v1", p_payload: JSON.stringify({ limit: 200 }), p_run_at: new Date().toISOString(), p_idempotency_key: `webhookretry:${Date.now()}` });
    await supabase.rpc("public.enqueue_job_v1", { p_job_type: "payouts_reminder_queue_v1", p_payload: JSON.stringify({ threshold_hours: 48 }), p_run_at: new Date().toISOString(), p_idempotency_key: `payoutsreminder:${Date.now()}` });
    // Enqueue trust & safety jobs
    await supabase.rpc("public.enqueue_job_v1", { p_job_type: "risk_evaluate_recent_v1", p_payload: JSON.stringify({ lookback_hours: 24 }), p_run_at: new Date().toISOString(), p_idempotency_key: `risk_eval:${Date.now()}` });
    await supabase.rpc("public.enqueue_job_v1", { p_job_type: "risk_decay_v1", p_payload: JSON.stringify({ days_without_incident: 7 }), p_run_at: new Date().toISOString(), p_idempotency_key: `risk_decay:${Date.now()}` });
    await supabase.rpc("public.enqueue_job_v1", { p_job_type: "dispute_sla_watch_v1", p_payload: JSON.stringify({ max_hours_open: 48 }), p_run_at: new Date().toISOString(), p_idempotency_key: `dispute_sla:${Date.now()}` });
    // Enqueue observability jobs
    await supabase.rpc("public.enqueue_job_v1", { p_job_type: "system_metrics_rollup_v1", p_payload: JSON.stringify({}), p_run_at: new Date().toISOString(), p_idempotency_key: `sysmetrics_rollup:${Date.now()}` }).catch(()=>{});
    await supabase.rpc("public.enqueue_job_v1", { p_job_type: "alerts_check_v1", p_payload: JSON.stringify({}), p_run_at: new Date().toISOString(), p_idempotency_key: `alerts_check:${Date.now()}` }).catch(()=>{});
    // Enqueue trust analytics rollup daily
    await supabase.rpc("public.enqueue_job_v1", { p_job_type: "analytics_rollup_daily_v1", p_payload: JSON.stringify({ day: (new Date()).toISOString().slice(0,10) }), p_run_at: new Date().toISOString(), p_idempotency_key: `analytics_trust:${Date.now()}` }).catch(()=>{});
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("finance-cron error", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
