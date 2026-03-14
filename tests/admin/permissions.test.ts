/**
 * Permissions & RLS Tests — admin CAN read all, non-admin CANNOT access admin data, edge cases
 */

import type { TestContext } from "../test-utils";
import { createAuthedClient } from "../test-utils";

const MODULE = "Permissions & RLS";

function throwPg(error: unknown): never {
  if (error && typeof error === "object" && "message" in error) {
    throw new Error((error as { message: string }).message);
  }
  throw error;
}

export async function run(ctx: TestContext): Promise<void> {
  const admin = ctx.userOf("admin");
  const farmer = ctx.userOf("farmer");
  const buyer = ctx.userOf("buyer");
  const agent = ctx.userOf("agent");
  const logistics = ctx.userOf("logistics");
  const adminClient = ctx.authedClient("admin");

  // ===================== ADMIN CAN =====================

  // --- Admin CAN read all profiles ---
  try {
    const { data, error } = await adminClient
      .from("profiles")
      .select("id")
      .eq("demo_tag", ctx.demoTag);

    if (error) throwPg(error);
    if (!data || data.length < 5) {
      throw new Error(`Admin sees only ${data?.length ?? 0} profiles, expected at least 5`);
    }

    ctx.pass(MODULE, "CAN read all profiles");
  } catch (err) {
    ctx.fail(MODULE, "CAN read all profiles", err, "Admin RLS should grant read access to all profiles");
  }

  // --- Admin CAN read all farmlands ---
  try {
    const { data, error } = await adminClient
      .from("farmlands")
      .select("id")
      .eq("demo_tag", ctx.demoTag);

    if (error) throwPg(error);

    ctx.pass(MODULE, "CAN read all farmlands");
  } catch (err) {
    ctx.fail(MODULE, "CAN read all farmlands", err, "Admin RLS should grant read access to all farmlands");
  }

  // --- Admin CAN read all crops ---
  try {
    const { data, error } = await adminClient
      .from("crops")
      .select("id")
      .eq("demo_tag", ctx.demoTag);

    if (error) throwPg(error);

    ctx.pass(MODULE, "CAN read all crops");
  } catch (err) {
    ctx.fail(MODULE, "CAN read all crops", err, "Admin RLS should grant read access to all crops");
  }

  // --- Admin CAN read all listings ---
  try {
    const { data, error } = await adminClient
      .from("listings")
      .select("id")
      .eq("demo_tag", ctx.demoTag);

    if (error) throwPg(error);

    ctx.pass(MODULE, "CAN read all listings");
  } catch (err) {
    ctx.fail(MODULE, "CAN read all listings", err, "Admin RLS should grant read access to all listings");
  }

  // --- Admin CAN read all market_orders ---
  try {
    const { data, error } = await adminClient
      .from("market_orders")
      .select("id")
      .eq("demo_tag", ctx.demoTag);

    if (error) throwPg(error);

    ctx.pass(MODULE, "CAN read all orders");
  } catch (err) {
    ctx.fail(MODULE, "CAN read all orders", err, "Admin RLS should grant read access to all market_orders");
  }

  // --- Admin CAN read all transport_requests ---
  try {
    const { data, error } = await adminClient
      .from("transport_requests")
      .select("id")
      .eq("demo_tag", ctx.demoTag);

    if (error) throwPg(error);

    ctx.pass(MODULE, "CAN read all transport");
  } catch (err) {
    ctx.fail(MODULE, "CAN read all transport", err, "Admin RLS should grant read access to all transport_requests");
  }

  // --- Admin CAN read admin_users ---
  try {
    const { data, error } = await adminClient
      .from("admin_users")
      .select("user_id, name, role")
      .eq("user_id", admin.userId)
      .limit(1);

    if (error) throwPg(error);
    if (!data?.length) throw new Error("Admin cannot read own admin_users row");

    ctx.pass(MODULE, "CAN read admin_users");
  } catch (err) {
    ctx.fail(MODULE, "CAN read admin_users", err, "Admin RLS should grant read access to admin_users");
  }

  // --- Admin CAN read notifications ---
  try {
    const { error } = await adminClient
      .from("notifications")
      .select("id")
      .limit(5);

    if (error) throwPg(error);

    ctx.pass(MODULE, "CAN read notifications");
  } catch (err) {
    ctx.fail(MODULE, "CAN read notifications", err, "Admin RLS should grant read access to notifications");
  }

  // ===================== NON-ADMIN CANNOT =====================

  // --- Farmer CANNOT read admin_users ---
  try {
    const farmerClient = ctx.authedClient("farmer");
    const { data, error } = await farmerClient
      .from("admin_users")
      .select("user_id")
      .limit(1);

    if (error) throwPg(error);

    if (data && data.length > 0) {
      throw new Error(`Farmer sees ${data.length} admin_users rows — RLS broken`);
    }

    ctx.pass(MODULE, "Farmer CANNOT read admin_users");
  } catch (err) {
    ctx.fail(MODULE, "Farmer CANNOT read admin_users", err, "RLS on admin_users must block farmer access");
  }

  // --- Buyer CANNOT read admin_users ---
  try {
    const buyerClient = ctx.authedClient("buyer");
    const { data, error } = await buyerClient
      .from("admin_users")
      .select("user_id")
      .limit(1);

    if (error) throwPg(error);

    if (data && data.length > 0) {
      throw new Error(`Buyer sees ${data.length} admin_users rows — RLS broken`);
    }

    ctx.pass(MODULE, "Buyer CANNOT read admin_users");
  } catch (err) {
    ctx.fail(MODULE, "Buyer CANNOT read admin_users", err, "RLS on admin_users must block buyer access");
  }

  // --- Agent CANNOT read admin_users ---
  try {
    const agentClient = ctx.authedClient("agent");
    const { data, error } = await agentClient
      .from("admin_users")
      .select("user_id")
      .limit(1);

    if (error) throwPg(error);

    if (data && data.length > 0) {
      throw new Error(`Agent sees ${data.length} admin_users rows — RLS broken`);
    }

    ctx.pass(MODULE, "Agent CANNOT read admin_users");
  } catch (err) {
    ctx.fail(MODULE, "Agent CANNOT read admin_users", err, "RLS on admin_users must block agent access");
  }

  // --- Buyer CANNOT see farmer's farmlands ---
  try {
    const buyerClient = ctx.authedClient("buyer");
    const { data, error } = await buyerClient
      .from("farmlands")
      .select("id")
      .eq("farmer_id", farmer.userId)
      .eq("demo_tag", ctx.demoTag);

    if (error) throwPg(error);

    if (data && data.length > 0) {
      throw new Error(`Buyer sees farmer's farmlands (${data.length} rows) — RLS broken`);
    }

    ctx.pass(MODULE, "Buyer CANNOT see farmlands");
  } catch (err) {
    ctx.fail(MODULE, "Buyer CANNOT see farmlands", err, "RLS on farmlands must block buyer access to farmer data");
  }

  // --- Agent CANNOT see transporters ---
  try {
    const agentClient = ctx.authedClient("agent");
    const { data, error } = await agentClient
      .from("transporters")
      .select("user_id")
      .limit(1);

    if (error) throwPg(error);

    if (data && data.length > 0) {
      throw new Error(`Agent sees transporters (${data.length} rows) — RLS broken`);
    }

    ctx.pass(MODULE, "Agent CANNOT see transporters");
  } catch (err) {
    ctx.fail(MODULE, "Agent CANNOT see transporters", err, "RLS on transporters must block agent access");
  }

  // ===================== EDGE CASES =====================

  // --- Invalid auth token returns error ---
  try {
    const badClient = createAuthedClient(ctx.supabaseUrl, ctx.anonKey, "invalid_token_xyz");
    const { data, error } = await badClient
      .from("profiles")
      .select("id")
      .limit(1);

    if (!error && data && data.length > 0) {
      throw new Error("Invalid token returned data — auth bypass detected");
    }

    ctx.pass(MODULE, "Invalid token rejected");
  } catch (err) {
    if (err instanceof Error && err.message.includes("auth bypass")) {
      ctx.fail(MODULE, "Invalid token rejected", err, "Auth layer must reject invalid JWT tokens");
    } else {
      ctx.pass(MODULE, "Invalid token rejected");
    }
  }

  // --- Empty table query returns empty array ---
  try {
    const { data, error } = await adminClient
      .from("profiles")
      .select("id")
      .eq("demo_tag", "IMPOSSIBLE_TAG_THAT_NEVER_EXISTS_999");

    if (error) throwPg(error);

    if (!Array.isArray(data)) {
      throw new Error(`Expected array for empty query, got ${typeof data}`);
    }

    if (data.length !== 0) {
      throw new Error(`Expected 0 results, got ${data.length}`);
    }

    ctx.pass(MODULE, "Empty query returns array");
  } catch (err) {
    ctx.fail(MODULE, "Empty query returns array", err, "Supabase should return empty array, not error, for no-match queries");
  }
}
