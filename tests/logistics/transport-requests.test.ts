/**
 * Transport Requests Tests — create, fetch, accept, status transition
 */

import type { TestContext } from "../test-utils";

const MODULE = "Transport Requests";

function throwPg(error: unknown): never {
  if (error && typeof error === "object" && "message" in error) {
    throw new Error((error as { message: string }).message);
  }
  throw error;
}

export async function run(ctx: TestContext): Promise<void> {
  const farmer = ctx.userOf("farmer");
  const logistics = ctx.userOf("logistics");

  // --- Create transport request (admin client to bypass RLS insert restrictions) ---
  try {
    const { data, error } = await ctx.adminClient
      .from("transport_requests")
      .insert({
        farmer_id: farmer.userId,
        pickup_location: "LogiTest Village, Mysuru",
        pickup_village: "LogiTest Village",
        quantity: 100,
        quantity_unit: "kg",
        preferred_date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        preferred_time: "morning",
        status: "requested",
        demo_tag: ctx.demoTag,
      })
      .select("id")
      .single();

    if (error) throwPg(error);
    ctx.shared.transportRequestId = data.id;
    ctx.pass(MODULE, "Create transport request");
  } catch (err) {
    ctx.fail(MODULE, "Create transport request", err, "Check transport_requests table schema and INSERT policy");
  }

  // --- Fetch available transport requests ---
  try {
    const { data, error } = await ctx.adminClient
      .from("transport_requests")
      .select("id, status, farmer_id, quantity, pickup_location")
      .eq("demo_tag", ctx.demoTag)
      .eq("status", "requested");

    if (error) throwPg(error);
    if (!data?.length) throw new Error("No available transport requests found");

    const found = data.find(
      (r: { id: string }) => r.id === ctx.shared.transportRequestId,
    );
    if (!found) throw new Error("Created transport request not in fetch results");
    ctx.pass(MODULE, "Fetch available requests");
  } catch (err) {
    ctx.fail(MODULE, "Fetch available requests", err, "Check transport_requests RLS and demo_tag filter");
  }

  // --- View request details ---
  try {
    if (!ctx.shared.transportRequestId) throw new Error("No transport request ID");

    const { data, error } = await ctx.adminClient
      .from("transport_requests")
      .select("id, status, farmer_id, quantity, quantity_unit, pickup_location, pickup_village, preferred_date, preferred_time, notes")
      .eq("id", ctx.shared.transportRequestId)
      .single();

    if (error) throwPg(error);
    if (!data) throw new Error("Request details returned null");
    if (data.quantity !== 100) throw new Error(`Expected quantity 100, got ${data.quantity}`);
    if (data.pickup_village !== "LogiTest Village") throw new Error(`Unexpected pickup_village: ${data.pickup_village}`);

    ctx.pass(MODULE, "View request details");
  } catch (err) {
    ctx.fail(MODULE, "View request details", err, "Check transport_requests SELECT for detail fields");
  }

  // --- Accept load (update transport_request status + notes) ---
  try {
    if (!ctx.shared.transportRequestId) throw new Error("No transport request ID");

    const { error } = await ctx.adminClient
      .from("transport_requests")
      .update({
        transporter_id: logistics.userId,
        status: "assigned",
        notes: "Accepted by LogiTest transporter",
        updated_at: new Date().toISOString(),
      })
      .eq("id", ctx.shared.transportRequestId);

    if (error) throwPg(error);

    // Verify status changed
    const { data: updated, error: verifyErr } = await ctx.adminClient
      .from("transport_requests")
      .select("status, transporter_id")
      .eq("id", ctx.shared.transportRequestId)
      .single();

    if (verifyErr) throwPg(verifyErr);
    if (updated.status !== "assigned") throw new Error(`Expected status 'assigned', got '${updated.status}'`);
    if (updated.transporter_id !== logistics.userId) throw new Error("transporter_id not set correctly");

    ctx.pass(MODULE, "Accept load");
  } catch (err) {
    ctx.fail(MODULE, "Accept load", err, "Check transport_requests UPDATE policy and status transition");
  }

  // --- Filter requests by status ---
  try {
    const { data: requested, error: e1 } = await ctx.adminClient
      .from("transport_requests")
      .select("id")
      .eq("demo_tag", ctx.demoTag)
      .eq("status", "requested");

    if (e1) throwPg(e1);

    const { data: assigned, error: e2 } = await ctx.adminClient
      .from("transport_requests")
      .select("id")
      .eq("demo_tag", ctx.demoTag)
      .eq("status", "assigned");

    if (e2) throwPg(e2);

    // Our request was moved to assigned, so it should appear there
    const inAssigned = assigned?.some((r: { id: string }) => r.id === ctx.shared.transportRequestId);
    if (!inAssigned) throw new Error("Accepted request not found in assigned filter");

    const inRequested = requested?.some((r: { id: string }) => r.id === ctx.shared.transportRequestId);
    if (inRequested) throw new Error("Accepted request still appearing in requested filter");

    ctx.pass(MODULE, "Filter requests by status");
  } catch (err) {
    ctx.fail(MODULE, "Filter requests by status", err, "Check status filter logic for transport_requests");
  }
}
