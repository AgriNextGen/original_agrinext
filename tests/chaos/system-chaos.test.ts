/**
 * AgriNext Gen — Chaos Test Master Runner
 *
 * Provisions test users, logs in all 5 roles, executes all chaos test
 * modules sequentially, prints a structured report, cleans up, and
 * exits with an appropriate status code.
 *
 * Required env vars (in .env or shell):
 *   SUPABASE_URL            (or VITE_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SUPABASE_ANON_KEY       (or VITE_SUPABASE_PUBLISHABLE_KEY)
 *
 * Run:  npm run chaos-test
 */

import dotenv from "dotenv";
import {
  requireEnv,
  createAdminClient,
  createAuthedClient,
  createResultTracker,
  provisionUsers,
  cleanup,
  TEST_PASSWORD,
  type ProvisionedUser,
  type TestContext,
  type TestResult,
} from "../test-utils";

import { run as runNetworkFailure } from "./network-failure.test";
import { run as runDatabaseDelay } from "./database-delay.test";
import { run as runStorageOutage } from "./storage-outage.test";
import { run as runAuthFailure } from "./auth-failure.test";
import { run as runInvalidInput } from "./invalid-input.test";
import { run as runRlsViolation } from "./rls-violation.test";
import { run as runConcurrency } from "./concurrency-collision.test";
import { run as runApiTimeout } from "./api-timeout.test";

dotenv.config();

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL = requireEnv("SUPABASE_URL", "VITE_SUPABASE_URL");
const SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const ANON_KEY = requireEnv("SUPABASE_ANON_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY");
const DEMO_TAG = `chaos_${Date.now()}`;

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
  } as TestContext & {
    _tokens: Record<string, string>;
    _refreshTokens: Record<string, string>;
  };
}

// ---------------------------------------------------------------------------
// Login all roles
// ---------------------------------------------------------------------------

async function loginAllRoles(): Promise<void> {
  console.log("\n  Logging in all roles...\n");

  const roles = ["farmer", "agent", "logistics", "buyer", "admin"];

  for (const role of roles) {
    const user = provisionedUsers.find((u) => u.role === role);
    if (!user) {
      console.log(`    SKIP ${role} — not provisioned`);
      continue;
    }

    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/login-by-phone`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: user.phone,
            password: TEST_PASSWORD,
            role,
          }),
        },
      );

      const body = await res.json().catch(() => null);
      const accessToken: string | undefined =
        body?.access_token ?? body?.session?.access_token;
      const refreshToken: string | undefined =
        body?.refresh_token ?? body?.session?.refresh_token;

      if (!res.ok || !accessToken) {
        throw new Error(`Login HTTP ${res.status}: ${JSON.stringify(body)}`);
      }

      tokens[role] = accessToken;
      if (refreshToken) refreshTokens[role] = refreshToken;

      console.log(`    ${role.padEnd(10)} logged in`);
    } catch (err) {
      console.error(
        `    ${role.padEnd(10)} login FAILED:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Chaos report printer (custom banner)
// ---------------------------------------------------------------------------

function printChaosReport(results: TestResult[]): boolean {
  const modules = [...new Set(results.map((r) => r.module))];

  console.log("\n-----------------------------------------");
  console.log("  AGRI NEXT GEN CHAOS TEST");
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
  if (allPassed) {
    console.log(
      `  SYSTEM RESILIENCE VERIFIED  (${totalPassed}/${totalCount} checks passed)`,
    );
  } else {
    console.log(
      `  RESILIENCE GAPS FOUND  (${totalPassed}/${totalCount} checks passed)`,
    );
  }
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
// Test suites (in execution order)
// ---------------------------------------------------------------------------

interface ChaosSuite {
  name: string;
  fn: (ctx: TestContext) => Promise<void>;
}

const suites: ChaosSuite[] = [
  { name: "Network Failure", fn: runNetworkFailure },
  { name: "Database Delay", fn: runDatabaseDelay },
  { name: "Storage Outage", fn: runStorageOutage },
  { name: "Auth Failure", fn: runAuthFailure },
  { name: "Invalid Input", fn: runInvalidInput },
  { name: "RLS Violation", fn: runRlsViolation },
  { name: "Concurrency Collision", fn: runConcurrency },
  { name: "API Timeout", fn: runApiTimeout },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("\n==========================================");
  console.log("  AgriNext Gen — Chaos Test Runner");
  console.log("==========================================");

  try {
    provisionedUsers = await provisionUsers(adminClient, DEMO_TAG);
    await loginAllRoles();

    const loggedInRoles = Object.keys(tokens);
    if (loggedInRoles.length === 0) {
      console.error("\n  FATAL: No roles logged in. Cannot run chaos tests.\n");
      process.exit(1);
    }

    console.log(`\n  Running ${suites.length} chaos test modules...\n`);

    for (const suite of suites) {
      console.log(`  Running: ${suite.name}...`);
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
    const allPassed = printChaosReport(results);

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
