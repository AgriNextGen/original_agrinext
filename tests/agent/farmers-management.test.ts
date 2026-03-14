/**
 * Farmers Management Tests — assignment CRUD, unassigned isolation, farmer data access
 */

import type { TestContext } from "../test-utils";

const MODULE = "Farmers Management";

function throwPg(error: unknown): never {
  if (error && typeof error === "object" && "message" in error) {
    throw new Error((error as { message: string }).message);
  }
  throw error;
}

export async function run(ctx: TestContext): Promise<void> {
  const agent = ctx.userOf("agent");
  const farmer = ctx.userOf("farmer");
  const client = ctx.authedClient("agent");

  // --- Ensure assignment exists ---
  await ctx.adminClient
    .from("agent_farmer_assignments")
    .upsert(
      {
        agent_id: agent.userId,
        farmer_id: farmer.userId,
        active: true,
        demo_tag: ctx.demoTag,
        assigned_at: new Date().toISOString(),
      },
      { onConflict: "agent_id,farmer_id" },
    );

  // --- Seed farmland for assigned farmer ---
  let farmlandId: string | null = null;
  try {
    const { data, error } = await ctx.adminClient
      .from("farmlands")
      .insert({
        farmer_id: farmer.userId,
        name: `agentchk_${ctx.demoTag}_farmland`,
        area: 5.0,
        area_unit: "acres",
        district: "Mysuru",
        village: "Test Village",
        demo_tag: ctx.demoTag,
      })
      .select("id")
      .single();

    if (error) throwPg(error);
    farmlandId = data.id;
    ctx.shared.farmlandId = farmlandId;
    ctx.pass(MODULE, "Seed farmland");
  } catch (err) {
    ctx.fail(MODULE, "Seed farmland", err, "Check farmlands table schema and INSERT permissions for service_role");
  }

  // --- Agent can read assigned farmer's farmlands ---
  try {
    const { data, error } = await client
      .from("farmlands")
      .select("id, name, farmer_id")
      .eq("farmer_id", farmer.userId);

    if (error) throwPg(error);
    if (!data?.length) throw new Error("Agent cannot see assigned farmer's farmlands");

    const found = data.some((r: any) => r.id === farmlandId);
    if (!found) throw new Error("Seeded farmland not visible to agent");

    ctx.pass(MODULE, "Read assigned farmer farmlands");
  } catch (err) {
    ctx.fail(MODULE, "Read assigned farmer farmlands", err, "Check RLS on farmlands — agent should see assigned farmer's farmlands via is_agent_assigned");
  }

  // --- Seed crop for assigned farmer ---
  let cropId: string | null = null;
  try {
    if (!farmlandId) throw new Error("No farmland ID from previous step");

    const { data, error } = await ctx.adminClient
      .from("crops")
      .insert({
        farmer_id: farmer.userId,
        land_id: farmlandId,
        crop_name: "Onion",
        sowing_date: new Date().toISOString().split("T")[0],
        health_status: "normal",
        growth_stage: "seedling",
        status: "growing",
        demo_tag: ctx.demoTag,
      })
      .select("id")
      .single();

    if (error) throwPg(error);
    cropId = data.id;
    ctx.shared.cropId = cropId;
    ctx.pass(MODULE, "Seed crop");
  } catch (err) {
    ctx.fail(MODULE, "Seed crop", err, "Check crops table schema");
  }

  // --- Agent can read assigned farmer's crops ---
  try {
    const { data, error } = await client
      .from("crops")
      .select("id, crop_name, farmer_id, health_status, growth_stage")
      .eq("farmer_id", farmer.userId);

    if (error) throwPg(error);
    if (!data?.length) throw new Error("Agent cannot see assigned farmer's crops");

    const found = data.some((r: any) => r.id === cropId);
    if (!found) throw new Error("Seeded crop not visible to agent");

    ctx.pass(MODULE, "Read assigned farmer crops");
  } catch (err) {
    ctx.fail(MODULE, "Read assigned farmer crops", err, "Check RLS on crops — agent should see assigned farmer's crops");
  }

  // --- Agent CANNOT see unassigned farmer's farmlands ---
  try {
    const buyer = ctx.userOf("buyer");

    const { error: seedErr } = await ctx.adminClient
      .from("farmlands")
      .insert({
        farmer_id: buyer.userId,
        name: `agentchk_${ctx.demoTag}_unassigned_farmland`,
        area: 3.0,
        area_unit: "acres",
        district: "Bengaluru Urban",
        village: "Other Village",
        demo_tag: ctx.demoTag,
      });

    if (seedErr) throwPg(seedErr);

    const { data, error } = await client
      .from("farmlands")
      .select("id")
      .eq("farmer_id", buyer.userId)
      .eq("demo_tag", ctx.demoTag);

    if (error) throwPg(error);

    if (data && data.length > 0) {
      throw new Error(`Agent can see unassigned user's farmlands (${data.length} rows). RLS not enforcing assignment scope.`);
    }

    ctx.pass(MODULE, "Cannot see unassigned farmlands");
  } catch (err) {
    ctx.fail(MODULE, "Cannot see unassigned farmlands", err, "Check RLS on farmlands — agent should NOT see non-assigned farmer data");
  }

  // --- Duplicate assignment upsert is idempotent ---
  try {
    const { error } = await ctx.adminClient
      .from("agent_farmer_assignments")
      .upsert(
        {
          agent_id: agent.userId,
          farmer_id: farmer.userId,
          active: true,
          demo_tag: ctx.demoTag,
          assigned_at: new Date().toISOString(),
        },
        { onConflict: "agent_id,farmer_id" },
      );

    if (error) throwPg(error);

    const { data, error: countErr } = await client
      .from("agent_farmer_assignments")
      .select("farmer_id")
      .eq("agent_id", agent.userId)
      .eq("farmer_id", farmer.userId);

    if (countErr) throwPg(countErr);
    if (!data || data.length !== 1) {
      throw new Error(`Expected exactly 1 assignment row, got ${data?.length ?? 0}`);
    }

    ctx.pass(MODULE, "Duplicate upsert idempotent");
  } catch (err) {
    ctx.fail(MODULE, "Duplicate upsert idempotent", err, "Check agent_farmer_assignments upsert with onConflict");
  }
}
