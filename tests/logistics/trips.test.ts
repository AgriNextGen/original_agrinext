/**
 * Trip Management Tests — creation, fetch with context, detail, status events
 */

import type { TestContext } from "../test-utils";

const MODULE = "Trip Lifecycle";

function throwPg(error: unknown): never {
  if (error && typeof error === "object" && "message" in error) {
    throw new Error((error as { message: string }).message);
  }
  throw error;
}

export async function run(ctx: TestContext): Promise<void> {
  const logistics = ctx.userOf("logistics");

  // --- Create trip from accepted load ---
  try {
    if (!ctx.shared.transportRequestId) throw new Error("No transport request ID from upstream test");

    const { data, error } = await ctx.adminClient
      .from("trips")
      .insert({
        transporter_id: logistics.userId,
        transport_request_id: ctx.shared.transportRequestId,
        status: "accepted",
        assigned_at: new Date().toISOString(),
        demo_tag: ctx.demoTag,
      })
      .select("id, status")
      .single();

    if (error) throwPg(error);
    if (data.status !== "accepted") throw new Error(`Expected trip status 'accepted', got '${data.status}'`);

    ctx.shared.tripId = data.id;
    ctx.pass(MODULE, "Create trip from accepted load");
  } catch (err) {
    ctx.fail(MODULE, "Create trip from accepted load", err, "Check trips table INSERT policy and schema");
  }

  // --- Fetch trips for transporter ---
  try {
    const { data, error } = await ctx.adminClient
      .from("trips")
      .select("id, status, transporter_id, transport_request_id")
      .eq("transporter_id", logistics.userId)
      .eq("demo_tag", ctx.demoTag);

    if (error) throwPg(error);
    if (!data?.length) throw new Error("No trips found for logistics user");

    const found = data.find((t: { id: string }) => t.id === ctx.shared.tripId);
    if (!found) throw new Error("Created trip not in fetch results");

    ctx.pass(MODULE, "Fetch trips for transporter");
  } catch (err) {
    ctx.fail(MODULE, "Fetch trips for transporter", err, "Check trips SELECT policy for transporter_id filter");
  }

  // --- Fetch single trip detail ---
  try {
    if (!ctx.shared.tripId) throw new Error("No trip ID from create step");

    const { data, error } = await ctx.adminClient
      .from("trips")
      .select(`
        id, status, transporter_id, transport_request_id,
        assigned_at, picked_up_at, en_route_at, delivered_at,
        cancelled_at, issue_code, issue_notes,
        pickup_proofs, delivery_proofs, actual_weight_kg
      `)
      .eq("id", ctx.shared.tripId)
      .single();

    if (error) throwPg(error);
    if (!data) throw new Error("Trip detail returned null");
    if (data.transporter_id !== logistics.userId) throw new Error("Trip transporter_id mismatch");
    if (data.transport_request_id !== ctx.shared.transportRequestId) {
      throw new Error("Trip transport_request_id mismatch");
    }

    ctx.pass(MODULE, "Fetch trip detail");
  } catch (err) {
    ctx.fail(MODULE, "Fetch trip detail", err, "Check trips SELECT with detail columns");
  }

  // --- Create and fetch status events ---
  try {
    if (!ctx.shared.tripId || !ctx.shared.transportRequestId) {
      throw new Error("Missing trip or request ID");
    }

    const { error: insertErr } = await ctx.adminClient
      .from("transport_status_events")
      .insert({
        transport_request_id: ctx.shared.transportRequestId,
        trip_id: ctx.shared.tripId,
        actor_id: logistics.userId,
        actor_role: "transporter",
        old_status: null,
        new_status: "accepted",
        note: "LogiTest: trip accepted",
      });

    if (insertErr) throwPg(insertErr);

    const { data, error } = await ctx.adminClient
      .from("transport_status_events")
      .select("id, trip_id, new_status, actor_role, note")
      .eq("trip_id", ctx.shared.tripId)
      .order("created_at", { ascending: true });

    if (error) throwPg(error);
    if (!data?.length) throw new Error("No status events found for trip");

    const acceptEvent = data.find((e: { new_status: string }) => e.new_status === "accepted");
    if (!acceptEvent) throw new Error("Accept status event not found");

    ctx.pass(MODULE, "Trip status events");
  } catch (err) {
    ctx.fail(MODULE, "Trip status events", err, "Check transport_status_events table and INSERT/SELECT policies");
  }
}
