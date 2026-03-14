/**
 * AgriNext Gen — Full MVP System Validation
 *
 * Master runner that provisions test users, executes all test modules
 * sequentially, prints a structured report, cleans up, and exits with
 * an appropriate status code.
 *
 * Required env vars (in .env or shell):
 *   SUPABASE_URL        (or VITE_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SUPABASE_ANON_KEY   (or VITE_SUPABASE_PUBLISHABLE_KEY)
 *
 * Run:  npm run system-check
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
} from "./test-utils";

import { run as runAuth } from "./auth-tests";
import { run as runDatabase } from "./database-tests";
import { run as runFarmer } from "./farmer-tests";
import { run as runBuyer } from "./buyer-tests";
import { run as runLogistics } from "./logistics-tests";
import { run as runAgent } from "./agent-tests";
import { run as runAdmin } from "./admin-tests";
import { run as runStorage } from "./storage-tests";
import { run as runRls } from "./rls-tests";

dotenv.config();

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL = requireEnv("SUPABASE_URL", "VITE_SUPABASE_URL");
const SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const ANON_KEY = requireEnv("SUPABASE_ANON_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY");
const DEMO_TAG = `syschk_${Date.now()}`;

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
const shared: import("./test-utils").SharedState = {};

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

    // Internal maps for auth-tests to store tokens
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
  { name: "Auth Tests", fn: runAuth },
  { name: "Database Tests", fn: runDatabase },
  { name: "Farmer Dashboard", fn: runFarmer },
  { name: "Buyer Marketplace", fn: runBuyer },
  { name: "Logistics Dashboard", fn: runLogistics },
  { name: "Agent Dashboard", fn: runAgent },
  { name: "Admin Panel", fn: runAdmin },
  { name: "Storage Tests", fn: runStorage },
  { name: "RLS Security", fn: runRls },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("\n==========================================");
  console.log("  AgriNext Gen — Full System Validation");
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
    const allPassed = printReport(results);

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
