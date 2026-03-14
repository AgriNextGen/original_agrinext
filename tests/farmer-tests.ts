/**
 * Farmer Tests — farmland CRUD, crop CRUD, listing creation and filtering
 */

import type { TestContext } from "./test-utils";

const MODULE = "Farmer Dashboard";

function throwPg(error: unknown): never {
  if (error && typeof error === "object" && "message" in error) {
    throw new Error((error as { message: string; code?: string }).message);
  }
  throw error;
}

export async function run(ctx: TestContext): Promise<void> {
  const farmer = ctx.userOf("farmer");
  const client = ctx.authedClient("farmer");

  // --- Create farmland ---
  try {
    const { data, error } = await client
      .from("farmlands")
      .insert({
        farmer_id: farmer.userId,
        name: "SystemCheck Farm",
        area: 2.5,
        area_unit: "acres",
        village: "SystemCheck Village",
        district: "Mysuru",
        soil_type: "red_soil",
        demo_tag: ctx.demoTag,
      })
      .select("id")
      .single();

    if (error) throwPg(error);
    ctx.shared.farmlandId = data.id;
    ctx.pass(MODULE, "Create farmland");
  } catch (err) {
    ctx.fail(MODULE, "Create farmland", err, "Check RLS policies on farmlands for farmer role");
  }

  // --- Update farmland ---
  try {
    if (!ctx.shared.farmlandId) throw new Error("No farmland ID from previous step");

    const { error } = await client
      .from("farmlands")
      .update({
        name: "SystemCheck Farm (Updated)",
        area: 3.0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ctx.shared.farmlandId);

    if (error) throwPg(error);
    ctx.pass(MODULE, "Update farmland");
  } catch (err) {
    ctx.fail(MODULE, "Update farmland", err, "Check RLS UPDATE policy on farmlands for farmer role");
  }

  // --- Fetch farmlands ---
  try {
    const { data, error } = await client
      .from("farmlands")
      .select("id, name, area")
      .eq("farmer_id", farmer.userId)
      .eq("demo_tag", ctx.demoTag);

    if (error) throwPg(error);
    if (!data?.length) throw new Error("Fetch returned empty — expected at least 1 farmland");
    ctx.pass(MODULE, "Fetch farmlands");
  } catch (err) {
    ctx.fail(MODULE, "Fetch farmlands", err, "Check RLS SELECT policy on farmlands for farmer role");
  }

  // --- Create crop ---
  try {
    const { data, error } = await client
      .from("crops")
      .insert({
        farmer_id: farmer.userId,
        crop_name: "SystemCheck Tomato",
        status: "growing",
        health_status: "normal",
        growth_stage: "seedling",
        land_id: ctx.shared.farmlandId,
        variety: "Cherry",
        demo_tag: ctx.demoTag,
      })
      .select("id")
      .single();

    if (error) throwPg(error);
    ctx.shared.cropId = data.id;
    ctx.pass(MODULE, "Create crop");
  } catch (err) {
    ctx.fail(MODULE, "Create crop", err, "Check RLS INSERT policy on crops for farmer role");
  }

  // --- Update crop ---
  try {
    if (!ctx.shared.cropId) throw new Error("No crop ID from previous step");

    const { error } = await client
      .from("crops")
      .update({
        status: "ready",
        growth_stage: "fruiting",
        health_status: "good",
        updated_at: new Date().toISOString(),
      })
      .eq("id", ctx.shared.cropId);

    if (error) throwPg(error);
    ctx.pass(MODULE, "Update crop");
  } catch (err) {
    ctx.fail(MODULE, "Update crop", err, "Check RLS UPDATE policy on crops for farmer role");
  }

  // --- Fetch crops ---
  try {
    const { data, error } = await client
      .from("crops")
      .select("id, crop_name, status, health_status, growth_stage")
      .eq("farmer_id", farmer.userId)
      .eq("demo_tag", ctx.demoTag);

    if (error) throwPg(error);
    if (!data?.length) throw new Error("Fetch returned empty — expected at least 1 crop");
    ctx.pass(MODULE, "Fetch crops");
  } catch (err) {
    ctx.fail(MODULE, "Fetch crops", err, "Check RLS SELECT policy on crops for farmer role");
  }

  // --- Create listing (via adminClient — writes are RPC-guarded) ---
  try {
    const { data, error } = await ctx.adminClient
      .from("listings")
      .insert({
        seller_id: farmer.userId,
        title: "SystemCheck Tomato Listing",
        category: "vegetable",
        price: 25,
        quantity: 100,
        unit: "kg",
        unit_price: 25,
        is_active: true,
        status: "approved",
        crop_id: ctx.shared.cropId,
        location: "Mysuru",
        demo_tag: ctx.demoTag,
      })
      .select("id")
      .single();

    if (error) throwPg(error);
    ctx.shared.listingId = data.id;
    ctx.pass(MODULE, "Create listing");
  } catch (err) {
    ctx.fail(MODULE, "Create listing", err, "Check listings table schema and permissions");
  }

  // --- Update listing ---
  try {
    if (!ctx.shared.listingId) throw new Error("No listing ID from previous step");

    const { error } = await ctx.adminClient
      .from("listings")
      .update({
        title: "SystemCheck Tomato (Updated)",
        updated_at: new Date().toISOString(),
      })
      .eq("id", ctx.shared.listingId);

    if (error) throwPg(error);
    ctx.pass(MODULE, "Update listing");
  } catch (err) {
    ctx.fail(MODULE, "Update listing", err, "Check listings UPDATE policy");
  }

  // --- Fetch listings filtered by seller ---
  try {
    const { data, error } = await client
      .from("listings")
      .select("id, title, status")
      .eq("seller_id", farmer.userId)
      .eq("demo_tag", ctx.demoTag);

    if (error) throwPg(error);
    if (!data?.length) throw new Error("Fetch returned empty — expected at least 1 listing");
    ctx.pass(MODULE, "Fetch listings");
  } catch (err) {
    ctx.fail(MODULE, "Fetch listings", err, "Check RLS SELECT policy on listings for farmer/seller role");
  }
}
