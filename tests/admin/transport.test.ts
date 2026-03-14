/**
 * Transport Coordination Tests — admin visibility into transport requests, trips, status updates
 */

import type { TestContext } from "../test-utils";

const MODULE = "Transport Coordination";

function throwPg(error: unknown): never {
  if (error && typeof error === "object" && "message" in error) {
    throw new Error((error as { message: string }).message);
  }
  throw error;
}

export async function run(ctx: TestContext): Promise<void> {
  const farmer = ctx.userOf("farmer");
  const logistics = ctx.userOf("logistics");
  const client = ctx.authedClient("admin");

  // --- Seed transport request if not present ---
  if (!ctx.shared.transportRequestId) {
    const { data: tr, error: trErr } = await ctx.adminClient
      .from("transport_requests")
      .insert({
        farmer_id: farmer.userId,
        pickup_location: "AdminCheck Village, Mysuru",
        pickup_village: "AdminCheck Village",
        quantity: 100,
        quantity_unit: "kg",
        status: "requested",
        demo_tag: ctx.demoTag,
      })
      .select("id")
      .single();

    if (!trErr && tr) ctx.shared.transportRequestId = tr.id;
  }

  // --- Seed a trip ---
  if (ctx.shared.transportRequestId && !ctx.shared.tripId) {
    const { data: trip, error: tripErr } = await ctx.adminClient
      .from("trips")
      .insert({
        transport_request_id: ctx.shared.transportRequestId,
        transporter_id: logistics.userId,
        status: "accepted",
        demo_tag: ctx.demoTag,
      })
      .select("id")
      .single();

    if (!tripErr && trip) ctx.shared.tripId = trip.id;
  }

  // --- Admin can fetch all transport requests ---
  try {
    const { data, error } = await client
      .from("transport_requests")
      .select("id, status, farmer_id, pickup_location")
      .eq("demo_tag", ctx.demoTag);

    if (error) throwPg(error);
    if (!data?.length) throw new Error("No transport requests visible");

    ctx.pass(MODULE, "Fetch transport requests");
  } catch (err) {
    ctx.fail(MODULE, "Fetch transport requests", err, "Check admin RLS read access to transport_requests table");
  }

  // --- Admin can view trips ---
  try {
    const { data, error } = await client
      .from("trips")
      .select("id, status, transporter_id, transport_request_id")
      .eq("demo_tag", ctx.demoTag);

    if (error) throwPg(error);

    if (ctx.shared.tripId && (!data || data.length === 0)) {
      throw new Error("Seeded trip not visible to admin");
    }

    ctx.pass(MODULE, "View trips");
  } catch (err) {
    ctx.fail(MODULE, "View trips", err, "Check admin RLS read access to trips table");
  }

  // --- Admin can update transport request status ---
  try {
    if (!ctx.shared.transportRequestId) throw new Error("No transport request seeded");

    const { error } = await ctx.adminClient
      .from("transport_requests")
      .update({ status: "assigned", updated_at: new Date().toISOString() })
      .eq("id", ctx.shared.transportRequestId);

    if (error) throwPg(error);

    const { data: updated, error: verErr } = await client
      .from("transport_requests")
      .select("status")
      .eq("id", ctx.shared.transportRequestId)
      .single();

    if (verErr) throwPg(verErr);
    if (updated?.status !== "assigned") {
      throw new Error(`Expected status 'assigned', got '${updated?.status}'`);
    }

    ctx.pass(MODULE, "Update transport status");
  } catch (err) {
    ctx.fail(MODULE, "Update transport status", err, "Check admin write access to transport_requests status column");
  }

  // --- Trip linked to transport request ---
  try {
    if (!ctx.shared.tripId || !ctx.shared.transportRequestId) {
      throw new Error("No trip/transport seeded — skipping link check");
    }

    const { data: trip, error } = await client
      .from("trips")
      .select("id, transport_request_id, transporter_id, status")
      .eq("id", ctx.shared.tripId)
      .single();

    if (error) throwPg(error);
    if (!trip) throw new Error("Trip not found");

    if (trip.transport_request_id !== ctx.shared.transportRequestId) {
      throw new Error("Trip transport_request_id does not match seeded request");
    }

    ctx.pass(MODULE, "Trip-request link");
  } catch (err) {
    ctx.fail(MODULE, "Trip-request link", err, "Check trips.transport_request_id FK and admin read access");
  }
}
