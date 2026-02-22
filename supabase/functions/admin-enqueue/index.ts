import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: adminRow } = await supabase.from("admin_users").select("id").eq("user_id", user.id).maybeSingle();
    if (!adminRow) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const { job_type, payload, run_at, idempotency_key, priority, max_attempts } = body;
    if (!job_type) return new Response(JSON.stringify({ error: "job_type required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const rpc = await supabase.rpc("enqueue_job_v1", {
      p_job_type: job_type,
      p_payload: payload || {},
      p_run_at: run_at || null,
      p_idempotency_key: idempotency_key || null,
      p_priority: priority || 100,
      p_max_attempts: max_attempts || 5
    });
    if (rpc.error) return new Response(JSON.stringify({ error: rpc.error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    return new Response(JSON.stringify({ job_id: rpc.data }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error('admin-enqueue error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'internal' }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

