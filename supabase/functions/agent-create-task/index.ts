import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

const TASK_TYPES = ["visit", "verify_crop", "harvest_check", "transport_assist", "update_profile"] as const;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const { farmer_id, crop_id, task_type, due_date, notes, payload } = body;

    if (!farmer_id || !task_type) {
      return new Response(JSON.stringify({ error: "farmer_id and task_type required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!TASK_TYPES.includes(task_type)) {
      return new Response(JSON.stringify({ error: "Invalid task_type" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
    if (roleRow?.role !== "agent") {
      return new Response(JSON.stringify({ error: "Forbidden: agent role required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (task_type !== "update_profile") {
      const { data: assignment } = await supabase
        .from("agent_farmer_assignments")
        .select("id")
        .eq("agent_id", user.id)
        .eq("farmer_id", farmer_id)
        .eq("active", true)
        .single();
      if (!assignment) {
        return new Response(JSON.stringify({ error: "You are not assigned to this farmer" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const taskPayload: Record<string, unknown> = {
      agent_id: user.id,
      farmer_id,
      crop_id: crop_id || null,
      task_type,
      due_date: due_date || new Date().toISOString().split("T")[0],
      notes: notes || null,
      created_by: user.id,
      created_by_role: "agent",
    };

    if (task_type === "update_profile" && payload) {
      taskPayload.payload = payload;
      taskPayload.notes = notes || "Profile update requiring approval";
    }

    const { data: task, error } = await supabase.from("agent_tasks").insert(taskPayload).select().single();
    if (error) throw error;

    await supabase.from("agent_activity_logs").insert({
      actor_id: user.id,
      actor_role: "agent",
      farmer_id,
      action_type: task_type === "update_profile" ? "TASK_CREATED" : "TASK_CREATED",
      details: task_type === "update_profile" ? { task_type: "update_profile", proposed_changes: payload } : { task_type, task_id: task.id },
    });

    return new Response(JSON.stringify({ success: true, task }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("agent-create-task error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
