/**
 * My Farmers Tests — assigned farmers list, RLS scoping, deactivated exclusion
 */

import type { TestContext } from "../test-utils";

const MODULE = "My Farmers";

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

  // --- Ensure assignment exists (idempotent seed) ---
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

  // --- Agent can fetch assigned farmers ---
  try {
    const { data, error } = await client
      .from("agent_farmer_assignments")
      .select("agent_id, farmer_id, active")
      .eq("agent_id", agent.userId)
      .eq("active", true);

    if (error) throwPg(error);
    if (!data?.length) throw new Error("No active assignments returned");

    const hasFarmer = data.some((r: any) => r.farmer_id === farmer.userId);
    if (!hasFarmer) {
      throw new Error("Assigned farmer not in results");
    }

    ctx.pass(MODULE, "Fetch assigned farmers");
  } catch (err) {
    ctx.fail(MODULE, "Fetch assigned farmers", err, "Check RLS SELECT on agent_farmer_assignments for agent");
  }

  // --- Agent can read assigned farmer's profile ---
  try {
    const { data, error } = await client
      .from("profiles")
      .select("id, full_name, phone, district")
      .eq("id", farmer.userId)
      .maybeSingle();

    if (error) throwPg(error);
    if (!data) throw new Error("Cannot read assigned farmer's profile");

    if (data.id !== farmer.userId) {
      throw new Error(`Profile ID mismatch: expected ${farmer.userId}, got ${data.id}`);
    }

    ctx.pass(MODULE, "Read assigned farmer profile");
  } catch (err) {
    ctx.fail(MODULE, "Read assigned farmer profile", err, "Check RLS on profiles — agent should read assigned farmer via is_agent_assigned");
  }

  // --- Deactivated assignments are excluded ---
  try {
    await ctx.adminClient
      .from("agent_farmer_assignments")
      .update({ active: false })
      .eq("agent_id", agent.userId)
      .eq("farmer_id", farmer.userId);

    const { data, error } = await client
      .from("agent_farmer_assignments")
      .select("farmer_id")
      .eq("agent_id", agent.userId)
      .eq("active", true)
      .eq("demo_tag", ctx.demoTag);

    if (error) throwPg(error);

    const stillActive = (data ?? []).some((r: any) => r.farmer_id === farmer.userId);
    if (stillActive) {
      throw new Error("Deactivated assignment still shows as active");
    }

    ctx.pass(MODULE, "Deactivated exclusion");
  } catch (err) {
    ctx.fail(MODULE, "Deactivated exclusion", err, "Check that active=false assignments are filtered out");
  } finally {
    await ctx.adminClient
      .from("agent_farmer_assignments")
      .update({ active: true })
      .eq("agent_id", agent.userId)
      .eq("farmer_id", farmer.userId);
  }

  // --- Empty state: no assignments for a fresh query scope ---
  try {
    const { data, error } = await client
      .from("agent_farmer_assignments")
      .select("farmer_id")
      .eq("agent_id", agent.userId)
      .eq("demo_tag", "nonexistent_tag_xyz");

    if (error) throwPg(error);

    if (data && data.length > 0) {
      throw new Error(`Expected 0 rows for non-matching tag, got ${data.length}`);
    }

    ctx.pass(MODULE, "Empty state (no matching assignments)");
  } catch (err) {
    ctx.fail(MODULE, "Empty state (no matching assignments)", err, "Agent query with non-matching filter should return empty");
  }
}
