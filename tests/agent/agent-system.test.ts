/**
 * AgriNext Gen — Agent Role Deep Validation
 *
 * Master runner that provisions test users, executes all agent test modules
 * sequentially, prints a branded report, cleans up, and exits with an
 * appropriate status code.
 *
 * Required env vars (in .env or shell):
 *   SUPABASE_URL            (or VITE_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SUPABASE_ANON_KEY       (or VITE_SUPABASE_PUBLISHABLE_KEY)
 *
 * Run:  npm run test:agent
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

import { run as runAuth } from "./agent-auth.test";
import { run as runDashboard } from "./agent-dashboard.test";
import { run as runMyFarmers } from "./my-farmers.test";
import { run as runFarmersManagement } from "./farmers-management.test";
import { run as runTasks } from "./tasks.test";
import { run as runVisits } from "./visits.test";
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
const DEMO_TAG = `agent_${Date.now()}`;

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
  { name: "Agent Auth", fn: runAuth },
  { name: "Agent Dashboard", fn: runDashboard },
  { name: "My Farmers", fn: runMyFarmers },
  { name: "Farmers Management", fn: runFarmersManagement },
  { name: "Agent Tasks", fn: runTasks },
  { name: "Agent Visits", fn: runVisits },
  { name: "Agent Notifications", fn: runNotifications },
  { name: "Agent Settings", fn: runSettings },
  { name: "Permissions & RLS", fn: runPermissions },
];

// ---------------------------------------------------------------------------
// Agent-specific cleanup (extends base cleanup)
// ---------------------------------------------------------------------------

async function agentCleanup(): Promise<void> {
  console.log(`\n  Cleaning up agent test data (demo_tag=${DEMO_TAG})...`);

  const demoTagTables = ["agent_visits", "agent_tasks"];
  for (const table of demoTagTables) {
    await adminClient
      .from(table)
      .delete()
      .eq("demo_tag", DEMO_TAG)
      .then(({ error }) => {
        if (error) console.log(`    warn: cleanup ${table}: ${error.message}`);
      });
  }

  // agent_activity_logs has no demo_tag column; clean by agent_id
  const agentUser = provisionedUsers.find((u) => u.role === "agent");
  if (agentUser) {
    await adminClient
      .from("agent_activity_logs")
      .delete()
      .eq("agent_id", agentUser.userId)
      .then(({ error }) => {
        if (error) console.log(`    warn: cleanup agent_activity_logs: ${error.message}`);
      });
  }

  await adminClient
    .from("notifications")
    .delete()
    .like("title", `agentchk_${DEMO_TAG}%`)
    .then(({ error }) => {
      if (error) console.log(`    warn: cleanup notifications: ${error.message}`);
    });

  const userIds = provisionedUsers.map((u) => u.userId);
  if (userIds.length) {
    await adminClient
      .from("geo_service_areas")
      .delete()
      .in("user_id", userIds)
      .then(({ error }) => {
        if (error) console.log(`    warn: cleanup geo_service_areas: ${error.message}`);
      });
  }

  await cleanup(adminClient, provisionedUsers, DEMO_TAG);
}

// ---------------------------------------------------------------------------
// Report printer (agent-branded)
// ---------------------------------------------------------------------------

function printAgentReport(results: TestResult[]): boolean {
  const modules = [...new Set(results.map((r) => r.module))];

  console.log("\n-----------------------------------------");
  console.log("  AGRI NEXT GEN AGENT VALIDATION");
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
    console.log(`  ${mod.padEnd(24)} ${status}  (${passed}/${total})`);
  }

  const allPassed = totalPassed === totalCount;

  console.log("\n-----------------------------------------");
  console.log(
    `  FINAL RESULT: ${allPassed ? "AGENT SYSTEM HEALTHY" : "SOME CHECKS FAILED"}  (${totalPassed}/${totalCount} checks passed)`,
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
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("\n==========================================");
  console.log("  AgriNext Gen — Agent Role Validation");
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
    const allPassed = printAgentReport(results);

    try {
      await agentCleanup();
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
