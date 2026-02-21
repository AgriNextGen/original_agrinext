import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WORKER_SECRET = Deno.env.get("WORKER_SECRET")!;
const BATCH_SIZE = Number(Deno.env.get("WORKER_BATCH_SIZE") || "25");

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, x-worker-secret" };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const secret = req.headers.get("x-worker-secret") || "";
  if (secret !== WORKER_SECRET) return new Response("forbidden", { status: 403 });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const workerId = `worker:${crypto.randomUUID()}`;

  const { data: run, error: runErr } = await supabase.from("job_runs").insert([{ worker_id: workerId }]).select("*").maybeSingle();
  if (runErr) {
    console.error("failed to create job_run", runErr);
    return new Response(JSON.stringify({ error: runErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const runId = run.id;

  let processed = 0, succeeded = 0, failed = 0;

  try {
    const { data: jobs, error: fetchErr } = await supabase.rpc("worker_fetch_and_lock_jobs_v1", { p_worker_id: workerId, p_limit: BATCH_SIZE });
    if (fetchErr) throw fetchErr;

    for (const job of (jobs || [])) {
      processed++;
      try {
        await handleJob(job, supabase);
        succeeded++;
        await supabase.rpc("job_update_after_attempt_v1", { p_job_id: job.id, p_status: "succeeded", p_attempts: job.attempts, p_next_run_at: null, p_last_error: null });
      } catch (handlerErr) {
        failed++;
        const attempts = (job.attempts || 1);
        const newAttempts = attempts;
        const nextSec = computeBackoff(newAttempts);
        const status = (newAttempts >= (job.max_attempts || 5)) ? "dead" : "failed";
        const nextRunAt = status === "dead" ? null : new Date(Date.now() + nextSec * 1000).toISOString();

        await supabase.rpc("job_update_after_attempt_v1", {
          p_job_id: job.id,
          p_status: status,
          p_attempts: newAttempts,
          p_next_run_at: nextRunAt,
          p_last_error: String(handlerErr?.message || handlerErr)
        });

        if (newAttempts >= 3) {
          await supabase.rpc("audit.log_security_event_v1", {
            p_request_id: null,
            p_event_type: 'JOB_HANDLER_FAILURE',
            p_severity: 'medium',
            p_actor_user_id: null,
            p_rl_key: job.id,
            p_ip_address: null,
            p_device_id: null,
            p_user_agent: null,
            p_risk_score_snapshot: null,
            p_blocked_until: null,
            p_metadata: { job_id: job.id, job_type: job.job_type, error: String(handlerErr?.message || handlerErr) }
          });
        }
      }
    }
  } catch (err) {
    console.error("worker run error:", err);
  } finally {
    await supabase.from("job_runs").update({ processed_count: processed, success_count: succeeded, failed_count: failed, finished_at: new Date().toISOString() }).eq("id", runId);
  }

  return new Response(JSON.stringify({ run_id: runId, processed, succeeded, failed }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});

function computeBackoff(attempts: number): number {
  switch (attempts) {
    case 1: return 60;
    case 2: return 5 * 60;
    case 3: return 15 * 60;
    case 4: return 60 * 60;
    default: return 0;
  }
}

async function handleJob(job: any, supabase: any) {
  const payload = job.payload || {};
  switch (job.job_type) {
    case "system_metrics_rollup_v1":
      {
        try {
          await supabase.rpc("admin.system_metrics_rollup_v1").catch((e:any)=>{ throw e; });
          await supabase.rpc("audit.log_workflow_event_v1", {
            p_request_id: null, p_entity_type: 'system', p_entity_id: null, p_event_type: 'SYSTEM_METRICS_ROLLED_UP',
            p_actor_user_id: null, p_actor_role: null, p_geo_lat: null, p_geo_long: null, p_device_id: null, p_file_id: null,
            p_ip_address: null, p_user_agent: null, p_metadata: { job_id: job.id }
          }).catch(()=>{});
        } catch (e) { throw e; }
      }
      break;

    case "alerts_check_v1":
      {
        try {
          await supabase.rpc("admin.alerts_check_v1").catch((e:any)=>{ throw e; });
          await supabase.rpc("audit.log_workflow_event_v1", {
            p_request_id: null, p_entity_type: 'system', p_entity_id: null, p_event_type: 'ALERTS_CHECKED',
            p_actor_user_id: null, p_actor_role: null, p_geo_lat: null, p_geo_long: null, p_device_id: null, p_file_id: null,
            p_ip_address: null, p_user_agent: null, p_metadata: { job_id: job.id }
          }).catch(()=>{});
        } catch (e) { throw e; }
      }
      break;
    case "system_metrics_rollup_v1":
      {
        // Rollup recent system metrics (last hour) into analytics.system_metrics_hourly
        try {
          await supabase.rpc("admin.system_metrics_rollup_v1").catch((e:any)=>{ throw e; });
          await supabase.rpc("audit.log_workflow_event_v1", {
            p_request_id: null, p_entity_type: 'system', p_entity_id: null, p_event_type: 'SYSTEM_METRICS_ROLLED_UP',
            p_actor_user_id: null, p_actor_role: null, p_geo_lat: null, p_geo_long: null, p_device_id: null, p_file_id: null,
            p_ip_address: null, p_user_agent: null, p_metadata: { job_id: job.id }
          }).catch(()=>{});
        } catch (e) { throw e; }
      }
      break;

    case "alerts_check_v1":
      {
        try {
          await supabase.rpc("admin.alerts_check_v1").catch((e:any)=>{ throw e; });
          await supabase.rpc("audit.log_workflow_event_v1", {
            p_request_id: null, p_entity_type: 'system', p_entity_id: null, p_event_type: 'ALERTS_CHECKED',
            p_actor_user_id: null, p_actor_role: null, p_geo_lat: null, p_geo_long: null, p_device_id: null, p_file_id: null,
            p_ip_address: null, p_user_agent: null, p_metadata: { job_id: job.id }
          }).catch(()=>{});
        } catch (e) { throw e; }
      }
      break;
    case "notify_deliver_v1":
      if (!payload.notification_id) throw new Error("missing notification_id");
      await supabase.from("notifications").update({ delivered_at: new Date().toISOString() }).eq("id", payload.notification_id);
      await supabase.rpc("audit.log_workflow_event_v1", {
        p_request_id: null,
        p_entity_type: 'notification',
        p_entity_id: payload.notification_id,
        p_event_type: 'NOTIFICATION_DELIVERED',
        p_actor_user_id: null,
        p_actor_role: null,
        p_geo_lat: null,
        p_geo_long: null,
        p_device_id: null,
        p_file_id: null,
        p_ip_address: null,
        p_user_agent: null,
        p_metadata: { job_id: job.id }
      });
      break;

    case "analytics_rollup_daily_v1":
      if (!payload.day) throw new Error("missing day");
      await supabase.rpc("analytics.rollup_daily_v1", { p_day: payload.day });
      await supabase.rpc("analytics.rollup_finance_daily_v1", { p_day: payload.day }).catch(() => {});
      await supabase.rpc("audit.log_workflow_event_v1", {
        p_request_id: null,
        p_entity_type: 'analytics',
        p_entity_id: null,
        p_event_type: 'ANALYTICS_ROLLUP_DONE',
        p_actor_user_id: null,
        p_actor_role: null,
        p_geo_lat: null,
        p_geo_long: null,
        p_device_id: null,
        p_file_id: null,
        p_ip_address: null,
        p_user_agent: null,
        p_metadata: { day: payload.day, job_id: job.id }
      });
      break;

    case "payments_cleanup_stale_v1":
      {
        const thresh = Number(payload.threshold_minutes || 60);
        const cutoff = new Date(Date.now() - thresh * 60 * 1000).toISOString();
        await supabase.from("market_orders").update({ payment_status: 'failed' }).lt("updated_at", cutoff).eq("payment_status", "initiated");
        await supabase.rpc("audit.log_workflow_event_v1", {
          p_request_id: null,
          p_entity_type: 'payments',
          p_entity_id: null,
          p_event_type: 'PAYMENT_STALE_FAILED',
          p_actor_user_id: null,
          p_actor_role: null,
          p_geo_lat: null,
          p_geo_long: null,
          p_device_id: null,
          p_file_id: null,
          p_ip_address: null,
          p_user_agent: null,
          p_metadata: { threshold_minutes: thresh, job_id: job.id }
        });
      }
      break;

    case "payments_reconcile_recent_v1":
      {
        const lookback = Number(payload.lookback_minutes || 1440);
        const thresholdMs = Number(payload.threshold_minutes || 60) * 60 * 1000;
        const cutoff = new Date(Date.now() - thresholdMs).toISOString();
        const { data: orders } = await supabase
          .from("market_orders")
          .select("*")
          .in("payment_status", ["initiated","authorized"])
          .lt("updated_at", cutoff)
          .limit(Number(payload.batch_size || 200));

        for (const o of (orders || [])) {
          try {
            // Best-effort: call gateway via external API adapter (omitted) or check secure.payment_events for provider truth
            // If provider reported captured event already, apply via rpc
            const { data: pe } = await supabase
              .from("secure.payment_events")
              .select("*")
              .eq("order_id", o.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (pe && pe.status && pe.status.toLowerCase() === "captured") {
              await supabase.rpc("secure.apply_gateway_state_v1", {
                p_provider: pe.provider,
                p_event_id: pe.id::text,
                p_event_type: pe.event_type,
                p_payment_order_id: o.payment_order_id,
                p_payment_id: pe.provider_payment_id,
                p_order_id: o.id,
                p_status: pe.status,
                p_amount: pe.amount,
                p_payload: pe.metadata || {}
              });
            } else {
              // No provider event found; mark as stale and surface ops item
              await supabase.rpc("admin.build_ops_inbox_item_v1", {
                p_item_type: "stale_payment", p_entity_type: "order", p_entity_id: o.id,
                p_severity: "medium", p_summary: `Stale payment for order ${o.id}`, p_metadata: { payment_status: o.payment_status, updated_at: o.updated_at }
              }).catch(() => {});
            }
          } catch (e) {
            console.error("reconcile order error", e);
          }
        }
      }
      break;

    case "webhook_retry_failed_v1":
      {
        const limit = Number(payload.limit || 50);
        const { data: events } = await supabase
          .from("secure.webhook_events")
          .select("*")
          .eq("processing_status", "failed")
          .lte("next_retry_at", new Date().toISOString())
          .order("received_at", { ascending: true })
          .limit(limit);

        for (const ev of (events || [])) {
          try {
            const attempts = (ev.attempts || 0) + 1;
            // Try to re-process by calling secure.apply_gateway_state_v1 with stored payload
            await supabase.rpc("secure.apply_gateway_state_v1", {
              p_provider: ev.provider,
              p_event_id: ev.event_id,
              p_event_type: ev.event_type,
              p_payment_order_id: (ev.payload && ev.payload.payload && ev.payload.payload.order && ev.payload.payload.order.entity && ev.payload.payload.order.entity.id) || null,
              p_payment_id: (ev.payload && ev.payload.payload && ev.payload.payload.payment && ev.payload.payload.payment.entity && ev.payload.payload.payment.entity.id) || null,
              p_order_id: null,
              p_status: (ev.payload && ev.payload.payload && ev.payload.payload.payment && ev.payload.payload.payment.entity && ev.payload.payload.payment.entity.status) || null,
              p_amount: null,
              p_payload: ev.payload || {}
            });

            await supabase.from("secure.webhook_events").update({ processing_status: "processed", attempts: attempts, last_error: null, next_retry_at: null, processed_at: new Date().toISOString() }).eq("id", ev.id);
          } catch (err) {
            const attempts = (ev.attempts || 0) + 1;
            const nextSec = computeBackoff(attempts);
            const nextRunAt = nextSec > 0 ? new Date(Date.now() + nextSec * 1000).toISOString() : null;
            await supabase.from("secure.webhook_events").update({ processing_status: "failed", attempts: attempts, last_error: String(err?.message || err), next_retry_at: nextRunAt }).eq("id", ev.id);
            if (attempts >= 5) {
              await supabase.rpc("admin.build_ops_inbox_item_v1", {
                p_item_type: "webhook_failed", p_entity_type: "webhook_event", p_entity_id: ev.id,
                p_severity: "high", p_summary: `Webhook ${ev.provider}/${ev.event_type} failed after ${attempts} attempts`, p_metadata: { event_id: ev.event_id, last_error: String(err?.message || err) }
              }).catch(() => {});
              await supabase.rpc("audit.log_security_event_v1", {
                p_request_id: null,
                p_event_type: 'WEBHOOK_RETRY_FAILED',
                p_severity: 'high',
                p_actor_user_id: null,
                p_rl_key: ev.id,
                p_ip_address: null,
                p_device_id: null,
                p_user_agent: null,
                p_risk_score_snapshot: null,
                p_blocked_until: null,
                p_metadata: { event_id: ev.event_id, provider: ev.provider, attempts }
              }).catch(() => {});
            }
          }
        }
      }
      break;

    case "refund_initiate_v1":
      {
        const refundId = payload.refund_id;
        if (!refundId) throw new Error("missing refund_id");
        const { data: refund } = await supabase.from("secure.refund_requests").select("*").eq("id", refundId).maybeSingle();
        if (!refund) throw new Error("refund not found");
        if (refund.status !== "approved") throw new Error("refund not approved");

        try {
          // Call provider refund API here (omitted). For now mark initiated and set provider_refund_id placeholder.
          await supabase.from("secure.refund_requests").update({ status: "initiated", provider_refund_id: 'manual:' || refundId, updated_at: new Date().toISOString() }).eq("id", refundId);
          // enqueue reconciliation if webhook may arrive later
        } catch (err) {
          await supabase.from("secure.refund_requests").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", refundId);
          await supabase.rpc("admin.build_ops_inbox_item_v1", {
            p_item_type: "refund_pending_review", p_entity_type: "refund", p_entity_id: refundId,
            p_severity: "high", p_summary: `Refund initiate failed for ${refundId}`, p_metadata: { error: String(err?.message || err) }
          }).catch(() => {});
          throw err;
        }
      }
      break;

    case "payouts_reminder_queue_v1":
      {
        const hours = Number(payload.threshold_hours || 48);
        const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
        const { data: jobs } = await supabase.from("secure.payout_jobs").select("*").eq("status", "queued").lt("created_at", cutoff).limit(200);
        for (const j of (jobs || [])) {
          await supabase.rpc("admin.build_ops_inbox_item_v1", {
            p_item_type: "payout_pending", p_entity_type: "order", p_entity_id: j.order_id,
            p_severity: "medium", p_summary: `Payout queued for ${j.order_id} for ${hours}h`, p_metadata: { payout_job_id: j.id, created_at: j.created_at }
          }).catch(() => {});
        }
      }
      break;

    case "ai_ticket_triage_v1":
      await handleAiTicketTriage(payload, supabase, job.id);
      break;

    case "ai_timeline_summary_v1":
      await handleAiTimelineSummary(payload, supabase, job.id);
      break;

    case "ai_voice_note_summary_v1":
      await handleAiVoiceNoteSummary(payload, supabase, job.id);
      break;

    case "ai_search_intent_v1":
      await handleAiSearchIntent(payload, supabase, job.id);
      break;

    case "ops_inbox_scan_v1":
      await handleOpsInboxScan(supabase, job.id);
      break;
    case "risk_evaluate_recent_v1":
      {
        const lookback = Number(payload.lookback_hours || 24);
        await supabase.rpc("admin.risk_evaluate_recent_v1", { p_lookback_hours: lookback }).catch((e:any) => { throw e; });
        await supabase.rpc("audit.log_workflow_event_v1", {
          p_request_id: null, p_entity_type: 'system', p_entity_id: null, p_event_type: 'RISK_EVALUATION_HANDLED',
          p_actor_user_id: null, p_actor_role: null, p_geo_lat: null, p_geo_long: null, p_device_id: null, p_file_id: null,
          p_ip_address: null, p_user_agent: null, p_metadata: { lookback_hours: lookback, job_id: job.id }
        }).catch(()=>{});
      }
      break;

    case "risk_decay_v1":
      {
        const days = Number(payload.days_without_incident || 7);
        await supabase.rpc("admin.risk_decay_v1", { p_days_without_incident: days }).catch((e:any) => { throw e; });
        await supabase.rpc("audit.log_workflow_event_v1", {
          p_request_id: null, p_entity_type: 'system', p_entity_id: null, p_event_type: 'RISK_DECAY_HANDLED',
          p_actor_user_id: null, p_actor_role: null, p_geo_lat: null, p_geo_long: null, p_device_id: null, p_file_id: null,
          p_ip_address: null, p_user_agent: null, p_metadata: { days_without_incident: days, job_id: job.id }
        }).catch(()=>{});
      }
      break;

    case "dispute_sla_watch_v1":
      {
        const maxHours = Number(payload.max_hours_open || 48);
        await supabase.rpc("admin.dispute_sla_watch_v1", { p_max_hours_open: maxHours }).catch((e:any) => { throw e; });
        await supabase.rpc("audit.log_workflow_event_v1", {
          p_request_id: null, p_entity_type: 'system', p_entity_id: null, p_event_type: 'DISPUTE_SLA_WATCH_HANDLED',
          p_actor_user_id: null, p_actor_role: null, p_geo_lat: null, p_geo_long: null, p_device_id: null, p_file_id: null,
          p_ip_address: null, p_user_agent: null, p_metadata: { max_hours_open: maxHours, job_id: job.id }
        }).catch(()=>{});
      }
      break;

    default:
      throw new Error("unknown job_type: " + job.job_type);
  }
}

// --------------------------------------------------------------------
// Existing helper implementations (copied from backup - omitted bodies for brevity)
// --------------------------------------------------------------------

function triageTicket(message: string): { category: string; priority: string; entities: Record<string, string> } {
  const lower = message.toLowerCase();
  let category = "other";
  let priority = "normal";
  const entities: Record<string, string> = {};

  const CATEGORY_KEYWORDS: Record<string, string[]> = {
    trip: ["trip", "transport", "delivery", "driver", "pickup", "transit", "truck", "vehicle"],
    order: ["order", "purchase", "buy", "payment", "refund", "amount", "price"],
    listing: ["listing", "product", "stock", "crop", "quantity", "sell"],
    account: ["account", "login", "password", "profile", "locked", "otp", "phone"],
    payment: ["payment", "payout", "settle", "upi", "bank", "money", "rupee", "rs"],
    kyc: ["kyc", "aadhaar", "pan", "document", "verify", "identity"],
  };
  const PRIORITY_SIGNALS: Record<string, string[]> = {
    urgent: ["urgent", "emergency", "asap", "immediately", "blocked", "stuck for days"],
    high: ["stuck", "failed", "error", "not working", "critical", "lost"],
    low: ["question", "how to", "suggestion", "feedback", "minor"],
  };

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) { category = cat; break; }
  }
  for (const [pri, signals] of Object.entries(PRIORITY_SIGNALS)) {
    if (signals.some((s) => lower.includes(s))) { priority = pri; break; }
  }

  const uuidMatch = message.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  if (uuidMatch) entities.extracted_id = uuidMatch[0];
  const phoneMatch = message.match(/(?:\+91|0)?[6-9]\d{9}/);
  if (phoneMatch) entities.phone = phoneMatch[0];
  return { category, priority, entities };
}

async function handleAiTicketTriage(payload: any, supabase: any, jobId: string) {
  if (!payload.ticket_id) throw new Error("missing ticket_id");
  const { data: ticket } = await supabase.from("support_tickets").select("*").eq("id", payload.ticket_id).maybeSingle();
  if (!ticket) throw new Error("ticket not found");
  const triage = triageTicket(ticket.message || "");
  const inputHash = btoa((ticket.message || "").slice(0, 200)).slice(0, 64);
  const output = {
    suggested_category: triage.category,
    suggested_priority: triage.priority,
    extracted_entities: triage.entities,
    suggested_actions: triage.priority === "urgent" ? ["Escalate immediately","Contact user"] : ["Review and respond"],
  };
  await supabase.from("ai_outputs").insert([{
    target_type: "ticket",
    target_id: payload.ticket_id,
    provider: "fallback",
    input_hash: inputHash,
    output,
    confidence: 0.6,
    status: "suggested",
  }]);
}

async function handleAiTimelineSummary(payload: any, supabase: any, jobId: string) {
  const { entity_type, entity_id } = payload;
  if (!entity_type || !entity_id) throw new Error("missing entity_type or entity_id");
  const { data: events } = await supabase
    .from("workflow_events")
    .select("event_type, created_at, metadata")
    .eq("entity_type", entity_type)
    .eq("entity_id", entity_id)
    .order("created_at", { ascending: false })
    .limit(50);
  const evts = events || [];
  const eventTypes = evts.map((e: any) => e.event_type);
  const anomalies: string[] = [];
  const cancellations = eventTypes.filter((t: string) => t.includes("CANCEL")).length;
  if (cancellations > 0) anomalies.push(`${cancellations} cancellation(s) detected`);
  const summary = [
    `Entity: ${entity_type} ${entity_id}`,
    `Total events: ${evts.length}`,
    `Latest event: ${evts[0]?.event_type || "none"} at ${evts[0]?.created_at || "N/A"}`,
    anomalies.length > 0 ? `Anomalies: ${anomalies.join("; ")}` : "No anomalies detected",
  ].join("\n");
  const inputHash = `${entity_type}:${entity_id}:${evts.length}`;
  await supabase.from("ai_outputs").insert([{
    target_type: "timeline",
    target_id: entity_id,
    provider: "fallback",
    input_hash: inputHash,
    output: { summary, anomalies, event_count: evts.length, latest_event: evts[0]?.event_type },
    confidence: 0.5,
    status: "suggested",
  }]);
}

async function handleAiVoiceNoteSummary(payload: any, supabase: any, jobId: string) {
  // simplified fallback
  if (!payload.voice_note_id) throw new Error("missing voice_note_id");
  const { data: note } = await supabase.from("agent_voice_notes").select("id, agent_id, note_text").eq("id", payload.voice_note_id).maybeSingle();
  if (!note) throw new Error("voice note not found");
  const text = note.note_text || "";
  const summary = text.slice(0,300);
  await supabase.from("agent_voice_note_summaries").insert([{ voice_note_id: note.id, agent_id: note.agent_id, summary, extracted: {} }]);
}

async function handleAiSearchIntent(payload: any, supabase: any, jobId: string) {
  // omitted for brevity - fallback implemented elsewhere
}

async function handleOpsInboxScan(supabase: any, jobId: string) {
  // reuse previous implementation: scan for stuck entities and upsert ops items
  let upserted = 0;
  const { data: stuckOrders } = await supabase
    .from("market_orders")
    .select("id, farmer_id, buyer_id, updated_at")
    .eq("status", "ready_for_pickup")
    .lt("updated_at", new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString())
    .limit(100);
  for (const o of (stuckOrders || [])) {
    await supabase.from("ops_inbox_items").upsert({
      item_type: "stuck_order", entity_type: "order", entity_id: o.id,
      severity: "high", summary: `Order ready_for_pickup for 72h+, last update: ${o.updated_at}`,
      metadata: { farmer_id: o.farmer_id, buyer_id: o.buyer_id }, status: "open"
    }, { onConflict: "item_type,entity_type,entity_id" }).catch(()=>{});
    upserted++;
  }
  console.log(`ops_inbox_scan_v1: upserted ${upserted} items`);
}

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WORKER_SECRET = Deno.env.get("WORKER_SECRET")!;
const BATCH_SIZE = Number(Deno.env.get("WORKER_BATCH_SIZE") || "25");

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, x-worker-secret" };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const secret = req.headers.get("x-worker-secret") || "";
  if (secret !== WORKER_SECRET) return new Response("forbidden", { status: 403 });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const workerId = `worker:${crypto.randomUUID()}`;

  // create job_run record
  const { data: run, error: runErr } = await supabase.from("job_runs").insert([{ worker_id: workerId }]).select("*").maybeSingle();
  if (runErr) {
    console.error("failed to create job_run", runErr);
    return new Response(JSON.stringify({ error: runErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const runId = run.id;

  let processed = 0, succeeded = 0, failed = 0;

  try {
    const { data: jobs, error: fetchErr } = await supabase.rpc("worker_fetch_and_lock_jobs_v1", { p_worker_id: workerId, p_limit: BATCH_SIZE });
    if (fetchErr) throw fetchErr;

    for (const job of (jobs || [])) {
      processed++;
      try {
        await handleJob(job, supabase);
        succeeded++;
        await supabase.rpc("job_update_after_attempt_v1", { p_job_id: job.id, p_status: "succeeded", p_attempts: job.attempts, p_next_run_at: null, p_last_error: null });
      } catch (handlerErr) {
        failed++;
        const attempts = (job.attempts || 1);
        const newAttempts = attempts;
        const nextSec = computeBackoff(newAttempts);
        const status = (newAttempts >= (job.max_attempts || 5)) ? "dead" : "failed";
        const nextRunAt = status === "dead" ? null : new Date(Date.now() + nextSec * 1000).toISOString();

        await supabase.rpc("job_update_after_attempt_v1", {
          p_job_id: job.id,
          p_status: status,
          p_attempts: newAttempts,
          p_next_run_at: nextRunAt,
          p_last_error: String(handlerErr?.message || handlerErr)
        });

        if (newAttempts >= 3) {
          await supabase.rpc("audit.log_security_event_v1", {
            p_request_id: null,
            p_event_type: 'JOB_HANDLER_FAILURE',
            p_severity: 'medium',
            p_actor_user_id: null,
            p_rl_key: job.id,
            p_ip_address: null,
            p_device_id: null,
            p_user_agent: null,
            p_risk_score_snapshot: null,
            p_blocked_until: null,
            p_metadata: { job_id: job.id, job_type: job.job_type, error: String(handlerErr?.message || handlerErr) }
          });
        }
      }
    }
  } catch (err) {
    console.error("worker run error:", err);
  } finally {
    await supabase.from("job_runs").update({ processed_count: processed, success_count: succeeded, failed_count: failed, finished_at: new Date().toISOString() }).eq("id", runId);
  }

  return new Response(JSON.stringify({ run_id: runId, processed, succeeded, failed }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});

function computeBackoff(attempts: number): number {
  switch (attempts) {
    case 1: return 60;
    case 2: return 5 * 60;
    case 3: return 15 * 60;
    case 4: return 60 * 60;
    default: return 0;
  }
}

async function handleJob(job: any, supabase: any) {
  const payload = job.payload || {};
  switch (job.job_type) {
    case "notify_deliver_v1":
      if (!payload.notification_id) throw new Error("missing notification_id");
      await supabase.from("notifications").update({ delivered_at: new Date().toISOString() }).eq("id", payload.notification_id);
      await supabase.rpc("audit.log_workflow_event_v1", {
        p_request_id: null,
        p_entity_type: 'notification',
        p_entity_id: payload.notification_id,
        p_event_type: 'NOTIFICATION_DELIVERED',
        p_actor_user_id: null,
        p_actor_role: null,
        p_geo_lat: null,
        p_geo_long: null,
        p_device_id: null,
        p_file_id: null,
        p_ip_address: null,
        p_user_agent: null,
        p_metadata: { job_id: job.id }
      });
      break;

    case "analytics_rollup_daily_v1":
      if (!payload.day) throw new Error("missing day");
      await supabase.rpc("analytics.rollup_daily_v1", { p_day: payload.day });
      await supabase.rpc("audit.log_workflow_event_v1", {
        p_request_id: null,
        p_entity_type: 'analytics',
        p_entity_id: null,
        p_event_type: 'ANALYTICS_ROLLUP_DONE',
        p_actor_user_id: null,
        p_actor_role: null,
        p_geo_lat: null,
        p_geo_long: null,
        p_device_id: null,
        p_file_id: null,
        p_ip_address: null,
        p_user_agent: null,
        p_metadata: { day: payload.day, job_id: job.id }
      });
      break;

    case "payments_cleanup_stale_v1":
      const thresh = Number(payload.threshold_minutes || 60);
      const cutoff = new Date(Date.now() - thresh * 60 * 1000).toISOString();
      await supabase.from("market_orders").update({ payment_status: 'failed' }).lt("updated_at", cutoff).eq("payment_status", "initiated");
      await supabase.rpc("audit.log_workflow_event_v1", {
        p_request_id: null,
        p_entity_type: 'payments',
        p_entity_id: null,
        p_event_type: 'PAYMENT_STALE_FAILED',
        p_actor_user_id: null,
        p_actor_role: null,
        p_geo_lat: null,
        p_geo_long: null,
        p_device_id: null,
        p_file_id: null,
        p_ip_address: null,
        p_user_agent: null,
        p_metadata: { threshold_minutes: thresh, job_id: job.id }
      });
      break;

    case "ai_ticket_triage_v1":
      await handleAiTicketTriage(payload, supabase, job.id);
      break;

    case "ai_timeline_summary_v1":
      await handleAiTimelineSummary(payload, supabase, job.id);
      break;

    case "ai_voice_note_summary_v1":
      await handleAiVoiceNoteSummary(payload, supabase, job.id);
      break;

    case "ai_search_intent_v1":
      await handleAiSearchIntent(payload, supabase, job.id);
      break;

    case "ops_inbox_scan_v1":
      await handleOpsInboxScan(supabase, job.id);
      break;

    default:
      throw new Error("unknown job_type: " + job.job_type);
  }
}

// ====================================================================
// AI TICKET TRIAGE (rule-based fallback)
// ====================================================================

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  trip: ["trip", "transport", "delivery", "driver", "pickup", "transit", "truck", "vehicle"],
  order: ["order", "purchase", "buy", "payment", "refund", "amount", "price"],
  listing: ["listing", "product", "stock", "crop", "quantity", "sell"],
  account: ["account", "login", "password", "profile", "locked", "otp", "phone"],
  payment: ["payment", "payout", "settle", "upi", "bank", "money", "rupee", "rs"],
  kyc: ["kyc", "aadhaar", "pan", "document", "verify", "identity"],
};

const PRIORITY_SIGNALS: Record<string, string[]> = {
  urgent: ["urgent", "emergency", "asap", "immediately", "blocked", "stuck for days"],
  high: ["stuck", "failed", "error", "not working", "critical", "lost"],
  low: ["question", "how to", "suggestion", "feedback", "minor"],
};

function triageTicket(message: string): { category: string; priority: string; entities: Record<string, string> } {
  const lower = message.toLowerCase();
  let category = "other";
  let priority = "normal";
  const entities: Record<string, string> = {};

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) { category = cat; break; }
  }
  for (const [pri, signals] of Object.entries(PRIORITY_SIGNALS)) {
    if (signals.some((s) => lower.includes(s))) { priority = pri; break; }
  }

  const uuidMatch = message.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  if (uuidMatch) entities.extracted_id = uuidMatch[0];

  const phoneMatch = message.match(/(?:\+91|0)?[6-9]\d{9}/);
  if (phoneMatch) entities.phone = phoneMatch[0];

  return { category, priority, entities };
}

async function handleAiTicketTriage(payload: any, supabase: any, jobId: string) {
  if (!payload.ticket_id) throw new Error("missing ticket_id");

  const { data: ticket } = await supabase.from("support_tickets").select("*").eq("id", payload.ticket_id).maybeSingle();
  if (!ticket) throw new Error("ticket not found");

  const triage = triageTicket(ticket.message || "");
  const inputHash = btoa(ticket.message?.slice(0, 200) || "").slice(0, 64);

  const output = {
    suggested_category: triage.category,
    suggested_priority: triage.priority,
    extracted_entities: triage.entities,
    suggested_actions: triage.priority === "urgent"
      ? ["Escalate immediately", "Contact user"]
      : ["Review and respond"],
  };

  await supabase.from("ai_outputs").insert([{
    target_type: "ticket",
    target_id: payload.ticket_id,
    provider: "fallback",
    input_hash: inputHash,
    output,
    confidence: 0.6,
    status: "suggested",
  }]);

  await supabase.rpc("audit__log_workflow_event_v1" in supabase ? "audit.log_workflow_event_v1" : "log_workflow_event_v1", {}).catch(() => {});
  console.log(`ai_ticket_triage_v1: triaged ticket ${payload.ticket_id} → ${triage.category}/${triage.priority}`);
}

// ====================================================================
// AI TIMELINE SUMMARY (rule-based fallback)
// ====================================================================

async function handleAiTimelineSummary(payload: any, supabase: any, jobId: string) {
  const { entity_type, entity_id } = payload;
  if (!entity_type || !entity_id) throw new Error("missing entity_type or entity_id");

  const { data: events } = await supabase
    .from("workflow_events")
    .select("event_type, created_at, metadata")
    .eq("entity_type", entity_type)
    .eq("entity_id", entity_id)
    .order("created_at", { ascending: false })
    .limit(50);

  const evts = events || [];
  const eventTypes = evts.map((e: any) => e.event_type);
  const anomalies: string[] = [];

  const cancellations = eventTypes.filter((t: string) => t.includes("CANCEL")).length;
  if (cancellations > 0) anomalies.push(`${cancellations} cancellation(s) detected`);

  const overrides = eventTypes.filter((t: string) => t.includes("OVERRIDE")).length;
  if (overrides > 0) anomalies.push(`${overrides} admin override(s)`);

  const statusChanges = eventTypes.filter((t: string) => t.includes("STATUS")).length;

  if (evts.length >= 2) {
    const newest = new Date(evts[0].created_at).getTime();
    const oldest = new Date(evts[evts.length - 1].created_at).getTime();
    const gapHours = (newest - oldest) / (1000 * 60 * 60);
    if (evts.length < 3 && gapHours > 72) anomalies.push("Possibly stuck: few events over 72+ hours");
  }

  const summary = [
    `Entity: ${entity_type} ${entity_id}`,
    `Total events: ${evts.length}`,
    `Status changes: ${statusChanges}`,
    `Latest event: ${evts[0]?.event_type || "none"} at ${evts[0]?.created_at || "N/A"}`,
    anomalies.length > 0 ? `Anomalies: ${anomalies.join("; ")}` : "No anomalies detected",
  ].join("\n");

  const inputHash = `${entity_type}:${entity_id}:${evts.length}`;

  await supabase.from("ai_outputs").insert([{
    target_type: "timeline",
    target_id: entity_id,
    provider: "fallback",
    input_hash: inputHash,
    output: { summary, anomalies, event_count: evts.length, latest_event: evts[0]?.event_type },
    confidence: 0.5,
    status: "suggested",
  }]);

  console.log(`ai_timeline_summary_v1: summarized ${entity_type}/${entity_id} (${evts.length} events)`);
}

// ====================================================================
// AI VOICE NOTE SUMMARY (rule-based fallback)
// ====================================================================

function extractVoiceNoteInsights(text: string): { issues: string[]; crop_stage: string | null; followup_date: string | null; recommended_action: string | null } {
  const lower = text.toLowerCase();
  const issues: string[] = [];
  const issueKeywords = ["pest", "disease", "drought", "flood", "yellowing", "wilting", "borer", "fungus", "rot", "insect"];
  for (const kw of issueKeywords) {
    if (lower.includes(kw)) issues.push(kw);
  }
  const stages = ["seedling", "vegetative", "flowering", "fruiting", "harvest", "mature", "germination"];
  let crop_stage: string | null = null;
  for (const s of stages) {
    if (lower.includes(s)) { crop_stage = s; break; }
  }
  let followup_date: string | null = null;
  const dateMatch = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
  if (dateMatch) followup_date = dateMatch[1];

  let recommended_action: string | null = null;
  if (issues.length > 0) recommended_action = "Schedule follow-up visit for issue assessment";
  else if (crop_stage === "harvest") recommended_action = "Coordinate harvest logistics";

  return { issues, crop_stage, followup_date, recommended_action };
}

async function handleAiVoiceNoteSummary(payload: any, supabase: any, jobId: string) {
  if (!payload.voice_note_id) throw new Error("missing voice_note_id");

  const { data: note } = await supabase
    .from("agent_voice_notes")
    .select("id, agent_id, note_text, farmer_id, crop_id")
    .eq("id", payload.voice_note_id)
    .maybeSingle();
  if (!note) throw new Error("voice note not found");

  const text = note.note_text || "";
  const extracted = extractVoiceNoteInsights(text);

  const sentences = text.split(/[.!?]+/).filter((s: string) => s.trim().length > 10);
  const summary = sentences.length > 3
    ? sentences.slice(0, 3).join(". ").trim() + "."
    : text.slice(0, 300);

  await supabase.from("agent_voice_note_summaries").insert([{
    voice_note_id: note.id,
    agent_id: note.agent_id,
    summary,
    extracted,
  }]);

  console.log(`ai_voice_note_summary_v1: summarized voice note ${payload.voice_note_id}`);
}

// ====================================================================
// AI SEARCH INTENT (rule-based fallback)
// ====================================================================

async function handleAiSearchIntent(payload: any, supabase: any, jobId: string) {
  const { query_text, actor_id } = payload;
  if (!query_text) throw new Error("missing query_text");

  const lower = query_text.toLowerCase();
  const filters: Record<string, string> = {};

  if (lower.includes("stuck")) filters.item_type = lower.includes("order") ? "stuck_order" : "stuck_trip";
  else if (lower.includes("ticket")) filters.item_type = "ticket";
  else if (lower.includes("kyc")) filters.item_type = "kyc_pending";
  else if (lower.includes("payout")) filters.item_type = "payout_pending";
  else if (lower.includes("dead") || lower.includes("job")) filters.item_type = "dead_job";
  else if (lower.includes("security") || lower.includes("alert")) filters.item_type = "security_alert";

  if (lower.includes("urgent") || lower.includes("high")) filters.severity = "high";
  if (lower.includes("open")) filters.status = "open";
  if (lower.includes("resolved")) filters.status = "resolved";

  const entityTypes = ["trip", "order", "listing", "user"];
  for (const et of entityTypes) {
    if (lower.includes(et)) { filters.entity_type = et; break; }
  }

  const inputHash = btoa(query_text.slice(0, 200)).slice(0, 64);

  await supabase.from("ai_outputs").insert([{
    target_type: "search_intent",
    target_id: actor_id || "00000000-0000-0000-0000-000000000000",
    provider: "fallback",
    input_hash: inputHash,
    output: { suggested_filters: filters, original_query: query_text },
    confidence: 0.5,
    status: "suggested",
  }]);

  console.log(`ai_search_intent_v1: parsed query "${query_text}" → ${JSON.stringify(filters)}`);
}

// ====================================================================
// OPS INBOX SCAN (detect stuck entities, dead jobs, etc.)
// ====================================================================

async function handleOpsInboxScan(supabase: any, jobId: string) {
  let upserted = 0;

  // Stuck trips: in_transit > 24h
  const { data: stuckTrips } = await supabase
    .from("trips")
    .select("id, transporter_id, updated_at")
    .eq("status", "in_transit")
    .lt("updated_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .limit(100);
  for (const t of (stuckTrips || [])) {
    await supabase.rpc("admin.build_ops_inbox_item_v1", {
      p_item_type: "stuck_trip", p_entity_type: "trip", p_entity_id: t.id,
      p_severity: "high", p_summary: `Trip in_transit for 24h+, last update: ${t.updated_at}`,
      p_metadata: { transporter_id: t.transporter_id },
    }).catch(() => {
      supabase.from("ops_inbox_items").upsert({
        item_type: "stuck_trip", entity_type: "trip", entity_id: t.id,
        severity: "high", summary: `Trip in_transit for 24h+, last update: ${t.updated_at}`,
        metadata: { transporter_id: t.transporter_id }, status: "open",
      }, { onConflict: "item_type,entity_type,entity_id" });
    });
    upserted++;
  }

  // Stuck orders: ready_for_pickup > 72h
  const { data: stuckOrders } = await supabase
    .from("market_orders")
    .select("id, farmer_id, buyer_id, updated_at")
    .eq("status", "ready_for_pickup")
    .lt("updated_at", new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString())
    .limit(100);
  for (const o of (stuckOrders || [])) {
    await supabase.from("ops_inbox_items").upsert({
      item_type: "stuck_order", entity_type: "order", entity_id: o.id,
      severity: "high", summary: `Order ready_for_pickup for 72h+, last update: ${o.updated_at}`,
      metadata: { farmer_id: o.farmer_id, buyer_id: o.buyer_id }, status: "open",
    }, { onConflict: "item_type,entity_type,entity_id" });
    upserted++;
  }

  // Dead jobs
  const { data: deadJobs } = await supabase
    .from("job_queue")
    .select("id, job_type, last_error, updated_at")
    .eq("status", "dead")
    .limit(50);
  for (const j of (deadJobs || [])) {
    await supabase.from("ops_inbox_items").upsert({
      item_type: "dead_job", entity_type: "job", entity_id: j.id,
      severity: "medium", summary: `Dead job: ${j.job_type} — ${(j.last_error || "").slice(0, 120)}`,
      metadata: { job_type: j.job_type }, status: "open",
    }, { onConflict: "item_type,entity_type,entity_id" });
    upserted++;
  }

  // KYC pending payouts (if secure.order_financials exists)
  try {
    const { data: kycPending } = await supabase
      .from("order_financials")
      .select("id, order_id")
      .eq("settlement_status", "held_for_kyc")
      .limit(50);
    for (const k of (kycPending || [])) {
      await supabase.from("ops_inbox_items").upsert({
        item_type: "kyc_pending", entity_type: "order", entity_id: k.order_id || k.id,
        severity: "medium", summary: "Payout held pending KYC verification",
        metadata: { financial_id: k.id }, status: "open",
      }, { onConflict: "item_type,entity_type,entity_id" });
      upserted++;
    }
  } catch (_) { /* table may not exist */ }

  // Open support tickets with urgent priority → ops inbox
  const { data: urgentTickets } = await supabase
    .from("support_tickets")
    .select("id, category, message, created_at")
    .eq("status", "open")
    .eq("priority", "urgent")
    .limit(50);
  for (const tk of (urgentTickets || [])) {
    await supabase.from("ops_inbox_items").upsert({
      item_type: "ticket", entity_type: "support_ticket", entity_id: tk.id,
      severity: "high", summary: `Urgent ticket: ${(tk.message || "").slice(0, 100)}`,
      metadata: { category: tk.category }, status: "open",
    }, { onConflict: "item_type,entity_type,entity_id" });
    upserted++;
  }

  console.log(`ops_inbox_scan_v1: upserted ${upserted} items`);
}

