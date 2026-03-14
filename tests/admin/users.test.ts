/**
 * User Management Tests — profiles fetch, user_roles, search, pagination, record shape
 */

import type { TestContext } from "../test-utils";

const MODULE = "User Management";

function throwPg(error: unknown): never {
  if (error && typeof error === "object" && "message" in error) {
    throw new Error((error as { message: string }).message);
  }
  throw error;
}

export async function run(ctx: TestContext): Promise<void> {
  const client = ctx.authedClient("admin");

  // --- Fetch all profiles ---
  try {
    const { data, error } = await client
      .from("profiles")
      .select("id, full_name, phone, district")
      .eq("demo_tag", ctx.demoTag);

    if (error) throwPg(error);
    if (!data?.length) throw new Error("Admin sees no profiles");

    ctx.pass(MODULE, "Fetch profiles");
  } catch (err) {
    ctx.fail(MODULE, "Fetch profiles", err, "Check admin RLS read access to profiles table");
  }

  // --- Fetch user_roles ---
  try {
    const { data, error } = await client
      .from("user_roles")
      .select("user_id, role")
      .limit(10);

    if (error) throwPg(error);
    if (!data?.length) throw new Error("Admin sees no user_roles");

    ctx.pass(MODULE, "Fetch user_roles");
  } catch (err) {
    ctx.fail(MODULE, "Fetch user_roles", err, "Check admin RLS read access to user_roles table");
  }

  // --- Record shape validation ---
  try {
    const { data, error } = await client
      .from("profiles")
      .select("id, full_name, phone, district, village, preferred_language, account_status, created_at")
      .eq("demo_tag", ctx.demoTag)
      .limit(1)
      .single();

    if (error) throwPg(error);

    const requiredFields = ["id", "full_name", "phone", "district"];
    for (const field of requiredFields) {
      if ((data as any)[field] === undefined) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    ctx.pass(MODULE, "Record shape");
  } catch (err) {
    ctx.fail(MODULE, "Record shape", err, "Check profiles table schema has id, full_name, phone, district columns");
  }

  // --- Search by name (ILIKE) ---
  try {
    const { data, error } = await client
      .from("profiles")
      .select("id, full_name")
      .ilike("full_name", "%SystemCheck%")
      .eq("demo_tag", ctx.demoTag);

    if (error) throwPg(error);
    if (!data?.length) throw new Error("Search by name returned no results");

    ctx.pass(MODULE, "Search by name");
  } catch (err) {
    ctx.fail(MODULE, "Search by name", err, "Check admin can query profiles with ILIKE filter");
  }

  // --- Pagination via .range() ---
  try {
    const { data: page1, error: p1Err } = await client
      .from("profiles")
      .select("id")
      .eq("demo_tag", ctx.demoTag)
      .range(0, 1);

    if (p1Err) throwPg(p1Err);

    const { data: page2, error: p2Err } = await client
      .from("profiles")
      .select("id")
      .eq("demo_tag", ctx.demoTag)
      .range(2, 3);

    if (p2Err) throwPg(p2Err);

    if (!page1?.length) throw new Error("Page 1 empty");
    // Page 2 may be empty if fewer than 3 users, but should not error

    ctx.pass(MODULE, "Pagination");
  } catch (err) {
    ctx.fail(MODULE, "Pagination", err, "Check that profiles table supports range-based pagination");
  }

  // --- Empty filter returns no results ---
  try {
    const { data, error } = await client
      .from("profiles")
      .select("id")
      .eq("full_name", "NONEXISTENT_USER_XYZZY_999");

    if (error) throwPg(error);

    if (data && data.length > 0) {
      throw new Error(`Expected 0 results for impossible filter, got ${data.length}`);
    }

    ctx.pass(MODULE, "Empty filter");
  } catch (err) {
    ctx.fail(MODULE, "Empty filter", err, "Check that impossible filter returns empty array, not error");
  }
}
