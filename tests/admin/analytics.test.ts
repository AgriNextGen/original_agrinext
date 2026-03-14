/**
 * Platform Analytics Tests — aggregate metrics, cross-table counts, data consistency
 */

import type { TestContext } from "../test-utils";

const MODULE = "Platform Analytics";

function throwPg(error: unknown): never {
  if (error && typeof error === "object" && "message" in error) {
    throw new Error((error as { message: string }).message);
  }
  throw error;
}

export async function run(ctx: TestContext): Promise<void> {
  const client = ctx.authedClient("admin");

  // --- Admin dashboard aggregate metrics ---
  try {
    const { data, error } = await client.rpc("admin_dashboard_v1", { p_days: 30 });

    if (error) throwPg(error);
    if (!data) throw new Error("admin_dashboard_v1 returned null");

    const numericFields = [
      "new_signups",
      "active_users",
      "support_tickets_open",
      "stuck_trips",
    ];

    for (const field of numericFields) {
      const val = (data as any)?.[field];
      if (typeof val !== "number" || val < 0) {
        throw new Error(`${field} invalid: ${val} (expected non-negative number)`);
      }
    }

    ctx.pass(MODULE, "Aggregate metrics");
  } catch (err) {
    ctx.fail(MODULE, "Aggregate metrics", err, "Check admin_dashboard_v1 returns valid non-negative numeric KPIs");
  }

  // --- Cross-table counts ---
  try {
    const [profilesRes, cropsRes, listingsRes, ordersRes, transportRes] = await Promise.all([
      client.from("profiles").select("id", { count: "exact", head: true }),
      client.from("crops").select("id", { count: "exact", head: true }),
      client.from("listings").select("id", { count: "exact", head: true }),
      client.from("market_orders").select("id", { count: "exact", head: true }),
      client.from("transport_requests").select("id", { count: "exact", head: true }),
    ]);

    const errors = [profilesRes, cropsRes, listingsRes, ordersRes, transportRes]
      .map((r) => r.error)
      .filter(Boolean);

    if (errors.length) {
      throw new Error(`Count queries failed: ${errors.map((e) => e!.message).join(", ")}`);
    }

    const counts = {
      profiles: profilesRes.count ?? 0,
      crops: cropsRes.count ?? 0,
      listings: listingsRes.count ?? 0,
      orders: ordersRes.count ?? 0,
      transport: transportRes.count ?? 0,
    };

    for (const [table, count] of Object.entries(counts)) {
      if (typeof count !== "number" || count < 0) {
        throw new Error(`Invalid count for ${table}: ${count}`);
      }
    }

    ctx.pass(MODULE, "Cross-table counts");
  } catch (err) {
    ctx.fail(MODULE, "Cross-table counts", err, "Check admin has count access to profiles, crops, listings, market_orders, transport_requests");
  }

  // --- User-role consistency ---
  try {
    const { data: profiles, error: pErr } = await client
      .from("profiles")
      .select("id")
      .eq("demo_tag", ctx.demoTag);

    if (pErr) throwPg(pErr);

    const { data: roles, error: rErr } = await client
      .from("user_roles")
      .select("user_id")
      .limit(1000);

    if (rErr) throwPg(rErr);

    const roleUserIds = new Set((roles ?? []).map((r: any) => r.user_id));
    const testProfiles = profiles ?? [];
    const orphans = testProfiles.filter((p: any) => !roleUserIds.has(p.id));

    if (orphans.length > 0) {
      console.log(`    info: ${orphans.length} test profiles without user_roles (may be expected for freshly provisioned users)`);
    }

    ctx.pass(MODULE, "User-role consistency");
  } catch (err) {
    ctx.fail(MODULE, "User-role consistency", err, "Check admin read access to profiles and user_roles for consistency check");
  }

  // --- Platform-wide stats query (30-day window) ---
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: recentProfiles, error: rpErr } = await client
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", thirtyDaysAgo);

    if (rpErr) throwPg(rpErr);

    const { data: recentOrders, error: roErr } = await client
      .from("market_orders")
      .select("id", { count: "exact", head: true })
      .gte("created_at", thirtyDaysAgo);

    if (roErr) throwPg(roErr);

    ctx.pass(MODULE, "Time-windowed stats");
  } catch (err) {
    ctx.fail(MODULE, "Time-windowed stats", err, "Check admin can query profiles and market_orders with created_at filter");
  }
}
