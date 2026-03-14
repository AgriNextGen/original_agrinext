/**
 * Buyer Management Tests — admin visibility into buyers, profiles, market_orders
 */

import type { TestContext } from "../test-utils";

const MODULE = "Buyer Management";

function throwPg(error: unknown): never {
  if (error && typeof error === "object" && "message" in error) {
    throw new Error((error as { message: string }).message);
  }
  throw error;
}

export async function run(ctx: TestContext): Promise<void> {
  const buyer = ctx.userOf("buyer");
  const farmer = ctx.userOf("farmer");
  const client = ctx.authedClient("admin");

  // --- Seed a market order if listing exists ---
  if (ctx.shared.listingId) {
    const { data: order, error: ordErr } = await ctx.adminClient
      .from("market_orders")
      .insert({
        buyer_id: buyer.userId,
        listing_id: ctx.shared.listingId,
        farmer_id: farmer.userId,
        quantity: 10,
        total_price: 250,
        status: "pending",
        demo_tag: ctx.demoTag,
      })
      .select("id")
      .single();

    if (!ordErr && order) ctx.shared.orderId = order.id;
  }

  // --- Admin can query buyers table ---
  try {
    const { data, error } = await client
      .from("buyers")
      .select("id, user_id, name, phone, district")
      .eq("demo_tag", ctx.demoTag);

    if (error) throwPg(error);
    if (!data?.length) throw new Error("No buyers visible");

    ctx.pass(MODULE, "Query buyers table");
  } catch (err) {
    ctx.fail(MODULE, "Query buyers table", err, "Check admin RLS read access to buyers table");
  }

  // --- Admin can view buyer profile ---
  try {
    const { data, error } = await client
      .from("profiles")
      .select("id, full_name, phone, district")
      .eq("id", buyer.userId)
      .single();

    if (error) throwPg(error);
    if (!data) throw new Error("Buyer profile not found");

    ctx.pass(MODULE, "View buyer profile");
  } catch (err) {
    ctx.fail(MODULE, "View buyer profile", err, "Check admin RLS read access to profiles for buyer user");
  }

  // --- Admin can view buyer's orders ---
  try {
    const { data, error } = await client
      .from("market_orders")
      .select("id, status, buyer_id, quantity, total_price")
      .eq("buyer_id", buyer.userId)
      .eq("demo_tag", ctx.demoTag);

    if (error) throwPg(error);

    if (ctx.shared.orderId && (!data || data.length === 0)) {
      throw new Error("Seeded order not visible to admin");
    }

    ctx.pass(MODULE, "View buyer orders");
  } catch (err) {
    ctx.fail(MODULE, "View buyer orders", err, "Check admin RLS read access to market_orders table");
  }
}
