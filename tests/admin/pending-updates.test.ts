/**
 * Pending Updates Moderation Tests — fetch, approve, reject
 */

import type { TestContext } from "../test-utils";

const MODULE = "Pending Updates";

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
  let approveTaskId: string | undefined;
  let rejectTaskId: string | undefined;

  // --- Admin can call pending updates RPC ---
  try {
    const { data, error } = await client.rpc("get_pending_updates_v1" as any);

    if (error) throwPg(error);
    ctx.pass(MODULE, "Pending updates RPC");
  } catch (err) {
    ctx.fail(MODULE, "Pending updates RPC", err, "Check get_pending_updates_v1 RPC exists and admin has EXECUTE permission");
  }

  // --- Seed pending update tasks ---
  try {
    const { data: approveTask, error: atErr } = await ctx.adminClient
      .from("agent_tasks")
      .insert({
        agent_id: agent.userId,
        farmer_id: farmer.userId,
        task_type: "update",
        task_status: "pending",
        notes: `adminchk_${ctx.demoTag}_approve_update`,
        demo_tag: ctx.demoTag,
      })
      .select("id")
      .single();

    if (atErr) throwPg(atErr);
    approveTaskId = approveTask?.id;

    const { data: rejectTask, error: rtErr } = await ctx.adminClient
      .from("agent_tasks")
      .insert({
        agent_id: agent.userId,
        farmer_id: farmer.userId,
        task_type: "update",
        task_status: "pending",
        notes: `adminchk_${ctx.demoTag}_reject_update`,
        demo_tag: ctx.demoTag,
      })
      .select("id")
      .single();

    if (rtErr) throwPg(rtErr);
    rejectTaskId = rejectTask?.id;

    ctx.pass(MODULE, "Seed pending updates");
  } catch (err) {
    ctx.fail(MODULE, "Seed pending updates", err, "Check agent_tasks insert with task_type=update");
  }

  // --- Approve a pending update ---
  try {
    if (!approveTaskId) throw new Error("No approve task seeded");

    const { error } = await ctx.adminClient
      .from("agent_tasks")
      .update({ task_status: "approved", updated_at: new Date().toISOString() })
      .eq("id", approveTaskId);

    if (error) throwPg(error);

    const { data: verified, error: verErr } = await ctx.adminClient
      .from("agent_tasks")
      .select("task_status")
      .eq("id", approveTaskId)
      .single();

    if (verErr) throwPg(verErr);
    if (verified?.task_status !== "approved") {
      throw new Error(`Expected 'approved', got '${verified?.task_status}'`);
    }

    ctx.pass(MODULE, "Approve update");
  } catch (err) {
    ctx.fail(MODULE, "Approve update", err, "Check admin can update agent_tasks status to 'approved'");
  }

  // --- Reject a pending update ---
  try {
    if (!rejectTaskId) throw new Error("No reject task seeded");

    const { error } = await ctx.adminClient
      .from("agent_tasks")
      .update({ task_status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", rejectTaskId);

    if (error) throwPg(error);

    const { data: verified, error: verErr } = await ctx.adminClient
      .from("agent_tasks")
      .select("task_status")
      .eq("id", rejectTaskId)
      .single();

    if (verErr) throwPg(verErr);
    if (verified?.task_status !== "rejected") {
      throw new Error(`Expected 'rejected', got '${verified?.task_status}'`);
    }

    ctx.pass(MODULE, "Reject update");
  } catch (err) {
    ctx.fail(MODULE, "Reject update", err, "Check admin can update agent_tasks status to 'rejected'");
  }

  // --- Cleanup seeded tasks ---
  for (const id of [approveTaskId, rejectTaskId]) {
    if (id) {
      await ctx.adminClient
        .from("agent_tasks")
        .delete()
        .eq("id", id)
        .then(({ error }) => {
          if (error) console.log(`    warn: cleanup task ${id}: ${error.message}`);
        });
    }
  }
}
