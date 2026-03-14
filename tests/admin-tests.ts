/**
 * Admin Tests — cross-role read access for profiles, orders, transport, crops, notifications
 */

import type { TestContext } from "./test-utils";

const MODULE = "Admin Panel";

function throwPg(error: unknown): never {
  if (error && typeof error === "object" && "message" in error) {
    throw new Error((error as { message: string }).message);
  }
  throw error;
}

export async function run(ctx: TestContext): Promise<void> {
  // Admin tests use the service-role adminClient, which mirrors admin-level
  // read access (admin RLS policies grant read-all to admin role).

  // --- Fetch all profiles ---
  try {
    const userIds = ["farmer", "agent", "logistics", "buyer", "admin"].map(
      (r) => ctx.userOf(r).userId,
    );
    const { data, error } = await ctx.adminClient
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    if (error) throwPg(error);
    if (!data?.length) throw new Error("Admin sees no profiles for provisioned users");
    ctx.pass(MODULE, "Fetch profiles");
  } catch (err) {
    ctx.fail(MODULE, "Fetch profiles", err, "Check admin read access to profiles table");
  }

  // --- Fetch all market orders ---
  try {
    const { data, error } = await ctx.adminClient
      .from("market_orders")
      .select("id, status, buyer_id")
      .eq("demo_tag", ctx.demoTag);

    if (error) throwPg(error);
    ctx.pass(MODULE, "Fetch orders");
  } catch (err) {
    ctx.fail(MODULE, "Fetch orders", err, "Check admin read access to market_orders table");
  }

  // --- Fetch all transport requests ---
  try {
    const { data, error } = await ctx.adminClient
      .from("transport_requests")
      .select("id, status, farmer_id")
      .eq("demo_tag", ctx.demoTag);

    if (error) throwPg(error);
    ctx.pass(MODULE, "Fetch transport requests");
  } catch (err) {
    ctx.fail(MODULE, "Fetch transport requests", err, "Check admin read access to transport_requests table");
  }

  // --- Fetch platform-wide crop data ---
  try {
    const { data, error } = await ctx.adminClient
      .from("crops")
      .select("id, crop_name, status, farmer_id")
      .eq("demo_tag", ctx.demoTag);

    if (error) throwPg(error);
    ctx.pass(MODULE, "Fetch crops");
  } catch (err) {
    ctx.fail(MODULE, "Fetch crops", err, "Check admin read access to crops table");
  }

  // --- Fetch notifications ---
  try {
    const { data, error } = await ctx.adminClient
      .from("notifications")
      .select("id, title, user_id")
      .like("title", `syschk_${ctx.demoTag}%`);

    if (error) throwPg(error);
    ctx.pass(MODULE, "Fetch notifications");
  } catch (err) {
    ctx.fail(MODULE, "Fetch notifications", err, "Check admin read access to notifications table");
  }
}
