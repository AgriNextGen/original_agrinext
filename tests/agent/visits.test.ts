/**
 * Agent Visits Tests — check-in, check-out, lifecycle, data integrity
 */

import type { TestContext } from "../test-utils";

const MODULE = "Agent Visits";

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

  // --- Create visit (check-in) ---
  let visitId: string | null = null;
  try {
    const checkinTime = new Date().toISOString();
    const { data, error } = await ctx.adminClient
      .from("agent_visits")
      .insert({
        agent_id: agent.userId,
        farmer_id: farmer.userId,
        check_in_at: checkinTime,
        demo_tag: ctx.demoTag,
      })
      .select("id")
      .single();

    if (error) throwPg(error);
    visitId = data.id;
    ctx.pass(MODULE, "Create visit (check-in)");
  } catch (err) {
    ctx.fail(MODULE, "Create visit (check-in)", err, "Check agent_visits table schema and INSERT permissions");
  }

  // --- Agent reads visit back ---
  try {
    if (!visitId) throw new Error("No visit ID from check-in step");

    const { data, error } = await client
      .from("agent_visits")
      .select("id, agent_id, farmer_id, check_in_at, check_out_at")
      .eq("id", visitId)
      .single();

    if (error) throwPg(error);
    if (!data) throw new Error("Visit not found via agent client");

    if (data.agent_id !== agent.userId) {
      throw new Error(`Agent ID mismatch: expected ${agent.userId}, got ${data.agent_id}`);
    }
    if (data.farmer_id !== farmer.userId) {
      throw new Error(`Farmer ID mismatch: expected ${farmer.userId}, got ${data.farmer_id}`);
    }
    if (!data.check_in_at) {
      throw new Error("Check-in time is null");
    }

    ctx.pass(MODULE, "Read visit details");
  } catch (err) {
    ctx.fail(MODULE, "Read visit details", err, "Check RLS SELECT on agent_visits — agent should see own visits");
  }

  // --- In-progress visit has no checkout ---
  try {
    if (!visitId) throw new Error("No visit ID");

    const { data, error } = await client
      .from("agent_visits")
      .select("check_out_at")
      .eq("id", visitId)
      .single();

    if (error) throwPg(error);

    if (data?.check_out_at) {
      throw new Error("In-progress visit should not have check_out_at");
    }

    ctx.pass(MODULE, "In-progress state (no checkout)");
  } catch (err) {
    ctx.fail(MODULE, "In-progress state (no checkout)", err, "Visit in 'in_progress' status should have null checkout_time");
  }

  // --- Check-out visit ---
  try {
    if (!visitId) throw new Error("No visit ID for checkout");

    const checkoutTime = new Date().toISOString();
    const { error } = await client
      .from("agent_visits")
      .update({
        check_out_at: checkoutTime,
      })
      .eq("id", visitId)
      .eq("agent_id", agent.userId);

    if (error) throwPg(error);

    const { data: verify, error: verifyErr } = await client
      .from("agent_visits")
      .select("check_out_at")
      .eq("id", visitId)
      .single();

    if (verifyErr) throwPg(verifyErr);
    if (!verify?.check_out_at) {
      throw new Error("Checkout time not saved");
    }

    ctx.pass(MODULE, "Check-out visit");
  } catch (err) {
    ctx.fail(MODULE, "Check-out visit", err, "Check RLS UPDATE on agent_visits — agent should update own visits");
  }

  // --- Fetch visit list for agent ---
  try {
    const { data, error } = await client
      .from("agent_visits")
      .select("id, farmer_id, check_in_at, check_out_at")
      .eq("agent_id", agent.userId)
      .eq("demo_tag", ctx.demoTag);

    if (error) throwPg(error);
    if (!data?.length) throw new Error("No visits found for agent");

    ctx.pass(MODULE, "Fetch visits list");
  } catch (err) {
    ctx.fail(MODULE, "Fetch visits list", err, "Check RLS SELECT on agent_visits for full list query");
  }

  // --- Agent cannot see other agent's visits ---
  try {
    const logistics = ctx.userOf("logistics");

    const { error: seedErr } = await ctx.adminClient
      .from("agent_visits")
      .insert({
        agent_id: logistics.userId,
        farmer_id: farmer.userId,
        check_in_at: new Date().toISOString(),
        demo_tag: ctx.demoTag,
      });

    if (seedErr) throwPg(seedErr);

    const { data, error } = await client
      .from("agent_visits")
      .select("id")
      .eq("agent_id", logistics.userId)
      .eq("demo_tag", ctx.demoTag);

    if (error) throwPg(error);

    if (data && data.length > 0) {
      throw new Error(`Agent can see another user's visits (${data.length} rows)`);
    }

    ctx.pass(MODULE, "Cannot see other agent visits");
  } catch (err) {
    ctx.fail(MODULE, "Cannot see other agent visits", err, "Check RLS on agent_visits — agent should only see own visits");
  }
}
