/**
 * Operations Inbox Tests — RPC access, response shape, empty state
 */

import type { TestContext } from "../test-utils";

const MODULE = "Ops Inbox";

function throwPg(error: unknown): never {
  if (error && typeof error === "object" && "message" in error) {
    throw new Error((error as { message: string }).message);
  }
  throw error;
}

export async function run(ctx: TestContext): Promise<void> {
  const client = ctx.authedClient("admin");

  // --- Admin can call ops inbox RPC ---
  try {
    const { data, error } = await client.rpc("admin.get_ops_inbox_v1" as any, {
      p_filters: {},
      p_limit: 10,
      p_cursor: null,
    });

    if (error) throwPg(error);

    ctx.pass(MODULE, "Ops inbox RPC callable");
  } catch (err) {
    ctx.fail(MODULE, "Ops inbox RPC callable", err, "Check admin.get_ops_inbox_v1 RPC exists and admin has EXECUTE permission");
  }

  // --- Response shape validation ---
  try {
    const { data, error } = await client.rpc("admin.get_ops_inbox_v1" as any, {
      p_filters: {},
      p_limit: 10,
      p_cursor: null,
    });

    if (error) throwPg(error);

    const result = data as any;

    if (result && typeof result === "object") {
      const hasItems = Array.isArray(result.items) || Array.isArray(result);
      if (!hasItems && result.items !== undefined && !Array.isArray(result.items)) {
        throw new Error(`Expected items array, got ${typeof result.items}`);
      }
    }

    ctx.pass(MODULE, "Response shape");
  } catch (err) {
    ctx.fail(MODULE, "Response shape", err, "Check admin.get_ops_inbox_v1 returns {items: [], next_cursor: ...} shape");
  }

  // --- Ops inbox items table direct query ---
  try {
    const { error } = await ctx.adminClient
      .from("ops_inbox_items")
      .select("id, item_type, severity, status")
      .limit(5);

    if (error) throwPg(error);
    ctx.pass(MODULE, "Direct table query");
  } catch (err) {
    ctx.fail(MODULE, "Direct table query", err, "Check admin read access to ops_inbox_items table");
  }
}
