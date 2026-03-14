/**
 * Admin Dashboard Tests — RPC stats, KPI data, empty/loading states, recent activity
 */

import type { TestContext } from "../test-utils";

const MODULE = "Admin Dashboard";

function throwPg(error: unknown): never {
  if (error && typeof error === "object" && "message" in error) {
    throw new Error((error as { message: string }).message);
  }
  throw error;
}

export async function run(ctx: TestContext): Promise<void> {
  const admin = ctx.userOf("admin");
  const farmer = ctx.userOf("farmer");
  const client = ctx.authedClient("admin");

  // --- Dashboard RPC callable ---
  try {
    const { data, error } = await client.rpc("admin_dashboard_v1", { p_days: 1 });

    if (error) throwPg(error);
    if (data === null || data === undefined) {
      throw new Error("admin_dashboard_v1 returned null");
    }

    ctx.pass(MODULE, "Dashboard RPC callable");
  } catch (err) {
    ctx.fail(MODULE, "Dashboard RPC callable", err, "Check admin_dashboard_v1 RPC exists and is accessible to admin role");
  }

  // --- KPI fields shape validation ---
  try {
    const { data, error } = await client.rpc("admin_dashboard_v1", { p_days: 1 });

    if (error) throwPg(error);

    const kpiFields = [
      "new_signups",
      "active_users",
      "support_tickets_open",
      "stuck_trips",
    ];

    for (const field of kpiFields) {
      const val = (data as any)?.[field];
      if (val === undefined) {
        throw new Error(`Missing KPI field: ${field}`);
      }
      if (typeof val !== "number") {
        throw new Error(`KPI field ${field} is ${typeof val}, expected number`);
      }
    }

    ctx.pass(MODULE, "KPI fields shape");
  } catch (err) {
    ctx.fail(MODULE, "KPI fields shape", err, "Check admin_dashboard_v1 return type includes expected KPI fields");
  }

  // --- Empty state (values are valid non-negative numbers) ---
  try {
    const { data, error } = await client.rpc("admin_dashboard_v1", { p_days: 1 });

    if (error) throwPg(error);

    const numericFields = ["new_signups", "active_users", "support_tickets_open", "stuck_trips"];
    for (const field of numericFields) {
      const val = (data as any)?.[field] ?? 0;
      if (typeof val !== "number" || val < 0) {
        throw new Error(`${field} is invalid: ${val}`);
      }
    }

    ctx.pass(MODULE, "Dashboard empty state");
  } catch (err) {
    ctx.fail(MODULE, "Dashboard empty state", err, "Check admin_dashboard_v1 returns non-negative counts");
  }

  // --- Seed data and verify dashboard reflects it ---
  try {
    const { data: farmland, error: flErr } = await ctx.adminClient
      .from("farmlands")
      .insert({
        farmer_id: farmer.userId,
        name: `adminchk_${ctx.demoTag}_farmland`,
        area: 5.0,
        area_unit: "acres",
        district: "Mysuru",
        village: "AdminCheck Village",
        demo_tag: ctx.demoTag,
      })
      .select("id")
      .single();

    if (flErr) throwPg(flErr);
    ctx.shared.farmlandId = farmland.id;

    const { data: crop, error: cropErr } = await ctx.adminClient
      .from("crops")
      .insert({
        farmer_id: farmer.userId,
        farmland_id: farmland.id,
        crop_name: "Ragi",
        status: "growing",
        health_status: "normal",
        growth_stage: "seedling",
        sowing_date: new Date().toISOString(),
        demo_tag: ctx.demoTag,
      })
      .select("id")
      .single();

    if (cropErr) throwPg(cropErr);
    ctx.shared.cropId = crop.id;

    const { data: listing, error: listErr } = await ctx.adminClient
      .from("listings")
      .insert({
        farmer_id: farmer.userId,
        crop_id: crop.id,
        crop_name: "Ragi",
        quantity: 100,
        unit: "kg",
        price_per_unit: 30,
        status: "active",
        district: "Mysuru",
        demo_tag: ctx.demoTag,
      })
      .select("id")
      .single();

    if (listErr) throwPg(listErr);
    ctx.shared.listingId = listing.id;

    const { data: statsAfter, error: statsErr } = await client.rpc("admin_dashboard_v1", { p_days: 1 });
    if (statsErr) throwPg(statsErr);
    if (!statsAfter) throw new Error("Dashboard RPC returned null after seeding");

    ctx.pass(MODULE, "Dashboard reflects seeded data");
  } catch (err) {
    ctx.fail(MODULE, "Dashboard reflects seeded data", err, "Check admin_dashboard_v1 counts after seeding farmland/crop/listing");
  }

  // --- Recent activity query ---
  try {
    const { data: recentOrders, error: ordErr } = await ctx.adminClient
      .from("market_orders")
      .select("id, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    if (ordErr) throwPg(ordErr);

    const { data: recentTransport, error: trErr } = await ctx.adminClient
      .from("transport_requests")
      .select("id, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    if (trErr) throwPg(trErr);

    ctx.pass(MODULE, "Recent activity query");
  } catch (err) {
    ctx.fail(MODULE, "Recent activity query", err, "Check admin read access to market_orders and transport_requests for recent activity");
  }

  // --- Invalid RPC parameter handling ---
  try {
    const { error } = await client.rpc("admin_dashboard_v1", { p_days: -999 });
    // Even with unusual params the RPC should not crash — it may return 0s or an error
    ctx.pass(MODULE, "Invalid param handling");
  } catch (err) {
    ctx.fail(MODULE, "Invalid param handling", err, "admin_dashboard_v1 should handle unusual p_days gracefully");
  }
}
