/**
 * Vehicle Management Tests — CRUD operations and transporter profile
 */

import type { TestContext } from "../test-utils";

const MODULE = "Vehicle Management";

function throwPg(error: unknown): never {
  if (error && typeof error === "object" && "message" in error) {
    throw new Error((error as { message: string }).message);
  }
  throw error;
}

export async function run(ctx: TestContext): Promise<void> {
  const logistics = ctx.userOf("logistics");
  let vehicleId: string | null = null;

  // --- Verify transporter profile exists ---
  try {
    const { data, error } = await ctx.adminClient
      .from("transporters")
      .select("id, user_id, name, phone, vehicle_type, vehicle_capacity, registration_number, operating_district")
      .eq("user_id", logistics.userId)
      .maybeSingle();

    if (error) throwPg(error);
    if (!data) throw new Error("Transporter profile not found. Provisioning may have failed.");
    if (data.user_id !== logistics.userId) throw new Error("Transporter user_id mismatch");

    ctx.pass(MODULE, "Transporter profile exists");
  } catch (err) {
    ctx.fail(MODULE, "Transporter profile exists", err, "Check transporters table and provisioning in test-utils");
  }

  // --- Get transporter ID for vehicle operations ---
  let transporterId: string | null = null;
  try {
    const { data, error } = await ctx.adminClient
      .from("transporters")
      .select("id")
      .eq("user_id", logistics.userId)
      .single();

    if (error) throwPg(error);
    transporterId = data.id;
  } catch {
    // Will fail downstream tests naturally
  }

  // --- Add vehicle ---
  try {
    if (!transporterId) throw new Error("No transporter ID — cannot add vehicle");

    const { data, error } = await ctx.adminClient
      .from("vehicles")
      .insert({
        transporter_id: transporterId,
        vehicle_type: "mini_truck",
        capacity_kg: 2000,
        registration_number: `KA-LTEST-${Date.now().toString().slice(-4)}`,
      })
      .select("id")
      .single();

    if (error) throwPg(error);
    vehicleId = data.id;
    ctx.pass(MODULE, "Add vehicle");
  } catch (err) {
    ctx.fail(MODULE, "Add vehicle", err, "Check vehicles table INSERT policy and schema");
  }

  // --- Edit vehicle ---
  try {
    if (!vehicleId) throw new Error("No vehicle ID from add step");

    const { error } = await ctx.adminClient
      .from("vehicles")
      .update({
        capacity_kg: 3000,
        vehicle_type: "truck",
      })
      .eq("id", vehicleId);

    if (error) throwPg(error);

    // Verify update persisted
    const { data: updated, error: verifyErr } = await ctx.adminClient
      .from("vehicles")
      .select("capacity_kg, vehicle_type")
      .eq("id", vehicleId)
      .single();

    if (verifyErr) throwPg(verifyErr);
    if (updated.capacity_kg !== 3000) throw new Error(`Expected capacity 3000, got ${updated.capacity_kg}`);
    if (updated.vehicle_type !== "truck") throw new Error(`Expected type 'truck', got '${updated.vehicle_type}'`);

    ctx.pass(MODULE, "Edit vehicle");
  } catch (err) {
    ctx.fail(MODULE, "Edit vehicle", err, "Check vehicles UPDATE policy");
  }

  // --- Fetch vehicles for transporter ---
  try {
    if (!transporterId) throw new Error("No transporter ID");

    const { data, error } = await ctx.adminClient
      .from("vehicles")
      .select("id, vehicle_type, capacity_kg, registration_number")
      .eq("transporter_id", transporterId);

    if (error) throwPg(error);
    if (!data?.length) throw new Error("No vehicles found for transporter");

    const found = data.find((v: { id: string }) => v.id === vehicleId);
    if (!found) throw new Error("Added vehicle not in fetch results");

    ctx.pass(MODULE, "Fetch vehicles");
  } catch (err) {
    ctx.fail(MODULE, "Fetch vehicles", err, "Check vehicles SELECT policy for transporter_id filter");
  }

  // --- Delete vehicle ---
  try {
    if (!vehicleId) throw new Error("No vehicle ID to delete");

    const { error } = await ctx.adminClient
      .from("vehicles")
      .delete()
      .eq("id", vehicleId);

    if (error) throwPg(error);

    // Verify deletion
    const { data: afterDelete, error: verifyErr } = await ctx.adminClient
      .from("vehicles")
      .select("id")
      .eq("id", vehicleId)
      .maybeSingle();

    if (verifyErr) throwPg(verifyErr);
    if (afterDelete) throw new Error("Vehicle still exists after deletion");

    ctx.pass(MODULE, "Delete vehicle");
  } catch (err) {
    ctx.fail(MODULE, "Delete vehicle", err, "Check vehicles DELETE policy");
  }
}
