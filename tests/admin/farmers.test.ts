/**
 * Farmer Management Tests — admin visibility into farmer profiles, farmlands, crops, listings
 */

import type { TestContext } from "../test-utils";

const MODULE = "Farmer Management";

function throwPg(error: unknown): never {
  if (error && typeof error === "object" && "message" in error) {
    throw new Error((error as { message: string }).message);
  }
  throw error;
}

export async function run(ctx: TestContext): Promise<void> {
  const farmer = ctx.userOf("farmer");
  const client = ctx.authedClient("admin");

  // --- Seed farmer data if not already present ---
  if (!ctx.shared.farmlandId) {
    const { data: fl, error: flErr } = await ctx.adminClient
      .from("farmlands")
      .insert({
        farmer_id: farmer.userId,
        name: `adminchk_${ctx.demoTag}_farmer_fl`,
        area: 3.0,
        area_unit: "acres",
        district: "Mysuru",
        village: "AdminCheck Village",
        demo_tag: ctx.demoTag,
      })
      .select("id")
      .single();

    if (!flErr && fl) ctx.shared.farmlandId = fl.id;
  }

  if (!ctx.shared.cropId && ctx.shared.farmlandId) {
    const { data: cr, error: crErr } = await ctx.adminClient
      .from("crops")
      .insert({
        farmer_id: farmer.userId,
        farmland_id: ctx.shared.farmlandId,
        crop_name: "Jowar",
        status: "growing",
        health_status: "normal",
        growth_stage: "seedling",
        sowing_date: new Date().toISOString(),
        demo_tag: ctx.demoTag,
      })
      .select("id")
      .single();

    if (!crErr && cr) ctx.shared.cropId = cr.id;
  }

  if (!ctx.shared.listingId && ctx.shared.cropId) {
    const { data: ls, error: lsErr } = await ctx.adminClient
      .from("listings")
      .insert({
        farmer_id: farmer.userId,
        crop_id: ctx.shared.cropId,
        crop_name: "Jowar",
        quantity: 50,
        unit: "kg",
        price_per_unit: 25,
        status: "active",
        district: "Mysuru",
        demo_tag: ctx.demoTag,
      })
      .select("id")
      .single();

    if (!lsErr && ls) ctx.shared.listingId = ls.id;
  }

  // --- Admin can query farmer profiles ---
  try {
    const { data: profiles, error: pErr } = await client
      .from("profiles")
      .select("id, full_name, phone, district")
      .eq("demo_tag", ctx.demoTag);

    if (pErr) throwPg(pErr);

    const { data: roles, error: rErr } = await client
      .from("user_roles")
      .select("user_id, role")
      .eq("role", "farmer");

    if (rErr) throwPg(rErr);

    const farmerUserIds = new Set((roles ?? []).map((r: any) => r.user_id));
    const farmerProfiles = (profiles ?? []).filter((p: any) => farmerUserIds.has(p.id));

    if (!farmerProfiles.length) throw new Error("No farmer profiles found");

    ctx.pass(MODULE, "Query farmer profiles");
  } catch (err) {
    ctx.fail(MODULE, "Query farmer profiles", err, "Check admin read access to profiles + user_roles for farmer filtering");
  }

  // --- Admin can view farmer's farmlands ---
  try {
    const { data, error } = await client
      .from("farmlands")
      .select("id, name, area, district")
      .eq("farmer_id", farmer.userId)
      .eq("demo_tag", ctx.demoTag);

    if (error) throwPg(error);
    if (!data?.length) throw new Error("No farmlands visible for farmer");

    ctx.pass(MODULE, "View farmlands");
  } catch (err) {
    ctx.fail(MODULE, "View farmlands", err, "Check admin RLS read access to farmlands table");
  }

  // --- Admin can view farmer's crops ---
  try {
    const { data, error } = await client
      .from("crops")
      .select("id, crop_name, status, health_status")
      .eq("farmer_id", farmer.userId)
      .eq("demo_tag", ctx.demoTag);

    if (error) throwPg(error);
    if (!data?.length) throw new Error("No crops visible for farmer");

    ctx.pass(MODULE, "View crops");
  } catch (err) {
    ctx.fail(MODULE, "View crops", err, "Check admin RLS read access to crops table");
  }

  // --- Admin can view farmer's listings ---
  try {
    const { data, error } = await client
      .from("listings")
      .select("id, crop_name, quantity, status")
      .eq("farmer_id", farmer.userId)
      .eq("demo_tag", ctx.demoTag);

    if (error) throwPg(error);
    if (!data?.length) throw new Error("No listings visible for farmer");

    ctx.pass(MODULE, "View listings");
  } catch (err) {
    ctx.fail(MODULE, "View listings", err, "Check admin RLS read access to listings table");
  }
}
