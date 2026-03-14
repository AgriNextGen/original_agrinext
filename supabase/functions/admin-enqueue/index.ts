/**
 * @function admin-enqueue
 * @description Admin-only endpoint to enqueue background jobs into the job queue.
 *   Calls the enqueue_job_v1 RPC to atomically insert a job.
 *
 * @auth verify_jwt = true (JWT required, role must be admin)
 *
 * @request POST /functions/v1/admin-enqueue
 *   { job_type: string, payload: object, run_at?: string (ISO), idempotency_key?: string, priority?: number, max_attempts?: number }
 *
 * @response
 *   200: { success: true, data: { job_id: string } }
 *   400: { error: { code: "invalid_input" } }
 *   403: { error: { code: "forbidden" } }
 *
 * @guards JWT, role = admin, input validation
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ success: false, error: { code: "UNAUTHORIZED", message: "Missing authorization" } }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return new Response(JSON.stringify({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid token" } }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: adminRow } = await supabase.from("admin_users").select("id").eq("user_id", user.id).maybeSingle();
    if (!adminRow) return new Response(JSON.stringify({ success: false, error: { code: "FORBIDDEN", message: "Admin access required" } }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const { job_type, payload, run_at, idempotency_key, priority, max_attempts } = body;
    if (!job_type) return new Response(JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "job_type is required" } }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const rpc = await supabase.rpc("enqueue_job_v1", {
      p_job_type: job_type,
      p_payload: payload || {},
      p_run_at: run_at || null,
      p_idempotency_key: idempotency_key || null,
      p_priority: priority || 100,
      p_max_attempts: max_attempts || 5
    });
    if (rpc.error) return new Response(JSON.stringify({ success: false, error: { code: "RPC_ERROR", message: rpc.error.message } }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    return new Response(JSON.stringify({ success: true, data: { job_id: rpc.data } }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error('admin-enqueue error:', err);
    return new Response(JSON.stringify({ success: false, error: { code: "INTERNAL", message: "Internal error" } }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

