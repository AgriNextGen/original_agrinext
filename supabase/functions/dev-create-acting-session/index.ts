import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    // Validate caller from token
    const { data: userResp, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const caller = userResp?.user;
    if (!caller) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Check admin role
    const { data: ur, error: urErr } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", caller.id).maybeSingle();
    if (urErr) return new Response(JSON.stringify({ error: "role_check_failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!ur || ur.role !== "admin") {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const acting_as_user_id = body.acting_as_user_id;
    const acting_as_role = body.acting_as_role || "farmer";
    const note = body.note || null;
    if (!acting_as_user_id) return new Response(JSON.stringify({ error: "missing acting_as_user_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h

    const { data: inserted, error: insertErr } = await supabaseAdmin.from("dev_acting_sessions").insert([{
      developer_user_id: caller.id,
      acting_as_user_id,
      acting_as_role,
      expires_at,
      note
    }]).select("id").maybeSingle();

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ acting_session_id: inserted?.id, expires_at }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("dev-create-acting-session error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

