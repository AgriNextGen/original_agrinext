/**
 * Completed Trips Tests — fetch completed trips, data integrity, detail access
 */

import type { TestContext } from "../test-utils";

const MODULE = "Completed Trips";

function throwPg(error: unknown): never {
  if (error && typeof error === "object" && "message" in error) {
    throw new Error((error as { message: string }).message);
  }
  throw error;
}

export async function run(ctx: TestContext): Promise<void> {
  const logistics = ctx.userOf("logistics");

  // --- Fetch completed trips (delivered/completed status) ---
  try {
    const { data, error } = await ctx.adminClient
      .from("trips")
      .select("id, status, transporter_id, delivered_at, actual_weight_kg")
      .eq("transporter_id", logistics.userId)
      .eq("demo_tag", ctx.demoTag)
      .in("status", ["delivered", "completed"]);

    if (error) throwPg(error);
    if (!data?.length) throw new Error("No completed trips found — trip lifecycle may not have completed");

    ctx.pass(MODULE, "Fetch completed trips");
  } catch (err) {
    ctx.fail(MODULE, "Fetch completed trips", err, "Check trips SELECT with IN filter for delivered/completed statuses");
  }

  // --- Verify completed trip data integrity ---
  try {
    if (!ctx.shared.tripId) throw new Error("No trip ID from upstream test");

    const { data, error } = await ctx.adminClient
      .from("trips")
      .select(`
        id, status, transporter_id, transport_request_id,
        assigned_at, picked_up_at, en_route_at, delivered_at,
        actual_weight_kg
      `)
      .eq("id", ctx.shared.tripId)
      .single();

    if (error) throwPg(error);
    if (!data) throw new Error("Trip data returned null");

    // All timestamp fields should be populated for a delivered trip
    if (!data.assigned_at) throw new Error("assigned_at missing on delivered trip");
    if (!data.picked_up_at) throw new Error("picked_up_at missing on delivered trip");
    if (!data.en_route_at) throw new Error("en_route_at missing on delivered trip");
    if (!data.delivered_at) throw new Error("delivered_at missing on delivered trip");
    if (data.actual_weight_kg == null) throw new Error("actual_weight_kg missing on delivered trip");

    // Chronological order: accepted <= pickup_done <= in_transit <= delivered
    const ts = [data.assigned_at, data.picked_up_at, data.en_route_at, data.delivered_at]
      .map((t: string) => new Date(t).getTime());
    for (let i = 1; i < ts.length; i++) {
      if (ts[i] < ts[i - 1]) {
        throw new Error("Timestamps not in chronological order");
      }
    }

    ctx.pass(MODULE, "Completed trip data integrity");
  } catch (err) {
    ctx.fail(MODULE, "Completed trip data integrity", err, "Check trip lifecycle timestamp population");
  }

  // --- Completed trip detail is accessible ---
  try {
    if (!ctx.shared.tripId) throw new Error("No trip ID");

    const { data, error } = await ctx.adminClient
      .from("trips")
      .select("id, status, transport_request_id")
      .eq("id", ctx.shared.tripId)
      .single();

    if (error) throwPg(error);
    if (!data) throw new Error("Could not access completed trip detail");

    // Verify linked transport request is also accessible
    const { data: reqData, error: reqErr } = await ctx.adminClient
      .from("transport_requests")
      .select("id, farmer_id, quantity")
      .eq("id", data.transport_request_id)
      .single();

    if (reqErr) throwPg(reqErr);
    if (!reqData) throw new Error("Linked transport request not accessible");

    ctx.pass(MODULE, "Completed trip detail accessible");
  } catch (err) {
    ctx.fail(MODULE, "Completed trip detail accessible", err, "Check trip + transport_request join access after completion");
  }
}
