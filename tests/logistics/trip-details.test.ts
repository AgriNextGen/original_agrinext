/**
 * Trip Detail Tests — detail with context, joined data, timeline, proof fields
 */

import type { TestContext } from "../test-utils";

const MODULE = "Trip Details";

function throwPg(error: unknown): never {
  if (error && typeof error === "object" && "message" in error) {
    throw new Error((error as { message: string }).message);
  }
  throw error;
}

export async function run(ctx: TestContext): Promise<void> {
  const logistics = ctx.userOf("logistics");
  const farmer = ctx.userOf("farmer");

  // --- Trip detail with joined farmer data ---
  try {
    if (!ctx.shared.tripId) throw new Error("No trip ID from upstream test");

    // Fetch trip with transport_request for farmer_id
    const { data: trip, error: tripErr } = await ctx.adminClient
      .from("trips")
      .select("id, transport_request_id, transporter_id, status")
      .eq("id", ctx.shared.tripId)
      .single();

    if (tripErr) throwPg(tripErr);
    if (!trip) throw new Error("Trip not found");

    // Fetch linked transport request with farmer info
    const { data: req, error: reqErr } = await ctx.adminClient
      .from("transport_requests")
      .select("id, farmer_id, quantity, quantity_unit, pickup_location, pickup_village")
      .eq("id", trip.transport_request_id)
      .single();

    if (reqErr) throwPg(reqErr);
    if (!req) throw new Error("Linked transport request not found");

    // Fetch farmer profile
    const { data: farmerProfile, error: farmerErr } = await ctx.adminClient
      .from("profiles")
      .select("id, full_name, village, district, phone")
      .eq("id", req.farmer_id)
      .single();

    if (farmerErr) throwPg(farmerErr);
    if (!farmerProfile) throw new Error("Farmer profile not found for trip");
    if (farmerProfile.id !== farmer.userId) throw new Error("Farmer ID mismatch in trip context");

    ctx.pass(MODULE, "Trip detail with farmer context");
  } catch (err) {
    ctx.fail(MODULE, "Trip detail with farmer context", err, "Check trip -> transport_request -> profile join path");
  }

  // --- Status events timeline ---
  try {
    if (!ctx.shared.tripId) throw new Error("No trip ID");

    const { data, error } = await ctx.adminClient
      .from("transport_status_events")
      .select("id, new_status, old_status, actor_id, actor_role, note, created_at")
      .eq("trip_id", ctx.shared.tripId)
      .order("created_at", { ascending: true });

    if (error) throwPg(error);
    if (!data?.length) throw new Error("No status events for trip");

    // Verify each event has required fields
    for (const event of data) {
      if (!event.new_status) throw new Error(`Event ${event.id} missing new_status`);
      if (!event.actor_id) throw new Error(`Event ${event.id} missing actor_id`);
      if (!event.actor_role) throw new Error(`Event ${event.id} missing actor_role`);
      if (!event.created_at) throw new Error(`Event ${event.id} missing created_at`);
    }

    // Verify timeline ordering
    for (let i = 1; i < data.length; i++) {
      const prev = new Date(data[i - 1].created_at).getTime();
      const curr = new Date(data[i].created_at).getTime();
      if (curr < prev) throw new Error("Status events not in chronological order");
    }

    ctx.pass(MODULE, "Status events timeline");
  } catch (err) {
    ctx.fail(MODULE, "Status events timeline", err, "Check transport_status_events ordering and completeness");
  }

  // --- Proof fields on trip ---
  try {
    if (!ctx.shared.tripId) throw new Error("No trip ID");

    // Set proof fields via admin
    const { error: updateErr } = await ctx.adminClient
      .from("trips")
      .update({
        pickup_proofs: ["proof/pickup_001.jpg"],
        delivery_proofs: ["proof/delivery_001.jpg"],
        updated_at: new Date().toISOString(),
      })
      .eq("id", ctx.shared.tripId);

    if (updateErr) throwPg(updateErr);

    // Verify proof fields
    const { data, error } = await ctx.adminClient
      .from("trips")
      .select("pickup_proofs, delivery_proofs")
      .eq("id", ctx.shared.tripId)
      .single();

    if (error) throwPg(error);
    if (!data.pickup_proofs || !Array.isArray(data.pickup_proofs)) {
      throw new Error("pickup_proofs not set or not array");
    }
    if (!data.delivery_proofs || !Array.isArray(data.delivery_proofs)) {
      throw new Error("delivery_proofs not set or not array");
    }
    if (data.pickup_proofs[0] !== "proof/pickup_001.jpg") {
      throw new Error(`Unexpected pickup proof value: ${data.pickup_proofs[0]}`);
    }
    if (data.delivery_proofs[0] !== "proof/delivery_001.jpg") {
      throw new Error(`Unexpected delivery proof value: ${data.delivery_proofs[0]}`);
    }

    ctx.pass(MODULE, "Proof fields on trip");
  } catch (err) {
    ctx.fail(MODULE, "Proof fields on trip", err, "Check trips pickup_proofs/delivery_proofs columns (JSONB array)");
  }
}
