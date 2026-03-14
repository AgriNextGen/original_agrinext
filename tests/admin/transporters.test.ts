/**
 * Transporter Management Tests — admin visibility into transporters, vehicles, transport requests
 */

import type { TestContext } from "../test-utils";

const MODULE = "Transporter Management";

function throwPg(error: unknown): never {
  if (error && typeof error === "object" && "message" in error) {
    throw new Error((error as { message: string }).message);
  }
  throw error;
}

export async function run(ctx: TestContext): Promise<void> {
  const logistics = ctx.userOf("logistics");
  const farmer = ctx.userOf("farmer");
  const client = ctx.authedClient("admin");

  // --- Seed transport request ---
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

  // --- Admin can query transporters table ---
  try {
    const { data, error } = await client
      .from("transporters")
      .select("id, user_id, name, phone, operating_district, vehicle_type")
      .eq("demo_tag", ctx.demoTag);

    if (error) throwPg(error);
    if (!data?.length) throw new Error("No transporters visible");

    ctx.pass(MODULE, "Query transporters");
  } catch (err) {
    ctx.fail(MODULE, "Query transporters", err, "Check admin RLS read access to transporters table");
  }

  // --- Admin can view vehicles ---
  try {
    const { error } = await client
      .from("vehicles")
      .select("id, vehicle_type, registration_number")
      .limit(5);

    if (error) throwPg(error);
    ctx.pass(MODULE, "View vehicles");
  } catch (err) {
    ctx.fail(MODULE, "View vehicles", err, "Check admin RLS read access to vehicles table");
  }

  // --- Admin can view transport requests ---
  try {
    const { data, error } = await client
      .from("transport_requests")
      .select("id, status, farmer_id, pickup_location")
      .eq("demo_tag", ctx.demoTag);

    if (error) throwPg(error);

    if (ctx.shared.transportRequestId && (!data || data.length === 0)) {
      throw new Error("Seeded transport request not visible to admin");
    }

    ctx.pass(MODULE, "View transport requests");
  } catch (err) {
    ctx.fail(MODULE, "View transport requests", err, "Check admin RLS read access to transport_requests table");
  }
}
