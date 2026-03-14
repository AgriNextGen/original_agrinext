/**
 * Agent Tests — farmer assignments, tasks/notifications CRUD
 */

import type { TestContext } from "./test-utils";

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

  // --- Create agent-farmer assignment ---
  try {
    const { error } = await ctx.adminClient
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

    if (error) throwPg(error);
    ctx.shared.assignmentFarmerId = farmer.userId;
    ctx.pass(MODULE, "Create assignment");
  } catch (err) {
    ctx.fail(MODULE, "Create assignment", err, "Check agent_farmer_assignments table schema and upsert constraints");
  }

  // --- Fetch assigned farmers ---
  try {
    const { data, error } = await client
      .from("agent_farmer_assignments")
      .select("agent_id, farmer_id, active")
      .eq("agent_id", agent.userId)
      .eq("demo_tag", ctx.demoTag);

    if (error) throwPg(error);
    if (!data?.length) throw new Error("No assignments found for agent");
    ctx.pass(MODULE, "Fetch assigned farmers");
  } catch (err) {
    ctx.fail(MODULE, "Fetch assigned farmers", err, "Check RLS SELECT policy on agent_farmer_assignments");
  }

  // --- Create notification (task) for agent ---
  try {
    const notifTitle = `syschk_${ctx.demoTag}_task`;
    const { data, error } = await ctx.adminClient
      .from("notifications")
      .insert({
        user_id: agent.userId,
        title: notifTitle,
        message: "Verify farmer farmland for system check",
        type: "task",
        is_read: false,
      })
      .select("id")
      .single();

    if (error) throwPg(error);
    ctx.shared.notificationId = data.id;
    ctx.pass(MODULE, "Create notification");
  } catch (err) {
    ctx.fail(MODULE, "Create notification", err, "Check notifications table schema");
  }

  // --- Update notification (mark read) ---
  try {
    if (!ctx.shared.notificationId) throw new Error("No notification ID from previous step");

    const { error } = await ctx.adminClient
      .from("notifications")
      .update({ is_read: true })
      .eq("id", ctx.shared.notificationId);

    if (error) throwPg(error);
    ctx.pass(MODULE, "Update notification");
  } catch (err) {
    ctx.fail(MODULE, "Update notification", err, "Check notifications UPDATE policy");
  }
}
