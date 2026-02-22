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

    // check admin via admin_users table (best-effort)
    const { data: adminRow } = await supabase.from("admin_users").select("id").eq("user_id", user.id).maybeSingle();
    if (!adminRow) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const [{ count: queued }] = await supabase.rpc("get_row_count", { p_table: "public.job_queue", p_where: "status = 'queued'" }).then(r => r.data || [{ count: 0 }]);
    // Fallback if get_row_count not present, use direct counts
    const countsResp = await supabase.from("job_queue").select("status", { count: "exact" });
    const counts = { queued: 0, running: 0, failed: 0, dead: 0 };
    if (countsResp.data) {
      const rows = await supabase.rpc("get_job_counts_v1").then(r => r.data).catch(() => null);
    }

    // Simple approach: run queries for totals
    const q1 = await supabase.from("job_queue").select("id", { count: "exact" }).eq("status", "queued");
    const q2 = await supabase.from("job_queue").select("id", { count: "exact" }).eq("status", "running");
    const q3 = await supabase.from("job_queue").select("id", { count: "exact" }).eq("status", "failed");
    const q4 = await supabase.from("job_queue").select("id", { count: "exact" }).eq("status", "dead");

    const recent = await supabase.from("job_queue").select("*").order("created_at", { ascending: false }).limit(100);

    return new Response(JSON.stringify({
      summary: {
        queued: q1.count || 0,
        running: q2.count || 0,
        failed: q3.count || 0,
        dead: q4.count || 0
      },
      jobs: recent.data || []
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error('admin-jobs-summary error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'internal' }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

