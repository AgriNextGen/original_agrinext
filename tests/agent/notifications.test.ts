/**
 * Agent Notifications Tests — CRUD, mark-read, empty/error states, cross-user isolation
 */

import type { TestContext } from "../test-utils";

const MODULE = "Agent Notifications";

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

  // --- Create notification for agent via admin ---
  let notifId: string | null = null;
  try {
    const { data, error } = await ctx.adminClient
      .from("notifications")
      .insert({
        user_id: agent.userId,
        title: `agentchk_${ctx.demoTag}_notif`,
        message: "Test notification for agent validation",
        type: "task",
        is_read: false,
      })
      .select("id")
      .single();

    if (error) throwPg(error);
    notifId = data.id;
    ctx.pass(MODULE, "Create notification");
  } catch (err) {
    ctx.fail(MODULE, "Create notification", err, "Check notifications table schema and INSERT via admin");
  }

  // --- Agent reads own notifications ---
  try {
    const { data, error } = await client
      .from("notifications")
      .select("id, title, message, type, is_read, user_id")
      .eq("user_id", agent.userId)
      .order("created_at", { ascending: false });

    if (error) throwPg(error);
    if (!data?.length) throw new Error("No notifications returned for agent");

    const found = data.some((n: any) => n.id === notifId);
    if (!found) throw new Error("Seeded notification not found in agent's list");

    ctx.pass(MODULE, "Read notifications");
  } catch (err) {
    ctx.fail(MODULE, "Read notifications", err, "Check RLS SELECT on notifications — agent should see own notifications");
  }

  // --- Mark notification as read ---
  try {
    if (!notifId) throw new Error("No notification ID from previous step");

    const { error } = await client
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notifId)
      .eq("user_id", agent.userId);

    if (error) throwPg(error);

    const { data: verify, error: vErr } = await client
      .from("notifications")
      .select("is_read")
      .eq("id", notifId)
      .single();

    if (vErr) throwPg(vErr);
    if (!verify?.is_read) {
      throw new Error("Notification still unread after update");
    }

    ctx.pass(MODULE, "Mark as read");
  } catch (err) {
    ctx.fail(MODULE, "Mark as read", err, "Check RLS UPDATE on notifications — agent should be able to mark own notifications read");
  }

  // --- Agent CANNOT see farmer's notifications ---
  try {
    await ctx.adminClient.from("notifications").insert({
      user_id: farmer.userId,
      title: `agentchk_${ctx.demoTag}_farmer_notif`,
      message: "Notification for farmer only",
      type: "info",
      is_read: false,
    });

    const { data, error } = await client
      .from("notifications")
      .select("id")
      .eq("user_id", farmer.userId);

    if (error) throwPg(error);

    if (data && data.length > 0) {
      throw new Error(`Agent can see farmer's notifications (${data.length} rows)`);
    }

    ctx.pass(MODULE, "Cross-user isolation");
  } catch (err) {
    ctx.fail(MODULE, "Cross-user isolation", err, "Check RLS on notifications — agent should NOT see other users' notifications");
  }

  // --- Empty state: no notifications for non-matching filter ---
  try {
    const { data, error } = await client
      .from("notifications")
      .select("id")
      .eq("user_id", agent.userId)
      .eq("type", "nonexistent_type_xyz");

    if (error) throwPg(error);

    if (data && data.length > 0) {
      throw new Error(`Expected 0 rows for non-matching type, got ${data.length}`);
    }

    ctx.pass(MODULE, "Empty state");
  } catch (err) {
    ctx.fail(MODULE, "Empty state", err, "Empty filter query should return 0 rows without error");
  }
}
