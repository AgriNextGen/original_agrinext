/**
 * Agent Management Tests — admin visibility into agent profiles, assignments, tasks
 */

import type { TestContext } from "../test-utils";

const MODULE = "Agent Management";

function throwPg(error: unknown): never {
  if (error && typeof error === "object" && "message" in error) {
    throw new Error((error as { message: string }).message);
  }
  throw error;
}

export async function run(ctx: TestContext): Promise<void> {
  const agent = ctx.userOf("agent");
  const farmer = ctx.userOf("farmer");
  const client = ctx.authedClient("admin");

  // --- Seed agent assignment and task ---
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

  await ctx.adminClient
    .from("agent_tasks")
    .insert({
      agent_id: agent.userId,
      farmer_id: farmer.userId,
      task_type: "visit",
      task_status: "pending",
      notes: `adminchk_${ctx.demoTag}_agent_task`,
      demo_tag: ctx.demoTag,
    });

  // --- Admin can query agent profiles ---
  try {
    const { data: profiles, error: pErr } = await client
      .from("profiles")
      .select("id, full_name")
      .eq("demo_tag", ctx.demoTag);

    if (pErr) throwPg(pErr);

    const { data: roles, error: rErr } = await client
      .from("user_roles")
      .select("user_id, role")
      .eq("role", "agent");

    if (rErr) throwPg(rErr);

    const agentUserIds = new Set((roles ?? []).map((r: any) => r.user_id));
    const agentProfiles = (profiles ?? []).filter((p: any) => agentUserIds.has(p.id));

    if (!agentProfiles.length) throw new Error("No agent profiles found");

    ctx.pass(MODULE, "Query agent profiles");
  } catch (err) {
    ctx.fail(MODULE, "Query agent profiles", err, "Check admin read access to profiles + user_roles for agent filtering");
  }

  // --- Admin can view agent's assignments ---
  try {
    const { data, error } = await client
      .from("agent_farmer_assignments")
      .select("agent_id, farmer_id, active")
      .eq("agent_id", agent.userId)
      .eq("demo_tag", ctx.demoTag);

    if (error) throwPg(error);
    if (!data?.length) throw new Error("No assignments visible for agent");

    ctx.pass(MODULE, "View assignments");
  } catch (err) {
    ctx.fail(MODULE, "View assignments", err, "Check admin RLS read access to agent_farmer_assignments table");
  }

  // --- Admin can view agent's tasks ---
  try {
    const { data, error } = await client
      .from("agent_tasks")
      .select("id, notes, task_status, task_type")
      .eq("agent_id", agent.userId)
      .eq("demo_tag", ctx.demoTag);

    if (error) throwPg(error);
    if (!data?.length) throw new Error("No tasks visible for agent");

    ctx.pass(MODULE, "View tasks");
  } catch (err) {
    ctx.fail(MODULE, "View tasks", err, "Check admin RLS read access to agent_tasks table");
  }

  // --- Admin can view agent activity/visits ---
  try {
    const { error } = await client
      .from("agent_activity_logs")
      .select("id")
      .eq("agent_id", agent.userId)
      .limit(5);

    if (error) throwPg(error);
    ctx.pass(MODULE, "View activity logs");
  } catch (err) {
    ctx.fail(MODULE, "View activity logs", err, "Check admin RLS read access to agent_activity_logs table");
  }
}
