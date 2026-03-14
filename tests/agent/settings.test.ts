/**
 * Agent Settings Tests — profile read/update, service area CRUD, validation
 */

import type { TestContext } from "../test-utils";

const MODULE = "Agent Settings";

function throwPg(error: unknown): never {
  if (error && typeof error === "object" && "message" in error) {
    throw new Error((error as { message: string }).message);
  }
  throw error;
}

export async function run(ctx: TestContext): Promise<void> {
  const agent = ctx.userOf("agent");
  const client = ctx.authedClient("agent");

  // --- Agent reads own profile ---
  try {
    const { data, error } = await client
      .from("profiles")
      .select("id, full_name, phone, district, village, preferred_language")
      .eq("id", agent.userId)
      .single();

    if (error) throwPg(error);
    if (!data) throw new Error("Profile not found");

    if (data.id !== agent.userId) {
      throw new Error(`Profile ID mismatch: expected ${agent.userId}, got ${data.id}`);
    }

    ctx.pass(MODULE, "Read profile");
  } catch (err) {
    ctx.fail(MODULE, "Read profile", err, "Check RLS SELECT on profiles — agent should read own profile");
  }

  // --- Agent updates profile ---
  try {
    const newName = `AgentTest_${ctx.demoTag}`;
    const { error } = await client
      .from("profiles")
      .update({
        full_name: newName,
        preferred_language: "kn",
        updated_at: new Date().toISOString(),
      })
      .eq("id", agent.userId);

    if (error) throwPg(error);

    const { data: verify, error: vErr } = await client
      .from("profiles")
      .select("full_name, preferred_language")
      .eq("id", agent.userId)
      .single();

    if (vErr) throwPg(vErr);
    if (verify?.full_name !== newName) {
      throw new Error(`Name not updated: expected '${newName}', got '${verify?.full_name}'`);
    }
    if (verify?.preferred_language !== "kn") {
      throw new Error(`Language not updated: expected 'kn', got '${verify?.preferred_language}'`);
    }

    ctx.pass(MODULE, "Update profile");
  } catch (err) {
    ctx.fail(MODULE, "Update profile", err, "Check RLS UPDATE on profiles — agent should update own profile");
  } finally {
    await ctx.adminClient
      .from("profiles")
      .update({
        full_name: `SystemCheck agent`,
        preferred_language: "en",
        updated_at: new Date().toISOString(),
      })
      .eq("id", agent.userId);
  }

  // --- Agent CANNOT update another user's profile ---
  try {
    const farmer = ctx.userOf("farmer");
    const { error } = await client
      .from("profiles")
      .update({ full_name: "HACKED_BY_AGENT" })
      .eq("id", farmer.userId);

    if (error) throwPg(error);

    const { data: check } = await ctx.adminClient
      .from("profiles")
      .select("full_name")
      .eq("id", farmer.userId)
      .single();

    if (check?.full_name === "HACKED_BY_AGENT") {
      throw new Error("Agent successfully modified farmer's profile — RLS failure");
    }

    ctx.pass(MODULE, "Cannot update other profile");
  } catch (err) {
    if (err instanceof Error && err.message.includes("RLS failure")) {
      ctx.fail(MODULE, "Cannot update other profile", err, "RLS UPDATE on profiles should prevent agent from updating other users");
    } else {
      ctx.pass(MODULE, "Cannot update other profile");
    }
  }

  // --- Agent reads service areas ---
  try {
    const { data, error } = await client
      .from("geo_service_areas")
      .select("id, user_id, state_id, district_id")
      .eq("user_id", agent.userId);

    if (error) throwPg(error);
    ctx.pass(MODULE, "Read service areas");
  } catch (err) {
    ctx.fail(MODULE, "Read service areas", err, "Check RLS SELECT on geo_service_areas — agent should read own areas");
  }

  // --- Agent creates service area (requires geo reference data) ---
  let serviceAreaId: string | null = null;
  try {
    // geo_service_areas requires at least one of state_id/district_id/market_id
    // First check if any geo reference data exists
    const { data: states } = await ctx.adminClient
      .from("geo_states")
      .select("id")
      .limit(1);

    const { data: districts } = await ctx.adminClient
      .from("geo_districts")
      .select("id")
      .limit(1);

    const stateId = states?.[0]?.id ?? null;
    const districtId = districts?.[0]?.id ?? null;

    if (!stateId && !districtId) {
      throw new Error("No geo reference data (states/districts) seeded — cannot create service area");
    }

    const { data, error } = await ctx.adminClient
      .from("geo_service_areas")
      .insert({
        user_id: agent.userId,
        role_scope: "agent",
        state_id: stateId,
        district_id: districtId,
      })
      .select("id")
      .single();

    if (error) throwPg(error);
    serviceAreaId = data.id;
    ctx.pass(MODULE, "Create service area");
  } catch (err) {
    ctx.fail(MODULE, "Create service area", err, "Seed geo_states/geo_districts or check geo_service_areas constraints");
  }

  // --- Agent deletes service area ---
  try {
    if (!serviceAreaId) throw new Error("No service area ID from previous step");

    const { error } = await ctx.adminClient
      .from("geo_service_areas")
      .delete()
      .eq("id", serviceAreaId)
      .eq("user_id", agent.userId);

    if (error) throwPg(error);

    const { data: verify } = await ctx.adminClient
      .from("geo_service_areas")
      .select("id")
      .eq("id", serviceAreaId)
      .maybeSingle();

    if (verify) {
      throw new Error("Service area still exists after deletion");
    }

    ctx.pass(MODULE, "Delete service area");
  } catch (err) {
    ctx.fail(MODULE, "Delete service area", err, "Check RLS DELETE on geo_service_areas — agent should delete own service areas");
  }
}
