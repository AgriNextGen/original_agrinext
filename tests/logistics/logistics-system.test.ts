/**
 * AgriNext Gen — Logistics System Deep Validation
 *
 * Master runner that provisions test users, executes all logistics test
 * modules sequentially, prints a structured report, cleans up, and
 * exits with an appropriate status code.
 *
 * Required env vars (in .env or shell):
 *   SUPABASE_URL          (or VITE_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SUPABASE_ANON_KEY     (or VITE_SUPABASE_PUBLISHABLE_KEY)
 *
 * Run:  npm run test:logistics
 */

import dotenv from "dotenv";
import {
  requireEnv,
  createAdminClient,
  createAuthedClient,
  createResultTracker,
  provisionUsers,
  cleanup,
  printReport,
  type ProvisionedUser,
  type TestContext,
  type TestResult,
} from "../test-utils";

import { run as runAuth } from "./logistics-auth.test";
import { run as runTransportRequests } from "./transport-requests.test";
import { run as runVehicles } from "./vehicles.test";
import { run as runTrips } from "./trips.test";
import { run as runActiveTrips } from "./active-trips.test";
import { run as runCompletedTrips } from "./completed-trips.test";
import { run as runTripDetails } from "./trip-details.test";
import { run as runNotifications } from "./notifications.test";
import { run as runSettings } from "./settings.test";
import { run as runPermissions } from "./permissions.test";

dotenv.config();

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL = requireEnv("SUPABASE_URL", "VITE_SUPABASE_URL");
const SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const ANON_KEY = requireEnv("SUPABASE_ANON_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY");
const DEMO_TAG = `logitest_${Date.now()}`;

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

const adminClient = createAdminClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let provisionedUsers: ProvisionedUser[] = [];
const tokens: Record<string, string> = {};
const refreshTokens: Record<string, string> = {};
const { results, pass, fail } = createResultTracker();
const shared: import("../test-utils").SharedState = {};

// ---------------------------------------------------------------------------
// Context builder
// ---------------------------------------------------------------------------

function buildContext(): TestContext {
  return {
    supabaseUrl: SUPABASE_URL,
    anonKey: ANON_KEY,
    adminClient,
    authedClient: (role: string) => {
      const token = tokens[role];
      if (!token) throw new Error(`No token for role: ${role}`);
      return createAuthedClient(SUPABASE_URL, ANON_KEY, token);
    },
    userOf: (role: string) => {
      const u = provisionedUsers.find((p) => p.role === role);
      if (!u) throw new Error(`No provisioned user for role: ${role}`);
      return u;
    },
    tokenOf: (role: string) => {
      const t = tokens[role];
      if (!t) throw new Error(`No token for role: ${role}`);
      return t;
    },
    pass,
    fail,
    shared,
    results,
    demoTag: DEMO_TAG,
    _tokens: tokens,
    _refreshTokens: refreshTokens,
  } as TestContext & { _tokens: Record<string, string>; _refreshTokens: Record<string, string> };
}

// ---------------------------------------------------------------------------
// Test suites (in dependency order)
// ---------------------------------------------------------------------------

interface TestSuite {
  name: string;
  fn: (ctx: TestContext) => Promise<void>;
}

const suites: TestSuite[] = [
  { name: "Logistics Auth", fn: runAuth },
  { name: "Transport Requests", fn: runTransportRequests },
  { name: "Vehicle Management", fn: runVehicles },
  { name: "Trip Lifecycle", fn: runTrips },
  { name: "Active Trips", fn: runActiveTrips },
  { name: "Completed Trips", fn: runCompletedTrips },
  { name: "Trip Details", fn: runTripDetails },
  { name: "Notifications", fn: runNotifications },
  { name: "Settings", fn: runSettings },
  { name: "Permissions", fn: runPermissions },
];

// ---------------------------------------------------------------------------
// Custom report printer
// ---------------------------------------------------------------------------

function printLogisticsReport(results: TestResult[]): boolean {
  const modules = [...new Set(results.map((r) => r.module))];

  console.log("\n-----------------------------------------");
  console.log("  AGRI NEXT GEN LOGISTICS VALIDATION");
  console.log("-----------------------------------------\n");

  let totalPassed = 0;
  let totalCount = 0;

  for (const mod of modules) {
    const modResults = results.filter((r) => r.module === mod);
    const passed = modResults.filter((r) => r.passed).length;
    const total = modResults.length;
    totalPassed += passed;
    totalCount += total;

    const status = passed === total ? "PASSED" : "FAILED";
    console.log(`  ${mod.padEnd(30)} ${status}  (${passed}/${total})`);
  }

  const allPassed = totalPassed === totalCount;

  console.log("\n-----------------------------------------");
  if (allPassed) {
    console.log("  FINAL RESULT");
    console.log("  LOGISTICS SYSTEM HEALTHY");
  } else {
    console.log("  FINAL RESULT");
    console.log("  SOME CHECKS FAILED");
  }
  console.log(`  (${totalPassed}/${totalCount} checks passed)`);
  console.log("-----------------------------------------\n");

  const failed = results.filter((r) => !r.passed);
  if (failed.length) {
    console.log("  FAILURES:\n");
    for (const f of failed) {
      console.log(`  [${f.module}] ${f.name}: ${f.error}`);
      if (f.suggestion) {
        console.log(`    Suggestion: ${f.suggestion}`);
      }
    }
    console.log("");
  }

  return allPassed;
}

// ---------------------------------------------------------------------------
// Cleanup — extended for logistics-specific data
// ---------------------------------------------------------------------------

async function logisticsCleanup(): Promise<void> {
  console.log(`\n  Cleaning up logistics test data (demo_tag=${DEMO_TAG})...`);

  // Clean notifications created by tests
  await ctx_adminCleanup("notifications", "title", `${DEMO_TAG}_logistics_notif`);

  // Clean logistics-specific tables with demo_tag
  const tablesWithDemoTag = [
    "transport_status_events",
    "trips",
    "transport_requests",
    "vehicles",
  ];

  // transport_status_events don't have demo_tag — clean by trip_id
  if (shared.tripId) {
    await adminClient
      .from("transport_status_events")
      .delete()
      .eq("trip_id", shared.tripId)
      .then(({ error }) => {
        if (error) console.log(`    warn: cleanup transport_status_events: ${error.message}`);
      });
  }

  for (const table of ["trips", "transport_requests"]) {
    const { error } = await adminClient.from(table).delete().eq("demo_tag", DEMO_TAG);
    if (error) console.log(`    warn: cleanup ${table}: ${error.message}`);
  }

  // Delegate full user cleanup to shared utility
  await cleanup(adminClient, provisionedUsers, DEMO_TAG);
}

async function ctx_adminCleanup(table: string, field: string, value: string): Promise<void> {
  const { error } = await adminClient.from(table).delete().like(field, `%${value}%`);
  if (error) console.log(`    warn: cleanup ${table}: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("\n==========================================");
  console.log("  AgriNext Gen — Logistics Deep Validation");
  console.log("==========================================");

  try {
    provisionedUsers = await provisionUsers(adminClient, DEMO_TAG);

    for (const suite of suites) {
      console.log(`\n  Running: ${suite.name}...`);
      try {
        const ctx = buildContext();
        await suite.fn(ctx);
      } catch (err) {
        fail(
          suite.name,
          "Module-level error",
          err,
          `Unhandled error in ${suite.name} module`,
        );
      }
    }
  } finally {
    const allPassed = printLogisticsReport(results);

    try {
      await logisticsCleanup();
    } catch (cleanupErr) {
      console.error(
        "  Cleanup error:",
        cleanupErr instanceof Error ? cleanupErr.message : cleanupErr,
      );
    }

    process.exit(allPassed ? 0 : 1);
  }
}

main();
