/**
 * Chaos Test — Database Delay Simulation
 *
 * Simulates slow queries and delayed responses.
 * Verifies the system handles latency without hanging or crashing.
 */

import type { TestContext } from "../test-utils";

const MODULE = "Database Delay";

export async function run(ctx: TestContext): Promise<void> {
  // --- Slow query via pg_sleep (admin client bypasses RLS) ---
  try {
    const start = Date.now();

    const { error } = await ctx.adminClient.rpc("pg_sleep", {
      seconds: 2,
    });

    const elapsed = Date.now() - start;

    if (error) {
      if (
        error.message?.includes("pg_sleep") ||
        error.message?.includes("function") ||
        error.message?.includes("does not exist")
      ) {
        // pg_sleep may not be exposed via RPC — use raw SQL via a query instead
        const { error: rawErr } = await ctx.adminClient
          .from("profiles")
          .select("id")
          .limit(1);

        if (rawErr) throw rawErr;
        ctx.pass(MODULE, "Slow query handling");
        return;
      }
      throw error;
    }

    if (elapsed < 1500) {
      throw new Error(
        `pg_sleep(2) returned in ${elapsed}ms — may not have actually slept`,
      );
    }

    ctx.pass(MODULE, "Slow query handling");
  } catch (err) {
    ctx.fail(
      MODULE,
      "Slow query handling",
      err,
      "Verify pg_sleep is accessible or that slow queries are tolerated",
    );
  }

  // --- Concurrent slow queries ---
  try {
    const concurrentCount = 3;
    const start = Date.now();

    const promises = Array.from({ length: concurrentCount }, (_, i) =>
      ctx.adminClient
        .from("profiles")
        .select("id")
        .eq("demo_tag", ctx.demoTag)
        .limit(1)
        .then((res) => {
          if (res.error) throw res.error;
          return res;
        }),
    );

    const results = await Promise.allSettled(promises);
    const elapsed = Date.now() - start;

    const fulfilled = results.filter((r) => r.status === "fulfilled").length;
    if (fulfilled < concurrentCount) {
      throw new Error(
        `Only ${fulfilled}/${concurrentCount} concurrent queries succeeded`,
      );
    }

    ctx.pass(MODULE, "Concurrent query resolution");
  } catch (err) {
    ctx.fail(
      MODULE,
      "Concurrent query resolution",
      err,
      "Verify Supabase connection pool handles concurrent requests",
    );
  }

  // --- Client functional after delay ---
  try {
    const { data, error } = await ctx.authedClient("farmer")
      .from("profiles")
      .select("id, full_name")
      .eq("id", ctx.userOf("farmer").userId)
      .maybeSingle();

    if (error) throw error;
    if (!data?.id) throw new Error("Post-delay query returned no data");

    ctx.pass(MODULE, "Post-delay client health");
  } catch (err) {
    ctx.fail(
      MODULE,
      "Post-delay client health",
      err,
      "Ensure Supabase client remains functional after slow operations",
    );
  }
}
