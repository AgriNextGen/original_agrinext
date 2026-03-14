/**
 * Database Tests — connectivity and key table existence verification
 */

import type { TestContext } from "./test-utils";

const MODULE = "Database Tests";

function throwPg(error: unknown): never {
  if (error && typeof error === "object" && "message" in error) {
    throw new Error((error as { message: string }).message);
  }
  throw error;
}

const KEY_TABLES = [
  "profiles",
  "user_roles",
  "farmlands",
  "crops",
  "listings",
  "market_orders",
  "transport_requests",
  "trips",
  "vehicles",
  "notifications",
  "agent_farmer_assignments",
  "agent_tasks",
  "buyers",
];

export async function run(ctx: TestContext): Promise<void> {
  // --- Database connectivity ---
  try {
    const { data, error } = await ctx.adminClient
      .from("profiles")
      .select("id")
      .limit(1);

    if (error) throw error;
    ctx.pass(MODULE, "Database connectivity");
  } catch (err) {
    ctx.fail(MODULE, "Database connectivity", err, "Check SUPABASE_URL and SERVICE_ROLE_KEY are correct");
  }

  // Tables that use composite keys instead of a single `id` column
  const COMPOSITE_KEY_TABLES: Record<string, string> = {
    user_roles: "user_id",
    agent_farmer_assignments: "agent_id",
  };

  // --- Verify each key table exists and is queryable ---
  for (const table of KEY_TABLES) {
    try {
      const col = COMPOSITE_KEY_TABLES[table] ?? "id";
      const { error } = await ctx.adminClient
        .from(table)
        .select(col)
        .limit(0);

      if (error) throwPg(error);
      ctx.pass(MODULE, `Table: ${table}`);
    } catch (err) {
      ctx.fail(MODULE, `Table: ${table}`, err, `Table "${table}" may not exist or lacks SELECT permission`);
    }
  }
}
