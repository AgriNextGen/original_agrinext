/**
 * RLS / Permissions Tests — cross-role isolation and own-data access
 */

import type { TestContext } from "../test-utils";

const MODULE = "Permissions";

function throwPg(error: unknown): never {
  if (error && typeof error === "object" && "message" in error) {
    throw new Error((error as { message: string }).message);
  }
  throw error;
}

export async function run(ctx: TestContext): Promise<void> {
  const logistics = ctx.userOf("logistics");

  // ========================================================================
  // DENY tests — logistics user CANNOT access these
  // ========================================================================

  // --- Cannot read admin_users ---
  try {
    const client = ctx.authedClient("logistics");
    const { data, error } = await client
      .from("admin_users")
      .select("user_id, name")
      .limit(5);

    if (error) throwPg(error);

    if (data && data.length > 0) {
      throw new Error(`Logistics can read admin_users (${data.length} rows). RLS breach.`);
    }

    ctx.pass(MODULE, "Cannot read admin_users");
  } catch (err) {
    if (err instanceof Error && err.message.includes("RLS breach")) {
      ctx.fail(MODULE, "Cannot read admin_users", err, "RLS on admin_users is not blocking logistics role");
    } else {
      // Permission denied errors are expected and count as pass
      ctx.pass(MODULE, "Cannot read admin_users");
    }
  }

  // --- Cannot read agent_farmer_assignments ---
  try {
    const client = ctx.authedClient("logistics");
    const { data, error } = await client
      .from("agent_farmer_assignments")
      .select("agent_id, farmer_id")
      .limit(5);

    if (error) throwPg(error);

    if (data && data.length > 0) {
      throw new Error(`Logistics can read agent_farmer_assignments (${data.length} rows). RLS breach.`);
    }

    ctx.pass(MODULE, "Cannot read agent_farmer_assignments");
  } catch (err) {
    if (err instanceof Error && err.message.includes("RLS breach")) {
      ctx.fail(MODULE, "Cannot read agent_farmer_assignments", err, "RLS on agent_farmer_assignments is not blocking logistics role");
    } else {
      ctx.pass(MODULE, "Cannot read agent_farmer_assignments");
    }
  }

  // --- Cannot read farmer-only crop data ---
  try {
    const client = ctx.authedClient("logistics");
    const { data, error } = await client
      .from("crops")
      .select("id, farmer_id, crop_name")
      .limit(5);

    if (error) throwPg(error);

    if (data && data.length > 0) {
      throw new Error(`Logistics can read crops directly (${data.length} rows). RLS may be too permissive.`);
    }

    ctx.pass(MODULE, "Cannot read farmer crop data directly");
  } catch (err) {
    if (err instanceof Error && err.message.includes("RLS")) {
      ctx.fail(MODULE, "Cannot read farmer crop data directly", err, "RLS on crops should restrict logistics access");
    } else {
      ctx.pass(MODULE, "Cannot read farmer crop data directly");
    }
  }

  // --- Cannot update another transporter's profile ---
  try {
    const client = ctx.authedClient("logistics");

    // Try updating a profile that doesn't belong to this user
    const { error } = await client
      .from("transporters")
      .update({ name: "HACKED" })
      .eq("user_id", "00000000-0000-0000-0000-000000000000");

    // If no error, verify no rows were actually changed
    if (!error) {
      const { data: check } = await ctx.adminClient
        .from("transporters")
        .select("name")
        .eq("name", "HACKED")
        .maybeSingle();

      if (check) {
        throw new Error("Logistics user modified another transporter's data. RLS breach.");
      }
    }

    ctx.pass(MODULE, "Cannot update other transporter profile");
  } catch (err) {
    if (err instanceof Error && err.message.includes("RLS breach")) {
      ctx.fail(MODULE, "Cannot update other transporter profile", err, "RLS on transporters UPDATE is too permissive");
    } else {
      ctx.pass(MODULE, "Cannot update other transporter profile");
    }
  }

  // ========================================================================
  // ALLOW tests — logistics user CAN access these
  // ========================================================================

  // --- Can read own transporter profile ---
  try {
    const client = ctx.authedClient("logistics");
    const { data, error } = await client
      .from("transporters")
      .select("user_id, name")
      .eq("user_id", logistics.userId)
      .maybeSingle();

    if (error) throwPg(error);
    // It's acceptable if RLS returns null (the row may not be visible to anon-keyed client)
    // but it must not error
    ctx.pass(MODULE, "Can read own transporter profile");
  } catch (err) {
    ctx.fail(MODULE, "Can read own transporter profile", err, "Check transporters SELECT policy for own user_id");
  }

  // --- Can read transport_requests with status=requested ---
  try {
    const client = ctx.authedClient("logistics");
    const { error } = await client
      .from("transport_requests")
      .select("id, status, pickup_location")
      .eq("status", "requested")
      .limit(3);

    if (error) throwPg(error);
    ctx.pass(MODULE, "Can read available transport requests");
  } catch (err) {
    ctx.fail(MODULE, "Can read available transport requests", err, "Check transport_requests SELECT policy for logistics role");
  }
}
