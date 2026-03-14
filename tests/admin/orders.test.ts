/**
 * Order Management Tests — admin fetch, details, status update, associations
 */

import type { TestContext } from "../test-utils";

const MODULE = "Order Management";

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

  // --- Seed order if not already present ---
  if (!ctx.shared.orderId && ctx.shared.listingId) {
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

  // --- Admin can fetch all market_orders ---
  try {
    const { data, error } = await client
      .from("market_orders")
      .select("id, status, buyer_id, farmer_id, quantity, total_price")
      .eq("demo_tag", ctx.demoTag);

    if (error) throwPg(error);

    ctx.pass(MODULE, "Fetch orders");
  } catch (err) {
    ctx.fail(MODULE, "Fetch orders", err, "Check admin RLS read access to market_orders table");
  }

  // --- Order details shape ---
  try {
    if (!ctx.shared.orderId) throw new Error("No order seeded — skipping detail check");

    const { data, error } = await client
      .from("market_orders")
      .select("id, status, buyer_id, farmer_id, listing_id, quantity, total_price, created_at")
      .eq("id", ctx.shared.orderId)
      .single();

    if (error) throwPg(error);
    if (!data) throw new Error("Order not found by ID");

    const requiredFields = ["id", "status", "buyer_id", "quantity", "total_price"];
    for (const field of requiredFields) {
      if ((data as any)[field] === undefined) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    ctx.pass(MODULE, "Order details");
  } catch (err) {
    ctx.fail(MODULE, "Order details", err, "Check market_orders schema and admin read access");
  }

  // --- Admin can update order status ---
  try {
    if (!ctx.shared.orderId) throw new Error("No order seeded — skipping status update");

    const { error } = await ctx.adminClient
      .from("market_orders")
      .update({ status: "confirmed", updated_at: new Date().toISOString() })
      .eq("id", ctx.shared.orderId);

    if (error) throwPg(error);

    const { data: updated, error: verErr } = await client
      .from("market_orders")
      .select("status")
      .eq("id", ctx.shared.orderId)
      .single();

    if (verErr) throwPg(verErr);
    if (updated?.status !== "confirmed") {
      throw new Error(`Expected status 'confirmed', got '${updated?.status}'`);
    }

    ctx.pass(MODULE, "Update order status");
  } catch (err) {
    ctx.fail(MODULE, "Update order status", err, "Check admin write access to market_orders status column");
  }

  // --- Navigate to associated buyer/farmer ---
  try {
    if (!ctx.shared.orderId) throw new Error("No order seeded — skipping association check");

    const { data: order, error: ordErr } = await client
      .from("market_orders")
      .select("buyer_id, farmer_id")
      .eq("id", ctx.shared.orderId)
      .single();

    if (ordErr) throwPg(ordErr);
    if (!order) throw new Error("Order not found");

    const { data: buyerProfile, error: bErr } = await client
      .from("profiles")
      .select("id, full_name")
      .eq("id", order.buyer_id)
      .single();

    if (bErr) throwPg(bErr);
    if (!buyerProfile) throw new Error("Buyer profile not found via order association");

    const { data: farmerProfile, error: fErr } = await client
      .from("profiles")
      .select("id, full_name")
      .eq("id", order.farmer_id)
      .single();

    if (fErr) throwPg(fErr);
    if (!farmerProfile) throw new Error("Farmer profile not found via order association");

    ctx.pass(MODULE, "Order associations");
  } catch (err) {
    ctx.fail(MODULE, "Order associations", err, "Check admin can join market_orders to profiles via buyer_id/farmer_id");
  }
}
