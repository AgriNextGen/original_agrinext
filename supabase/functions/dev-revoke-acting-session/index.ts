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
    const { data: userResp, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const caller = userResp?.user;
    if (!caller) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const acting_session_id = body.acting_session_id;
    if (!acting_session_id) return new Response(JSON.stringify({ error: "missing acting_session_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Ensure caller is admin or the creator of the session
    const { data: sessionRow, error: sErr } = await supabaseAdmin.from("dev_acting_sessions").select("*").eq("id", acting_session_id).maybeSingle();
    if (sErr) return new Response(JSON.stringify({ error: sErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!sessionRow) return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: ur, error: urErr } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", caller.id).maybeSingle();
    if (urErr) return new Response(JSON.stringify({ error: "role_check_failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const isAdmin = ur && ur.role === "admin";
    const isOwner = sessionRow.developer_user_id === caller.id;
    if (!isAdmin && !isOwner) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { error: updErr } = await supabaseAdmin.from("dev_acting_sessions").update({ revoked_at: new Date().toISOString() }).eq("id", acting_session_id);
    if (updErr) return new Response(JSON.stringify({ error: updErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("dev-revoke-acting-session error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

