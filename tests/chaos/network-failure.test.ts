/**
 * Chaos Test — Network Failure Simulation
 *
 * Simulates failed API requests, dropped connections, and retry scenarios.
 * Verifies the system returns structured errors without unhandled rejections.
 */

import { createClient } from "@supabase/supabase-js";
import type { TestContext } from "../test-utils";

const MODULE = "Network Failure";

export async function run(ctx: TestContext): Promise<void> {
  // --- Fetch to unreachable Supabase URL ---
  try {
    const badClient = createClient(
      "https://unreachable-instance-000.supabase.co",
      ctx.anonKey,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data, error } = await badClient
      .from("profiles")
      .select("id")
      .limit(1);

    if (error) {
      ctx.pass(MODULE, "Unreachable host returns error");
    } else {
      throw new Error(
        "Expected error from unreachable host but query appeared to succeed",
      );
    }
  } catch (err: any) {
    if (err?.message?.includes("Expected error")) {
      ctx.fail(MODULE, "Unreachable host returns error", err);
    } else {
      ctx.pass(MODULE, "Unreachable host returns error");
    }
  }

  // --- Malformed Edge Function path ---
  try {
    const res = await fetch(
      `${ctx.supabaseUrl}/functions/v1/this-function-does-not-exist-xyz`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ctx.tokenOf("farmer")}`,
        },
        body: JSON.stringify({}),
      },
    );

    if (res.status === 404 || res.status >= 400) {
      ctx.pass(MODULE, "Invalid edge function returns HTTP error");
    } else {
      throw new Error(`Expected 4xx but got HTTP ${res.status}`);
    }
  } catch (err) {
    ctx.fail(
      MODULE,
      "Invalid edge function returns HTTP error",
      err,
      "Ensure Supabase returns 404 for unknown function paths",
    );
  }

  // --- Client remains usable after a failed request ---
  try {
    const badClient = createClient(
      "https://unreachable-instance-000.supabase.co",
      ctx.anonKey,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    await badClient.from("profiles").select("id").limit(1);

    const goodClient = ctx.authedClient("farmer");
    const { data, error } = await goodClient
      .from("profiles")
      .select("id")
      .eq("id", ctx.userOf("farmer").userId)
      .maybeSingle();

    if (error) throw error;
    if (!data?.id) throw new Error("Good client returned no data after bad client failure");

    ctx.pass(MODULE, "Client isolation after network failure");
  } catch (err) {
    ctx.fail(
      MODULE,
      "Client isolation after network failure",
      err,
      "Verify that one client's failure does not corrupt another client instance",
    );
  }
}
