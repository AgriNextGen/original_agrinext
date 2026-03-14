/**
 * Settings Tests — transporter profile fetch, update, persistence
 */

import type { TestContext } from "../test-utils";

const MODULE = "Settings";

function throwPg(error: unknown): never {
  if (error && typeof error === "object" && "message" in error) {
    throw new Error((error as { message: string }).message);
  }
  throw error;
}

export async function run(ctx: TestContext): Promise<void> {
  const logistics = ctx.userOf("logistics");

  // --- Fetch transporter profile ---
  try {
    const { data, error } = await ctx.adminClient
      .from("transporters")
      .select("id, user_id, name, phone, vehicle_type, vehicle_capacity, registration_number, operating_village, operating_district")
      .eq("user_id", logistics.userId)
      .single();

    if (error) throwPg(error);
    if (!data) throw new Error("Transporter profile not found");
    if (data.user_id !== logistics.userId) throw new Error("Profile user_id mismatch");

    ctx.pass(MODULE, "Fetch transporter profile");
  } catch (err) {
    ctx.fail(MODULE, "Fetch transporter profile", err, "Check transporters SELECT policy");
  }

  // --- Update profile fields ---
  try {
    const updatedName = `LogiTest Updated ${Date.now().toString().slice(-4)}`;
    const { error } = await ctx.adminClient
      .from("transporters")
      .update({
        name: updatedName,
        operating_district: "Mandya",
        operating_village: "Maddur",
        vehicle_type: "truck",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", logistics.userId);

    if (error) throwPg(error);

    // Verify update
    const { data, error: verifyErr } = await ctx.adminClient
      .from("transporters")
      .select("name, operating_district, operating_village, vehicle_type")
      .eq("user_id", logistics.userId)
      .single();

    if (verifyErr) throwPg(verifyErr);
    if (data.name !== updatedName) throw new Error(`Name not updated: expected '${updatedName}', got '${data.name}'`);
    if (data.operating_district !== "Mandya") throw new Error(`District not updated: got '${data.operating_district}'`);
    if (data.operating_village !== "Maddur") throw new Error(`Village not updated: got '${data.operating_village}'`);

    ctx.pass(MODULE, "Update profile fields");
  } catch (err) {
    ctx.fail(MODULE, "Update profile fields", err, "Check transporters UPDATE policy");
  }

  // --- Restore profile and verify persistence ---
  try {
    const { error } = await ctx.adminClient
      .from("transporters")
      .update({
        name: "SystemCheck logistics",
        operating_district: "Mysuru",
        operating_village: null,
        vehicle_type: "mini_truck",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", logistics.userId);

    if (error) throwPg(error);

    const { data, error: verifyErr } = await ctx.adminClient
      .from("transporters")
      .select("name, operating_district, vehicle_type")
      .eq("user_id", logistics.userId)
      .single();

    if (verifyErr) throwPg(verifyErr);
    if (data.name !== "SystemCheck logistics") throw new Error("Profile restoration failed");
    if (data.operating_district !== "Mysuru") throw new Error("District restoration failed");

    ctx.pass(MODULE, "Profile update persistence");
  } catch (err) {
    ctx.fail(MODULE, "Profile update persistence", err, "Check transporters UPDATE persistence");
  }
}
