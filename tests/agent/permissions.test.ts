/**
 * Agent Permissions & RLS Tests — comprehensive cross-role isolation
 *
 * Verifies what an agent CAN and CANNOT access across the full schema.
 */

import type { TestContext } from "../test-utils";

const MODULE = "Permissions & RLS";

function throwPg(error: unknown): never {
  if (error && typeof error === "object" && "message" in error) {
    throw new Error((error as { message: string }).message);
  }
  throw error;
}

export async function run(ctx: TestContext): Promise<void> {
  const agent = ctx.userOf("agent");
  const farmer = ctx.userOf("farmer");
  const logistics = ctx.userOf("logistics");
  const buyer = ctx.userOf("buyer");
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

  // ===================== AGENT CANNOT =====================

  // --- Agent CANNOT read admin_users ---
  try {
    const { data, error } = await client
      .from("admin_users")
      .select("user_id, name, role")
      .limit(5);

    if (error) throwPg(error);

    if (data && data.length > 0) {
      throw new Error(`Agent sees ${data.length} admin_users rows — RLS broken`);
    }

    ctx.pass(MODULE, "CANNOT read admin_users");
  } catch (err) {
    ctx.fail(MODULE, "CANNOT read admin_users", err, "RLS on admin_users must block agent access");
  }

  // --- Agent CANNOT read transporters ---
  try {
    const { data, error } = await client
      .from("transporters")
      .select("user_id, name")
      .limit(5);

    if (error) throwPg(error);

    if (data && data.length > 0) {
      throw new Error(`Agent sees ${data.length} transporter rows — RLS broken`);
    }

    ctx.pass(MODULE, "CANNOT read transporters");
  } catch (err) {
    ctx.fail(MODULE, "CANNOT read transporters", err, "RLS on transporters must block agent access");
  }

  // --- Agent CANNOT read unassigned farmer's farmlands ---
  try {
    const { error: seedErr } = await ctx.adminClient
      .from("farmlands")
      .upsert(
        {
          farmer_id: buyer.userId,
          name: `agentchk_${ctx.demoTag}_perm_farmland`,
          area: 2.0,
          area_unit: "acres",
          district: "Bengaluru Urban",
          village: "Perm Test Village",
          demo_tag: ctx.demoTag,
        },
        { onConflict: "id" },
      );

    if (seedErr) throwPg(seedErr);

    const { data, error } = await client
      .from("farmlands")
      .select("id")
      .eq("farmer_id", buyer.userId)
      .eq("demo_tag", ctx.demoTag);

    if (error) throwPg(error);

    if (data && data.length > 0) {
      throw new Error(`Agent sees unassigned farmlands (${data.length} rows)`);
    }

    ctx.pass(MODULE, "CANNOT read unassigned farmlands");
  } catch (err) {
    ctx.fail(MODULE, "CANNOT read unassigned farmlands", err, "RLS on farmlands must restrict agent to assigned farmers only");
  }

  // --- Agent CANNOT read buyer market_orders ---
  try {
    const { data, error } = await client
      .from("market_orders")
      .select("id")
      .eq("buyer_id", buyer.userId)
      .limit(5);

    if (error) throwPg(error);

    if (data && data.length > 0) {
      throw new Error(`Agent sees buyer orders (${data.length} rows)`);
    }

    ctx.pass(MODULE, "CANNOT read buyer orders");
  } catch (err) {
    ctx.fail(MODULE, "CANNOT read buyer orders", err, "RLS on market_orders must block agent access to buyer data");
  }

  // --- Agent CANNOT modify another agent's tasks ---
  try {
    const { data: foreignTask, error: seedErr } = await ctx.adminClient
      .from("agent_tasks")
      .insert({
        agent_id: logistics.userId,
        farmer_id: farmer.userId,
        task_type: "visit",
        status: "pending",
        title: `agentchk_${ctx.demoTag}_foreign_task`,
        description: "Foreign task for permission test",
        demo_tag: ctx.demoTag,
      })
      .select("id")
      .single();

    if (seedErr) throwPg(seedErr);

    const { error: updateErr } = await client
      .from("agent_tasks")
      .update({ status: "completed" })
      .eq("id", foreignTask.id);

    if (updateErr) throwPg(updateErr);

    const { data: check } = await ctx.adminClient
      .from("agent_tasks")
      .select("status")
      .eq("id", foreignTask.id)
      .single();

    if (check?.status === "completed") {
      throw new Error("Agent modified another user's task — RLS failure");
    }

    ctx.pass(MODULE, "CANNOT modify foreign tasks");
  } catch (err) {
    if (err instanceof Error && err.message.includes("RLS failure")) {
      ctx.fail(MODULE, "CANNOT modify foreign tasks", err, "RLS UPDATE on agent_tasks must restrict to own tasks");
    } else {
      ctx.pass(MODULE, "CANNOT modify foreign tasks");
    }
  }

  // ===================== AGENT CAN =====================

  // --- Agent CAN read own assignments ---
  try {
    const { data, error } = await client
      .from("agent_farmer_assignments")
      .select("agent_id, farmer_id, active")
      .eq("agent_id", agent.userId);

    if (error) throwPg(error);
    if (!data?.length) throw new Error("Agent cannot read own assignments");

    ctx.pass(MODULE, "CAN read own assignments");
  } catch (err) {
    ctx.fail(MODULE, "CAN read own assignments", err, "RLS SELECT on agent_farmer_assignments must allow agent's own rows");
  }

  // --- Agent CAN read assigned farmer's crops ---
  try {
    const { data, error } = await client
      .from("crops")
      .select("id, crop_name, farmer_id")
      .eq("farmer_id", farmer.userId)
      .eq("demo_tag", ctx.demoTag);

    if (error) throwPg(error);
    ctx.pass(MODULE, "CAN read assigned farmer crops");
  } catch (err) {
    ctx.fail(MODULE, "CAN read assigned farmer crops", err, "RLS on crops must allow agent access to assigned farmer's crops");
  }

  // --- Agent CAN read own notifications ---
  try {
    const { data, error } = await client
      .from("notifications")
      .select("id, title")
      .eq("user_id", agent.userId)
      .limit(5);

    if (error) throwPg(error);
    ctx.pass(MODULE, "CAN read own notifications");
  } catch (err) {
    ctx.fail(MODULE, "CAN read own notifications", err, "RLS SELECT on notifications must allow agent's own");
  }

  // --- Agent CAN update own profile ---
  try {
    const { error } = await client
      .from("profiles")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", agent.userId);

    if (error) throwPg(error);
    ctx.pass(MODULE, "CAN update own profile");
  } catch (err) {
    ctx.fail(MODULE, "CAN update own profile", err, "RLS UPDATE on profiles must allow agent to update own row");
  }
}
