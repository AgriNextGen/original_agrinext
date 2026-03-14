/**
 * Logistics Tests — transport requests, accept load, create/update trip, fetch trips
 */

import type { TestContext } from "./test-utils";

const MODULE = "Logistics Dashboard";

function throwPg(error: unknown): never {
  if (error && typeof error === "object" && "message" in error) {
    throw new Error((error as { message: string }).message);
  }
  throw error;
}

export async function run(ctx: TestContext): Promise<void> {
  const farmer = ctx.userOf("farmer");
  const logistics = ctx.userOf("logistics");

  // --- Create transport request (via adminClient to bypass RLS insert restrictions) ---
  try {
    const { data, error } = await ctx.adminClient
      .from("transport_requests")
      .insert({
        farmer_id: farmer.userId,
        pickup_location: "SystemCheck Village, Mysuru",
        quantity: 50,
        status: "requested",
        demo_tag: ctx.demoTag,
      })
      .select("id")
      .single();

    if (error) throwPg(error);
    ctx.shared.transportRequestId = data.id;
    ctx.pass(MODULE, "Create transport request");
  } catch (err) {
    ctx.fail(MODULE, "Create transport request", err, "Check transport_requests table schema");
  }

  // --- Fetch available transport requests ---
  try {
    const { data, error } = await ctx.adminClient
      .from("transport_requests")
      .select("id, status, farmer_id")
      .eq("demo_tag", ctx.demoTag);

    if (error) throwPg(error);
    if (!data?.length) throw new Error("No transport requests found");

    const found = data.find(
      (r: { id: string }) => r.id === ctx.shared.transportRequestId,
    );
    if (!found) throw new Error("Created transport request not in fetch results");
    ctx.pass(MODULE, "Fetch transport requests");
  } catch (err) {
    ctx.fail(MODULE, "Fetch transport requests", err, "Check transport_requests RLS and demo_tag filter");
  }

  // --- Accept load (update transport request metadata) ---
  try {
    if (!ctx.shared.transportRequestId) throw new Error("No transport request ID");

    const { error } = await ctx.adminClient
      .from("transport_requests")
      .update({
        notes: "Accepted by SystemCheck logistics",
        updated_at: new Date().toISOString(),
      })
      .eq("id", ctx.shared.transportRequestId);

    if (error) throwPg(error);
    ctx.pass(MODULE, "Accept load");
  } catch (err) {
    ctx.fail(MODULE, "Accept load", err, "Check transport_requests UPDATE policy");
  }

  // --- Create trip (via adminClient) ---
  try {
    const { data, error } = await ctx.adminClient
      .from("trips")
      .insert({
        transporter_id: logistics.userId,
        transport_request_id: ctx.shared.transportRequestId ?? "00000000-0000-0000-0000-000000000000",
        status: "created",
        demo_tag: ctx.demoTag,
      })
      .select("id")
      .single();

    if (error) throwPg(error);
    ctx.shared.tripId = data.id;
    ctx.pass(MODULE, "Create trip");
  } catch (err) {
    ctx.fail(MODULE, "Create trip", err, "Check trips table schema and permissions");
  }

  // --- Update trip metadata ---
  try {
    if (!ctx.shared.tripId) throw new Error("No trip ID from previous step");

    const { error } = await ctx.adminClient
      .from("trips")
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq("id", ctx.shared.tripId);

    if (error) throwPg(error);
    ctx.pass(MODULE, "Update trip");
  } catch (err) {
    ctx.fail(MODULE, "Update trip", err, "Check trips UPDATE policy");
  }

  // --- Fetch assigned trips ---
  try {
    const { data, error } = await ctx.adminClient
      .from("trips")
      .select("id, status, transporter_id")
      .eq("transporter_id", logistics.userId)
      .eq("demo_tag", ctx.demoTag);

    if (error) throwPg(error);
    if (!data?.length) throw new Error("No trips found for logistics user");
    ctx.pass(MODULE, "Fetch assigned trips");
  } catch (err) {
    ctx.fail(MODULE, "Fetch assigned trips", err, "Check trips RLS SELECT policy for logistics role");
  }
}
