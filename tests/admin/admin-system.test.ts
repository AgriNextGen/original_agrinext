/**
 * AgriNext Gen — Admin Role Validation Suite
 *
 * Master runner that provisions test users, executes all admin test modules
 * sequentially, prints a structured report, cleans up, and exits with
 * an appropriate status code.
 *
 * Required env vars (in .env or shell):
 *   SUPABASE_URL        (or VITE_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SUPABASE_ANON_KEY   (or VITE_SUPABASE_PUBLISHABLE_KEY)
 *
 * Run:  npm run test:admin
 */

import dotenv from "dotenv";
import {
  requireEnv,
  createAdminClient,
  createAuthedClient,
  createResultTracker,
  provisionUsers,
  cleanup,
  type ProvisionedUser,
  type TestContext,
  type TestResult,
} from "../test-utils";

import { run as runAuth } from "./admin-auth.test";
import { run as runDashboard } from "./admin-dashboard.test";
import { run as runUsers } from "./users.test";
import { run as runFarmers } from "./farmers.test";
import { run as runAgents } from "./agents.test";
import { run as runBuyers } from "./buyers.test";
import { run as runTransporters } from "./transporters.test";
import { run as runOrders } from "./orders.test";
import { run as runTransport } from "./transport.test";
import { run as runTickets } from "./tickets.test";
import { run as runOpsInbox } from "./ops-inbox.test";
import { run as runPendingUpdates } from "./pending-updates.test";
import { run as runAnalytics } from "./analytics.test";
import { run as runPermissions } from "./permissions.test";

dotenv.config();

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL = requireEnv("SUPABASE_URL", "VITE_SUPABASE_URL");
const SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const ANON_KEY = requireEnv("SUPABASE_ANON_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY");
const DEMO_TAG = `admin_${Date.now()}`;

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
// Report printer (customised header for admin suite)
// ---------------------------------------------------------------------------

function printAdminReport(results: TestResult[]): boolean {
  const modules = [...new Set(results.map((r) => r.module))];

  console.log("\n-----------------------------------------");
  console.log("  AGRI NEXT GEN ADMIN VALIDATION");
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
    console.log(`  ${mod.padEnd(28)} ${status}  (${passed}/${total})`);
  }

  const allPassed = totalPassed === totalCount;

  console.log("\n-----------------------------------------");
  console.log(
    `  FINAL RESULT: ${allPassed ? "ADMIN SYSTEM HEALTHY" : "SOME CHECKS FAILED"}  (${totalPassed}/${totalCount} checks passed)`,
  );
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
// Test suites (in dependency order — auth first)
// ---------------------------------------------------------------------------

interface TestSuite {
  name: string;
  fn: (ctx: TestContext) => Promise<void>;
}

const suites: TestSuite[] = [
  { name: "Admin Auth", fn: runAuth },
  { name: "Admin Dashboard", fn: runDashboard },
  { name: "User Management", fn: runUsers },
  { name: "Farmer Management", fn: runFarmers },
  { name: "Agent Management", fn: runAgents },
  { name: "Buyer Management", fn: runBuyers },
  { name: "Transporter Management", fn: runTransporters },
  { name: "Order Management", fn: runOrders },
  { name: "Transport Coordination", fn: runTransport },
  { name: "Support Tickets", fn: runTickets },
  { name: "Ops Inbox", fn: runOpsInbox },
  { name: "Pending Updates", fn: runPendingUpdates },
  { name: "Platform Analytics", fn: runAnalytics },
  { name: "Permissions & RLS", fn: runPermissions },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("\n==========================================");
  console.log("  AgriNext Gen — Admin Validation Suite");
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
    const allPassed = printAdminReport(results);

    try {
      await cleanup(adminClient, provisionedUsers, DEMO_TAG);
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
