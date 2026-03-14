/**
 * Agent Dashboard Tests — RPC stats, KPI data, empty/loading/error states
 */

import type { TestContext } from "../test-utils";

const MODULE = "Agent Dashboard";

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

  // --- Dashboard RPC returns valid shape (before seeding) ---
  try {
    const { data, error } = await client.rpc("agent_dashboard_v1");

    if (error) throwPg(error);

    const row = Array.isArray(data) ? data[0] : data;
    if (!row && data !== null) {
      throw new Error("agent_dashboard_v1 returned unexpected shape");
    }

    ctx.pass(MODULE, "Dashboard RPC callable");
  } catch (err) {
    ctx.fail(MODULE, "Dashboard RPC callable", err, "Check agent_dashboard_v1 RPC exists and is accessible to agent role");
  }

  // --- Dashboard empty state (no seeded data yet — counts should be 0) ---
  try {
    const { data, error } = await client.rpc("agent_dashboard_v1");

    if (error) throwPg(error);

    const row = Array.isArray(data) ? data[0] : data;
    if (row) {
      const assignedFarmers = row.assigned_farmers ?? row.farmer_count ?? 0;
      const pendingTasks = row.pending_tasks ?? row.task_count ?? 0;

      if (typeof assignedFarmers !== "number" || typeof pendingTasks !== "number") {
        throw new Error(`Unexpected count types: farmers=${typeof assignedFarmers}, tasks=${typeof pendingTasks}`);
      }
    }

    ctx.pass(MODULE, "Dashboard empty state");
  } catch (err) {
    ctx.fail(MODULE, "Dashboard empty state", err, "Check that agent_dashboard_v1 returns numeric counts even when no data exists");
  }

  // --- Seed assignment and verify dashboard reflects it ---
  try {
    const { error: seedErr } = await ctx.adminClient
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

    if (seedErr) throwPg(seedErr);

    const { data, error } = await client.rpc("agent_dashboard_v1");
    if (error) throwPg(error);

    const row = Array.isArray(data) ? data[0] : data;
    const assignedFarmers = row?.assigned_farmers ?? row?.farmer_count ?? 0;

    if (assignedFarmers < 1) {
      throw new Error(`Expected at least 1 assigned farmer, got ${assignedFarmers}`);
    }

    ctx.pass(MODULE, "Dashboard reflects assignment");
  } catch (err) {
    ctx.fail(MODULE, "Dashboard reflects assignment", err, "Check agent_dashboard_v1 counts after seeding an assignment");
  }

  // --- Seed a task and verify task count ---
  try {
    const { error: taskErr } = await ctx.adminClient
      .from("agent_tasks")
      .insert({
        agent_id: agent.userId,
        farmer_id: farmer.userId,
        task_type: "visit",
        task_status: "pending",
        notes: `agentchk_${ctx.demoTag}_dash_task`,
        demo_tag: ctx.demoTag,
      });

    if (taskErr) throwPg(taskErr);

    const { data, error } = await client.rpc("agent_dashboard_v1");
    if (error) throwPg(error);

    const row = Array.isArray(data) ? data[0] : data;
    const pendingTasks = row?.pending_tasks ?? row?.task_count ?? 0;

    if (pendingTasks < 1) {
      throw new Error(`Expected at least 1 pending task, got ${pendingTasks}`);
    }

    ctx.pass(MODULE, "Dashboard reflects tasks");
  } catch (err) {
    ctx.fail(MODULE, "Dashboard reflects tasks", err, "Check agent_dashboard_v1 task counts after seeding a task");
  }

  // --- Agent can query own tasks directly ---
  try {
    const { data, error } = await client
      .from("agent_tasks")
      .select("id, task_status, task_type")
      .eq("agent_id", agent.userId)
      .eq("demo_tag", ctx.demoTag);

    if (error) throwPg(error);
    if (!data?.length) throw new Error("No tasks found via direct query");

    ctx.pass(MODULE, "Direct task query");
  } catch (err) {
    ctx.fail(MODULE, "Direct task query", err, "Check RLS SELECT policy on agent_tasks for agent role");
  }
}
