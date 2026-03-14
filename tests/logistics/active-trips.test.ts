/**
 * Active Trips Tests — fetch active trips, status transitions through lifecycle
 */

import type { TestContext } from "../test-utils";

const MODULE = "Active Trips";

function throwPg(error: unknown): never {
  if (error && typeof error === "object" && "message" in error) {
    throw new Error((error as { message: string }).message);
  }
  throw error;
}

export async function run(ctx: TestContext): Promise<void> {
  const logistics = ctx.userOf("logistics");

  // --- Fetch active trips (accepted status) ---
  try {
    const { data, error } = await ctx.adminClient
      .from("trips")
      .select("id, status, transporter_id")
      .eq("transporter_id", logistics.userId)
      .eq("demo_tag", ctx.demoTag)
      .in("status", ["accepted", "pickup_done", "in_transit"]);

    if (error) throwPg(error);
    if (!data?.length) throw new Error("No active trips found for logistics user");

    const hasAccepted = data.some((t: { status: string }) => t.status === "accepted");
    if (!hasAccepted) throw new Error("Expected at least one trip with status 'accepted'");

    ctx.pass(MODULE, "Fetch active trips");
  } catch (err) {
    ctx.fail(MODULE, "Fetch active trips", err, "Check trips SELECT with IN filter for active statuses");
  }

  // --- Transition: accepted -> pickup_done ---
  try {
    if (!ctx.shared.tripId) throw new Error("No trip ID from upstream test");

    const { error } = await ctx.adminClient
      .from("trips")
      .update({
        status: "pickup_done",
        picked_up_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", ctx.shared.tripId);

    if (error) throwPg(error);

    // Log status event
    await ctx.adminClient.from("transport_status_events").insert({
      transport_request_id: ctx.shared.transportRequestId,
      trip_id: ctx.shared.tripId,
      actor_id: logistics.userId,
      actor_role: "transporter",
      old_status: "accepted",
      new_status: "pickup_done",
      note: "LogiTest: pickup completed",
    });

    // Verify
    const { data, error: verifyErr } = await ctx.adminClient
      .from("trips")
      .select("status, picked_up_at")
      .eq("id", ctx.shared.tripId)
      .single();

    if (verifyErr) throwPg(verifyErr);
    if (data.status !== "pickup_done") throw new Error(`Expected 'pickup_done', got '${data.status}'`);
    if (!data.picked_up_at) throw new Error("picked_up_at not set");

    ctx.pass(MODULE, "Transition accepted -> pickup_done");
  } catch (err) {
    ctx.fail(MODULE, "Transition accepted -> pickup_done", err, "Check trips UPDATE policy for status transition");
  }

  // --- Transition: pickup_done -> in_transit ---
  try {
    if (!ctx.shared.tripId) throw new Error("No trip ID");

    const { error } = await ctx.adminClient
      .from("trips")
      .update({
        status: "in_transit",
        en_route_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", ctx.shared.tripId);

    if (error) throwPg(error);

    await ctx.adminClient.from("transport_status_events").insert({
      transport_request_id: ctx.shared.transportRequestId,
      trip_id: ctx.shared.tripId,
      actor_id: logistics.userId,
      actor_role: "transporter",
      old_status: "pickup_done",
      new_status: "in_transit",
      note: "LogiTest: in transit",
    });

    const { data, error: verifyErr } = await ctx.adminClient
      .from("trips")
      .select("status, en_route_at")
      .eq("id", ctx.shared.tripId)
      .single();

    if (verifyErr) throwPg(verifyErr);
    if (data.status !== "in_transit") throw new Error(`Expected 'in_transit', got '${data.status}'`);
    if (!data.en_route_at) throw new Error("en_route_at not set");

    ctx.pass(MODULE, "Transition pickup_done -> in_transit");
  } catch (err) {
    ctx.fail(MODULE, "Transition pickup_done -> in_transit", err, "Check trips UPDATE for in_transit transition");
  }

  // --- Transition: in_transit -> delivered ---
  try {
    if (!ctx.shared.tripId) throw new Error("No trip ID");

    const { error } = await ctx.adminClient
      .from("trips")
      .update({
        status: "delivered",
        delivered_at: new Date().toISOString(),
        actual_weight_kg: 95,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ctx.shared.tripId);

    if (error) throwPg(error);

    await ctx.adminClient.from("transport_status_events").insert({
      transport_request_id: ctx.shared.transportRequestId,
      trip_id: ctx.shared.tripId,
      actor_id: logistics.userId,
      actor_role: "transporter",
      old_status: "in_transit",
      new_status: "delivered",
      note: "LogiTest: delivered",
    });

    const { data, error: verifyErr } = await ctx.adminClient
      .from("trips")
      .select("status, delivered_at, actual_weight_kg")
      .eq("id", ctx.shared.tripId)
      .single();

    if (verifyErr) throwPg(verifyErr);
    if (data.status !== "delivered") throw new Error(`Expected 'delivered', got '${data.status}'`);
    if (!data.delivered_at) throw new Error("delivered_at not set");
    if (data.actual_weight_kg !== 95) throw new Error(`Expected weight 95, got ${data.actual_weight_kg}`);

    ctx.pass(MODULE, "Transition in_transit -> delivered");
  } catch (err) {
    ctx.fail(MODULE, "Transition in_transit -> delivered", err, "Check trips UPDATE for delivered transition");
  }

  // --- Verify full status event timeline ---
  try {
    if (!ctx.shared.tripId) throw new Error("No trip ID");

    const { data, error } = await ctx.adminClient
      .from("transport_status_events")
      .select("new_status, old_status, actor_role")
      .eq("trip_id", ctx.shared.tripId)
      .order("created_at", { ascending: true });

    if (error) throwPg(error);
    if (!data || data.length < 3) {
      throw new Error(`Expected at least 3 status events, got ${data?.length ?? 0}`);
    }

    const statuses = data.map((e: { new_status: string }) => e.new_status);
    const expectedSequence = ["accepted", "pickup_done", "in_transit", "delivered"];
    for (const expected of expectedSequence) {
      if (!statuses.includes(expected)) {
        throw new Error(`Missing '${expected}' in status event timeline: [${statuses.join(", ")}]`);
      }
    }

    ctx.pass(MODULE, "Full status event timeline");
  } catch (err) {
    ctx.fail(MODULE, "Full status event timeline", err, "Check transport_status_events completeness");
  }
}
