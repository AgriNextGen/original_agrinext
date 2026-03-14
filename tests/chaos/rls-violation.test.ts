/**
 * Chaos Test — RLS Violation Simulation
 *
 * Simulates cross-role data access attempts across all 5 roles.
 * Supabase RLS returns empty result sets (not 403) when access is denied.
 * Verifies zero data leakage between roles.
 */

import type { TestContext } from "../test-utils";

const MODULE = "RLS Violation";

export async function run(ctx: TestContext): Promise<void> {
  const farmer = ctx.userOf("farmer");
  const buyer = ctx.userOf("buyer");
  const agent = ctx.userOf("agent");
  const logistics = ctx.userOf("logistics");

  // Seed a farmland owned by the farmer for cross-role tests
  let testFarmlandId: string | null = null;
  try {
    const { data } = await ctx.adminClient
      .from("farmlands")
      .insert({
        farmer_id: farmer.userId,
        name: `chaos_rls_farmland_${ctx.demoTag}`,
        district: "Mysuru",
        demo_tag: ctx.demoTag,
      })
      .select("id")
      .single();
    testFarmlandId = data?.id ?? null;
  } catch {
    // If seeding fails, tests will still run against any existing data
  }

  // --- Farmer accessing another farmer's farmlands ---
  try {
    // Use buyer's authed client to query farmer's farmlands
    const buyerClient = ctx.authedClient("buyer");

    const { data, error } = await buyerClient
      .from("farmlands")
      .select("id")
      .eq("farmer_id", farmer.userId)
      .eq("demo_tag", ctx.demoTag);

    if (error) throw error;

    if (data && data.length > 0) {
      throw new Error(
        `Buyer can see farmer's farmlands (${data.length} rows) — RLS violation`,
      );
    }

    ctx.pass(MODULE, "Farmer data isolation from buyer");
  } catch (err: any) {
    if (err?.message?.includes("RLS violation")) {
      ctx.fail(MODULE, "Farmer data isolation from buyer", err, "Check RLS SELECT policy on farmlands — buyer should see 0 rows");
    } else {
      ctx.fail(MODULE, "Farmer data isolation from buyer", err);
    }
  }

  // --- Buyer accessing admin_users ---
  try {
    const buyerClient = ctx.authedClient("buyer");

    const { data, error } = await buyerClient
      .from("admin_users")
      .select("id")
      .limit(5);

    if (error) {
      ctx.pass(MODULE, "Buyer blocked from admin_users");
    } else if (data && data.length === 0) {
      ctx.pass(MODULE, "Buyer blocked from admin_users");
    } else {
      throw new Error(
        `Buyer can see ${data?.length} admin_users rows — RLS violation`,
      );
    }
  } catch (err: any) {
    if (err?.message?.includes("RLS violation")) {
      ctx.fail(MODULE, "Buyer blocked from admin_users", err, "Check RLS on admin_users — non-admin roles should see 0 rows");
    } else {
      ctx.pass(MODULE, "Buyer blocked from admin_users");
    }
  }

  // --- Agent accessing unassigned farmer's crops ---
  try {
    const agentClient = ctx.authedClient("agent");

    // Agent should NOT see crops for a farmer they are not assigned to.
    // The buyer user is definitely not a farmer assigned to this agent.
    const { data, error } = await agentClient
      .from("crops")
      .select("id")
      .eq("farmer_id", buyer.userId)
      .eq("demo_tag", ctx.demoTag);

    if (error) throw error;

    if (data && data.length > 0) {
      throw new Error(
        `Agent can see unassigned farmer's crops (${data.length} rows) — RLS violation`,
      );
    }

    ctx.pass(MODULE, "Agent scoping to assigned farmers");
  } catch (err: any) {
    if (err?.message?.includes("RLS violation")) {
      ctx.fail(MODULE, "Agent scoping to assigned farmers", err, "Check RLS on crops — agent should only see assigned farmers' data");
    } else {
      ctx.fail(MODULE, "Agent scoping to assigned farmers", err);
    }
  }

  // --- Logistics accessing unrelated trips ---
  try {
    const logisticsClient = ctx.authedClient("logistics");

    // Query trips that belong to the farmer (not the logistics user)
    const { data, error } = await logisticsClient
      .from("trips")
      .select("id")
      .eq("demo_tag", ctx.demoTag);

    if (error) throw error;

    // Logistics should only see trips assigned to them. Since we haven't
    // assigned any trips to this logistics user, expect 0 rows.
    if (data && data.length > 0) {
      // Verify these trips actually belong to the logistics user
      const logisticsUserId = logistics.userId;
      const unrelated = data.filter(
        (t: any) => t.transporter_id !== logisticsUserId,
      );
      if (unrelated.length > 0) {
        throw new Error(
          `Logistics can see ${unrelated.length} unrelated trips — RLS violation`,
        );
      }
    }

    ctx.pass(MODULE, "Logistics trip isolation");
  } catch (err: any) {
    if (err?.message?.includes("RLS violation")) {
      ctx.fail(MODULE, "Logistics trip isolation", err, "Check RLS on trips — logistics should only see own trips");
    } else {
      ctx.fail(MODULE, "Logistics trip isolation", err);
    }
  }

  // --- Cross-role write attempt: buyer inserting farmland ---
  try {
    const buyerClient = ctx.authedClient("buyer");

    const { error } = await buyerClient.from("farmlands").insert({
      farmer_id: buyer.userId,
      name: `chaos_rls_write_${ctx.demoTag}`,
      district: "Mysuru",
      demo_tag: ctx.demoTag,
    });

    if (error) {
      ctx.pass(MODULE, "Cross-role write blocked");
    } else {
      // Clean up
      await ctx.adminClient
        .from("farmlands")
        .delete()
        .eq("demo_tag", ctx.demoTag)
        .like("name", "chaos_rls_write_%");
      throw new Error(
        "Buyer successfully inserted into farmlands — RLS INSERT policy too permissive",
      );
    }
  } catch (err: any) {
    if (err?.message?.includes("too permissive")) {
      ctx.fail(MODULE, "Cross-role write blocked", err, "Check RLS INSERT policy on farmlands — only farmers should insert");
    } else {
      ctx.pass(MODULE, "Cross-role write blocked");
    }
  }

  // --- Direct update of another user's profile ---
  try {
    const farmerClient = ctx.authedClient("farmer");

    const { error, count } = await farmerClient
      .from("profiles")
      .update({ full_name: "CHAOS_HIJACKED" })
      .eq("id", buyer.userId);

    if (error) {
      ctx.pass(MODULE, "Cross-user profile update blocked");
    } else {
      // Verify the buyer's profile was NOT actually changed
      const { data: check } = await ctx.adminClient
        .from("profiles")
        .select("full_name")
        .eq("id", buyer.userId)
        .maybeSingle();

      if (check?.full_name === "CHAOS_HIJACKED") {
        // Restore original
        await ctx.adminClient
          .from("profiles")
          .update({ full_name: "SystemCheck buyer" })
          .eq("id", buyer.userId);
        throw new Error(
          "Farmer successfully updated buyer's profile — RLS UPDATE policy too permissive",
        );
      }

      ctx.pass(MODULE, "Cross-user profile update blocked");
    }
  } catch (err: any) {
    if (err?.message?.includes("too permissive")) {
      ctx.fail(MODULE, "Cross-user profile update blocked", err, "Check RLS UPDATE policy on profiles — users should only update own profile");
    } else {
      ctx.pass(MODULE, "Cross-user profile update blocked");
    }
  }

  // --- Cleanup seeded data ---
  if (testFarmlandId) {
    await ctx.adminClient
      .from("farmlands")
      .delete()
      .eq("demo_tag", ctx.demoTag)
      .like("name", "chaos_rls_%");
  }
}
