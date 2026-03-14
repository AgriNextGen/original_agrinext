/**
 * Buyer Tests — browse listings, view detail, create order, fetch orders
 */

import type { TestContext } from "./test-utils";

const MODULE = "Buyer Marketplace";

function throwPg(error: unknown): never {
  if (error && typeof error === "object" && "message" in error) {
    throw new Error((error as { message: string }).message);
  }
  throw error;
}

export async function run(ctx: TestContext): Promise<void> {
  const buyer = ctx.userOf("buyer");
  const farmer = ctx.userOf("farmer");
  const client = ctx.authedClient("buyer");

  // --- Browse listings (buyer can see active/approved listings) ---
  try {
    const { data, error } = await client
      .from("listings")
      .select("id, title, status")
      .eq("is_active", true)
      .limit(10);

    if (error) throwPg(error);
    ctx.pass(MODULE, "Browse listings");
  } catch (err) {
    ctx.fail(MODULE, "Browse listings", err, "Check RLS SELECT policy on listings for buyer role");
  }

  // --- View listing detail ---
  try {
    if (!ctx.shared.listingId) throw new Error("No listing ID from farmer tests");

    const { data, error } = await client
      .from("listings")
      .select("id, title, category, price, quantity, unit, status, location")
      .eq("id", ctx.shared.listingId)
      .single();

    if (error) throwPg(error);
    if (!data?.id) throw new Error("Listing detail returned no data");
    ctx.pass(MODULE, "View listing detail");
  } catch (err) {
    ctx.fail(MODULE, "View listing detail", err, "Check RLS SELECT policy on listings for buyer role");
  }

  // --- Create order (via adminClient — market_orders writes are RPC-guarded) ---
  try {
    const { data, error } = await ctx.adminClient
      .from("market_orders")
      .insert({
        buyer_id: buyer.userId,
        farmer_id: farmer.userId,
        listing_id: ctx.shared.listingId,
        quantity: 10,
        price_agreed: 25,
        status: "placed",
        demo_tag: ctx.demoTag,
      })
      .select("id")
      .single();

    if (error) throwPg(error);
    ctx.shared.orderId = data.id;
    ctx.pass(MODULE, "Create order");
  } catch (err) {
    ctx.fail(MODULE, "Create order", err, "Check market_orders table schema and permissions");
  }

  // --- Fetch buyer orders ---
  try {
    const { data, error } = await client
      .from("market_orders")
      .select("id, status, buyer_id, listing_id")
      .eq("buyer_id", buyer.userId)
      .eq("demo_tag", ctx.demoTag);

    if (error) throwPg(error);
    if (!data?.length) throw new Error("Order history returned empty");
    ctx.pass(MODULE, "Fetch orders");
  } catch (err) {
    ctx.fail(MODULE, "Fetch orders", err, "Check RLS SELECT policy on market_orders for buyer role");
  }

  // --- Verify order data integrity ---
  try {
    if (!ctx.shared.orderId) throw new Error("No order ID from previous step");

    const { data, error } = await client
      .from("market_orders")
      .select("id, buyer_id, listing_id")
      .eq("id", ctx.shared.orderId)
      .single();

    if (error) throwPg(error);
    if (data.buyer_id !== buyer.userId) {
      throw new Error(`buyer_id mismatch: expected ${buyer.userId}, got ${data.buyer_id}`);
    }
    if (ctx.shared.listingId && data.listing_id !== ctx.shared.listingId) {
      throw new Error(`listing_id mismatch: expected ${ctx.shared.listingId}, got ${data.listing_id}`);
    }
    ctx.pass(MODULE, "Order data integrity");
  } catch (err) {
    ctx.fail(MODULE, "Order data integrity", err, "Check that market_orders foreign keys are correct");
  }
}
