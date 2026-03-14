import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DEV_TOOLS_ENABLED = Deno.env.get("DEV_TOOLS_ENABLED") || "false";
const DEV_TOOLS_SECRET = Deno.env.get("DEV_TOOLS_SECRET") || "";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, x-dev-secret" };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ success: false, error: { code: "METHOD_NOT_ALLOWED", message: "POST only" } }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (DEV_TOOLS_ENABLED !== "true") {
    return new Response(JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: "Not found" } }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const maybeSecret = req.headers.get("x-dev-secret") || "";
  if (DEV_TOOLS_SECRET && maybeSecret !== DEV_TOOLS_SECRET) {
    return new Response(JSON.stringify({ success: false, error: { code: "FORBIDDEN", message: "Invalid dev secret" } }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return new Response(JSON.stringify({ success: false, error: { code: "UNAUTHORIZED", message: "Missing authorization" } }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: userResp, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr) return new Response(JSON.stringify({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid token" } }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const caller = userResp?.user;
    if (!caller) return new Response(JSON.stringify({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid token" } }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const acting_session_id = body.acting_session_id;
    if (!acting_session_id) return new Response(JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "acting_session_id is required" } }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Ensure caller is admin or the creator of the session
    const { data: sessionRow, error: sErr } = await supabaseAdmin.from("dev_acting_sessions").select("*").eq("id", acting_session_id).maybeSingle();
    if (sErr) return new Response(JSON.stringify({ success: false, error: { code: "INTERNAL", message: "Session lookup failed" } }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!sessionRow) return new Response(JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: "Session not found" } }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: ur, error: urErr } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", caller.id).maybeSingle();
    if (urErr) return new Response(JSON.stringify({ success: false, error: { code: "INTERNAL", message: "Role check failed" } }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: allowRow, error: allowErr } = await supabaseAdmin.from("dev_allowlist").select("user_id").eq("user_id", caller.id).maybeSingle();
    if (allowErr) return new Response(JSON.stringify({ success: false, error: { code: "INTERNAL", message: "Allowlist check failed" } }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const isAdmin = !!ur && ur.role === "admin";
    const isAllowlisted = !!allowRow;
    const isOwner = sessionRow.developer_user_id === caller.id;
    if (!isAdmin && !isAllowlisted && !isOwner) return new Response(JSON.stringify({ success: false, error: { code: "FORBIDDEN", message: "Not authorized" } }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { error: updErr } = await supabaseAdmin.from("dev_acting_sessions").update({ revoked_at: new Date().toISOString() }).eq("id", acting_session_id);
    if (updErr) return new Response(JSON.stringify({ success: false, error: { code: "INTERNAL", message: "Failed to revoke session" } }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    return new Response(JSON.stringify({ success: true, data: { revoked: true } }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("dev-revoke-acting-session error:", err);
    return new Response(JSON.stringify({ success: false, error: { code: "INTERNAL", message: "Internal error" } }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
