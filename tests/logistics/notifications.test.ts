/**
 * Notifications Tests — create, fetch, mark read
 */

import type { TestContext } from "../test-utils";

const MODULE = "Notifications";

function throwPg(error: unknown): never {
  if (error && typeof error === "object" && "message" in error) {
    throw new Error((error as { message: string }).message);
  }
  throw error;
}

export async function run(ctx: TestContext): Promise<void> {
  const logistics = ctx.userOf("logistics");
  let notificationId: string | null = null;

  // --- Create notification for logistics user ---
  try {
    const { data, error } = await ctx.adminClient
      .from("notifications")
      .insert({
        user_id: logistics.userId,
        title: `${ctx.demoTag}_logistics_notif`,
        message: "New transport request available near your area",
        type: "transport",
        is_read: false,
      })
      .select("id")
      .single();

    if (error) throwPg(error);
    notificationId = data.id;
    ctx.shared.notificationId = data.id;
    ctx.pass(MODULE, "Create notification");
  } catch (err) {
    ctx.fail(MODULE, "Create notification", err, "Check notifications table INSERT policy");
  }

  // --- Fetch notifications for logistics user ---
  try {
    const { data, error } = await ctx.adminClient
      .from("notifications")
      .select("id, title, message, type, is_read, created_at")
      .eq("user_id", logistics.userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throwPg(error);
    if (!data?.length) throw new Error("No notifications found for logistics user");

    const found = data.find((n: { id: string }) => n.id === notificationId);
    if (!found) throw new Error("Created notification not in fetch results");
    if (found.is_read !== false) throw new Error("New notification should be unread");

    ctx.pass(MODULE, "Fetch notifications");
  } catch (err) {
    ctx.fail(MODULE, "Fetch notifications", err, "Check notifications SELECT policy for user_id filter");
  }

  // --- Mark notification as read ---
  try {
    if (!notificationId) throw new Error("No notification ID from create step");

    const { error } = await ctx.adminClient
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (error) throwPg(error);

    // Verify read state
    const { data, error: verifyErr } = await ctx.adminClient
      .from("notifications")
      .select("is_read")
      .eq("id", notificationId)
      .single();

    if (verifyErr) throwPg(verifyErr);
    if (data.is_read !== true) throw new Error("Notification not marked as read after update");

    ctx.pass(MODULE, "Mark notification as read");
  } catch (err) {
    ctx.fail(MODULE, "Mark notification as read", err, "Check notifications UPDATE policy for is_read field");
  }
}
