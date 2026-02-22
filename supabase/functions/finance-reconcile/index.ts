import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getRequiredEnv } from "../_shared/env.ts";
import {
  getRequestIdFromHeaders,
  logStructured,
  makeResponseWithRequestId,
} from "../_shared/request_context.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WORKER_SECRET = getRequiredEnv("WORKER_SECRET");

const responseHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Headers": "content-type, x-worker-secret, x-request-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(reqId: string, status: number, body: unknown) {
  return makeResponseWithRequestId(JSON.stringify(body), reqId, {
    status,
    headers: responseHeaders,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: responseHeaders });
  }
  const reqId = getRequestIdFromHeaders(req.headers);
  if (req.method !== "POST") {
    return jsonResponse(reqId, 405, { ok: false, error: "method_not_allowed" });
  }
  const secret = req.headers.get("x-worker-secret") || "";
  if (!secret || secret !== WORKER_SECRET) {
    logStructured({ request_id: reqId, endpoint: "finance-reconcile", status: "forbidden" });
    return jsonResponse(reqId, 403, { ok: false, error: "forbidden" });
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  try {
    const body = await req.json().catch(() => ({}));
    const lookbackRaw = Number(body.lookback_minutes || 1440);
    const lookback = Number.isFinite(lookbackRaw)
      ? Math.min(Math.max(Math.floor(lookbackRaw), 1), 60 * 24 * 30)
      : 1440;
    const idempotency = `reconcile_manual:${Date.now()}`;
    const rpc = await supabase.rpc("public.enqueue_job_v1", {
      p_job_type: "payments_reconcile_recent_v1",
      p_payload: JSON.stringify({ lookback_minutes: lookback }),
      p_run_at: new Date().toISOString(),
      p_idempotency_key: idempotency,
    });
    if (rpc.error) {
      logStructured({
        request_id: reqId,
        endpoint: "finance-reconcile",
        status: "rpc_error",
        error: rpc.error.message,
      });
      return jsonResponse(reqId, 500, { ok: false, error: rpc.error.message });
    }
    logStructured({
      request_id: reqId,
      endpoint: "finance-reconcile",
      status: "queued",
      lookback_minutes: lookback,
      job_id: rpc.data ?? null,
    });
    return jsonResponse(reqId, 200, { ok: true, job_id: rpc.data ?? null });
  } catch (err) {
    console.error("finance-reconcile error", err);
    logStructured({
      request_id: reqId,
      endpoint: "finance-reconcile",
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    });
    return jsonResponse(reqId, 500, { ok: false, error: "internal" });
  }
});
