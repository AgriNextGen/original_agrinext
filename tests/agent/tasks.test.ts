/**
 * Agent Tasks Tests — CRUD, status transitions, validation, RPC pagination
 */

import type { TestContext } from "../test-utils";

const MODULE = "Agent Tasks";

function throwPg(error: unknown): never {
  if (error && typeof error === "object" && "message" in error) {
    throw new Error((error as { message: string }).message);
  }
  throw error;
}

export async function run(ctx: TestContext): Promise<void> {
  const agent = ctx.userOf("agent");
  const farmer = ctx.userOf("farmer");
  const client = ctx.authedClient("agent");

  // --- Ensure assignment exists ---
  await ctx.adminClient
    .from("agent_farmer_assignments")
    .upsert(
      {
        agent_id: agent.userId,
        farmer_id: farmer.userId,
        active: true,
        demo_tag: ctx.demoTag,
        assigned_at: new Date().toISOString(),
      },
      { onConflict: "agent_id,farmer_id" },
    );

  // --- Tasks page: fetch agent's tasks ---
  try {
    const { data, error } = await client
      .from("agent_tasks")
      .select("id, task_status, task_type, farmer_id")
      .eq("agent_id", agent.userId);

    if (error) throwPg(error);
    ctx.pass(MODULE, "Fetch tasks list");
  } catch (err) {
    ctx.fail(MODULE, "Fetch tasks list", err, "Check RLS SELECT on agent_tasks for agent role");
  }

  // --- Create task via admin (seed) ---
  let seededTaskId: string | null = null;
  try {
    const { data, error } = await ctx.adminClient
      .from("agent_tasks")
      .insert({
        agent_id: agent.userId,
        farmer_id: farmer.userId,
        task_type: "verify_crop",
        task_status: "pending",
        notes: `agentchk_${ctx.demoTag}_task_crud`,
        demo_tag: ctx.demoTag,
      })
      .select("id")
      .single();

    if (error) throwPg(error);
    seededTaskId = data.id;
    ctx.pass(MODULE, "Seed task (admin)");
  } catch (err) {
    ctx.fail(MODULE, "Seed task (admin)", err, "Check agent_tasks INSERT schema");
  }

  // --- Agent reads seeded task ---
  try {
    if (!seededTaskId) throw new Error("No seeded task ID");

    const { data, error } = await client
      .from("agent_tasks")
      .select("id, task_status, task_type, farmer_id, notes")
      .eq("id", seededTaskId)
      .single();

    if (error) throwPg(error);
    if (!data) throw new Error("Task not found via agent client");

    if (data.task_status !== "pending") {
      throw new Error(`Expected task_status 'pending', got '${data.task_status}'`);
    }
    if (data.task_type !== "verify_crop") {
      throw new Error(`Expected task_type 'verify_crop', got '${data.task_type}'`);
    }

    ctx.pass(MODULE, "Read task details");
  } catch (err) {
    ctx.fail(MODULE, "Read task details", err, "Check RLS SELECT on agent_tasks — agent should see own tasks");
  }

  // --- Agent creates task directly ---
  let agentCreatedTaskId: string | null = null;
  try {
    const { data, error } = await client
      .from("agent_tasks")
      .insert({
        agent_id: agent.userId,
        farmer_id: farmer.userId,
        task_type: "harvest_check",
        task_status: "pending",
        notes: `agentchk_${ctx.demoTag}_agent_created`,
        demo_tag: ctx.demoTag,
      })
      .select("id")
      .single();

    if (error) throwPg(error);
    agentCreatedTaskId = data.id;
    ctx.pass(MODULE, "Agent creates task");
  } catch (err) {
    ctx.fail(MODULE, "Agent creates task", err, "Check RLS INSERT on agent_tasks — agent should be able to create tasks");
  }

  // --- Status transition: pending → in_progress ---
  try {
    if (!seededTaskId) throw new Error("No task ID for status update");

    const { error } = await client
      .from("agent_tasks")
      .update({ task_status: "in_progress" })
      .eq("id", seededTaskId)
      .eq("agent_id", agent.userId);

    if (error) throwPg(error);

    const { data: verify, error: verifyErr } = await client
      .from("agent_tasks")
      .select("task_status")
      .eq("id", seededTaskId)
      .single();

    if (verifyErr) throwPg(verifyErr);
    if (verify?.task_status !== "in_progress") {
      throw new Error(`Expected 'in_progress', got '${verify?.task_status}'`);
    }

    ctx.pass(MODULE, "Status: pending → in_progress");
  } catch (err) {
    ctx.fail(MODULE, "Status: pending → in_progress", err, "Check RLS UPDATE on agent_tasks — agent should update own task status");
  }

  // --- Status transition: in_progress → completed ---
  try {
    if (!seededTaskId) throw new Error("No task ID for completion");

    const { error } = await client
      .from("agent_tasks")
      .update({
        task_status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", seededTaskId)
      .eq("agent_id", agent.userId);

    if (error) throwPg(error);

    const { data: verify, error: verifyErr } = await client
      .from("agent_tasks")
      .select("task_status, completed_at")
      .eq("id", seededTaskId)
      .single();

    if (verifyErr) throwPg(verifyErr);
    if (verify?.task_status !== "completed") {
      throw new Error(`Expected 'completed', got '${verify?.task_status}'`);
    }

    ctx.pass(MODULE, "Status: in_progress → completed");
  } catch (err) {
    ctx.fail(MODULE, "Status: in_progress → completed", err, "Check agent_tasks UPDATE for completion");
  }

  // --- Filter tasks by status ---
  try {
    const { data: pending, error: pErr } = await client
      .from("agent_tasks")
      .select("id")
      .eq("agent_id", agent.userId)
      .eq("task_status", "pending")
      .eq("demo_tag", ctx.demoTag);

    if (pErr) throwPg(pErr);

    const { data: completed, error: cErr } = await client
      .from("agent_tasks")
      .select("id")
      .eq("agent_id", agent.userId)
      .eq("task_status", "completed")
      .eq("demo_tag", ctx.demoTag);

    if (cErr) throwPg(cErr);

    if (!completed?.length) {
      throw new Error("No completed tasks found after marking one completed");
    }

    ctx.pass(MODULE, "Filter tasks by status");
  } catch (err) {
    ctx.fail(MODULE, "Filter tasks by status", err, "Check that status filtering works on agent_tasks");
  }

  // --- RPC pagination: list_agent_tasks_compact_v1 ---
  try {
    const { data, error } = await client.rpc("list_agent_tasks_compact_v1", {
      p_agent_id: agent.userId,
      p_limit: 10,
      p_cursor: null,
    });

    if (error) throwPg(error);
    ctx.pass(MODULE, "Task RPC pagination");
  } catch (err) {
    ctx.fail(MODULE, "Task RPC pagination", err, "Check list_agent_tasks_compact_v1 RPC exists and accepts (p_agent_id, p_limit, p_cursor)");
  }
}
