/**
 * AgriNext Gen — Platform Failure Analysis System
 *
 * Runs the full platform validation suite, captures all output,
 * classifies failures into categories, performs root cause analysis,
 * and generates professional QA reports.
 *
 * Output:
 *   reports/platform-failure-report.md
 *   reports/fix-tasks.md
 *
 * Run:  npm run platform-check
 *       npm run failure-analysis
 */

import { execSync } from "child_process";
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FailureCategory =
  | "BACKEND"
  | "AUTHENTICATION"
  | "ROLE_PERMISSION"
  | "UI_WORKFLOW"
  | "STORAGE"
  | "PERFORMANCE"
  | "CHAOS";

interface ParsedFailure {
  module: string;
  testName: string;
  error: string;
  suggestion?: string;
  file?: string;
  category: FailureCategory;
  rootCause: string;
  fixStrategy: string;
}

interface SuiteResult {
  name: string;
  command: string;
  passed: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  failures: ParsedFailure[];
  duration: number;
}

interface SuiteConfig {
  name: string;
  command: string;
  parser: "tsx" | "vitest";
}

// ---------------------------------------------------------------------------
// Suite definitions
// ---------------------------------------------------------------------------

const SUITES: SuiteConfig[] = [
  { name: "Smoke Tests", command: "npm run smoke-test", parser: "tsx" },
  { name: "System Check", command: "npm run system-check", parser: "tsx" },
  { name: "Farmer Tests", command: "npm run test:farmer", parser: "vitest" },
  { name: "Agent Tests", command: "npm run test:agent", parser: "tsx" },
  { name: "Logistics Tests", command: "npm run test:logistics", parser: "tsx" },
  { name: "Admin Tests", command: "npm run test:admin", parser: "tsx" },
  { name: "Chaos Tests", command: "npm run chaos-test", parser: "tsx" },
];

// ---------------------------------------------------------------------------
// Failure classification
// ---------------------------------------------------------------------------

const CATEGORY_PATTERNS: { category: FailureCategory; patterns: RegExp[] }[] = [
  {
    category: "AUTHENTICATION",
    patterns: [
      /\bsession\b/i,
      /\btoken\b/i,
      /\bJWT\b/,
      /\bexpired\b/i,
      /\b401\b/,
      /\bunauthorized\b/i,
      /\blogin\b.*\b(fail|error|HTTP)\b/i,
      /auth.*endpoint/i,
      /invalid.*credentials/i,
    ],
  },
  {
    category: "ROLE_PERMISSION",
    patterns: [
      /\bRLS\b/,
      /row.level.security/i,
      /\bpolicy\b.*\b(violat|denied|block)/i,
      /\bpermission\b/i,
      /\bforbidden\b/i,
      /\b403\b/,
      /role.mismatch/i,
      /not.authorized/i,
    ],
  },
  {
    category: "STORAGE",
    patterns: [
      /\bupload\b.*\b(fail|error)\b/i,
      /\bbucket\b/i,
      /storage.*\b(error|fail|denied)\b/i,
      /signed.URL/i,
      /object.not.found/i,
      /storage-sign/i,
    ],
  },
  {
    category: "PERFORMANCE",
    patterns: [
      /\btimeout\b/i,
      /\bETIMEDOUT\b/,
      /\bECONNRESET\b/,
      /\bslow\b.*\bquery\b/i,
      /\blatency\b/i,
      /\b504\b/,
      /\b408\b/,
      /abort.*signal/i,
    ],
  },
  {
    category: "CHAOS",
    patterns: [
      /\bchaos\b/i,
      /\bresilience\b/i,
      /failure.simulation/i,
      /crash.*under.*load/i,
    ],
  },
  {
    category: "UI_WORKFLOW",
    patterns: [
      /\brender\b/i,
      /\bcomponent\b/i,
      /\bnavigation\b/i,
      /undefined is not/i,
      /Cannot read prop/i,
      /\bnull\b.*\baccess\b/i,
      /\bhook\b/i,
      /\bReact\b/,
      /blank.page/i,
      /missing.*element/i,
    ],
  },
  {
    category: "BACKEND",
    patterns: [
      /\bconnection\b.*\b(fail|refused|error)\b/i,
      /missing.table/i,
      /\bmigration\b/i,
      /column.*does not exist/i,
      /relation.*does not exist/i,
      /\bPGRST\d+/,
      /\bdatabase\b.*\berror\b/i,
      /supabase.*error/i,
      /schema.*mismatch/i,
    ],
  },
];

function classifyFailure(error: string, module: string): FailureCategory {
  for (const { category, patterns } of CATEGORY_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(error) || pattern.test(module)) {
        return category;
      }
    }
  }

  const moduleLC = module.toLowerCase();
  if (moduleLC.includes("auth")) return "AUTHENTICATION";
  if (moduleLC.includes("rls") || moduleLC.includes("permission")) return "ROLE_PERMISSION";
  if (moduleLC.includes("storage")) return "STORAGE";
  if (moduleLC.includes("chaos") || moduleLC.includes("resilience")) return "CHAOS";
  if (moduleLC.includes("ui") || moduleLC.includes("dashboard")) return "UI_WORKFLOW";

  return "BACKEND";
}

// ---------------------------------------------------------------------------
// Root cause analysis
// ---------------------------------------------------------------------------

const ROOT_CAUSE_MAP: Record<FailureCategory, string> = {
  BACKEND:
    "Database schema drift, missing migration, or Supabase API configuration issue. " +
    "A column/table referenced in code may not exist in the current database state.",
  AUTHENTICATION:
    "Auth Edge Function misconfiguration, expired JWT, or login-by-phone endpoint failure. " +
    "The Supabase Auth service may be unreachable or rate-limiting test requests.",
  ROLE_PERMISSION:
    "Row Level Security policy is blocking access. The RLS policy for this table may be " +
    "missing, too restrictive, or the user's role is not correctly set in user_roles.",
  UI_WORKFLOW:
    "A frontend component is accessing a null/undefined value from a database query. " +
    "With strictNullChecks disabled, TypeScript does not catch these at compile time.",
  STORAGE:
    "Supabase Storage bucket does not exist, RLS on the bucket is blocking access, " +
    "or the signed-URL Edge Function is returning an error.",
  PERFORMANCE:
    "Network timeout or slow database query. The Supabase instance may be under load, " +
    "or a query is missing an index and performing a sequential scan.",
  CHAOS:
    "The system did not gracefully handle a simulated failure condition. " +
    "Error boundaries, retry logic, or fallback paths may be missing.",
};

function getRootCause(failure: ParsedFailure): string {
  const base = ROOT_CAUSE_MAP[failure.category];
  const specific = inferSpecificCause(failure);
  return specific ? `${specific} ${base}` : base;
}

function inferSpecificCause(failure: ParsedFailure): string {
  const err = failure.error.toLowerCase();

  if (/column.*does not exist/.test(err)) {
    const match = failure.error.match(/column "(\w+)"/i);
    return match
      ? `Column "${match[1]}" is missing from the database.`
      : "A referenced column does not exist in the database.";
  }
  if (/relation.*does not exist/.test(err)) {
    const match = failure.error.match(/relation "(\w+)"/i);
    return match
      ? `Table "${match[1]}" does not exist.`
      : "A referenced table does not exist.";
  }
  if (/PGRST\d+/.test(failure.error)) {
    return "PostgREST returned a schema-level error.";
  }
  if (/401/.test(err) || /unauthorized/.test(err)) {
    return "The request was rejected with 401 Unauthorized.";
  }
  if (/403/.test(err) || /forbidden/.test(err)) {
    return "The request was rejected with 403 Forbidden (likely RLS).";
  }
  if (/timeout/i.test(err)) {
    return "The request timed out before receiving a response.";
  }
  return "";
}

// ---------------------------------------------------------------------------
// Fix strategy generation
// ---------------------------------------------------------------------------

const FIX_STRATEGY_MAP: Record<FailureCategory, string> = {
  BACKEND:
    "1. Check if the referenced column/table exists: `\\dt` or `\\d table_name` in psql.\n" +
    "2. Create a migration to add the missing schema element.\n" +
    "3. Run `supabase db reset` locally, then `supabase db push` for remote.",
  AUTHENTICATION:
    "1. Verify Edge Functions `login-by-phone` / `signup-by-phone` are deployed.\n" +
    "2. Check Supabase Auth settings (phone auth enabled, rate limits).\n" +
    "3. Ensure `.env` has correct `SUPABASE_URL` and keys.",
  ROLE_PERMISSION:
    "1. Review RLS policies for the affected table in `ENTERPRISE_RLS_POLICY_MATRIX.md`.\n" +
    "2. Add or fix the RLS policy in a new migration.\n" +
    "3. Verify the user has the correct role in `user_roles` table.",
  UI_WORKFLOW:
    "1. Add null-checks with `?? 'fallback'` for all DB-sourced values.\n" +
    "2. Add loading/error guards in the component.\n" +
    "3. Consider adding an ErrorBoundary wrapper.",
  STORAGE:
    "1. Verify the storage bucket exists in Supabase Dashboard.\n" +
    "2. Check bucket RLS policies allow the operation.\n" +
    "3. Ensure `storage-sign-upload-v1` / `storage-sign-read-v1` Edge Functions are deployed.",
  PERFORMANCE:
    "1. Check Supabase Dashboard for slow queries.\n" +
    "2. Add database indexes for frequently queried columns.\n" +
    "3. Increase timeout values or add retry logic.",
  CHAOS:
    "1. Add error boundaries around the failing component/workflow.\n" +
    "2. Implement retry logic with exponential backoff.\n" +
    "3. Add fallback UI states for degraded service conditions.",
};

function getFixStrategy(failure: ParsedFailure): string {
  const base = FIX_STRATEGY_MAP[failure.category];
  const specific = inferSpecificFix(failure);
  return specific ? `**Specific:** ${specific}\n\n**General:**\n${base}` : base;
}

function inferSpecificFix(failure: ParsedFailure): string {
  const err = failure.error.toLowerCase();

  if (/column.*does not exist/.test(err)) {
    const match = failure.error.match(/column "(\w+)"/i);
    if (match) {
      return `Add column "${match[1]}" via migration: \`ALTER TABLE <table> ADD COLUMN ${match[1]} <type>;\``;
    }
  }
  if (/relation.*does not exist/.test(err)) {
    const match = failure.error.match(/relation "(\w+)"/i);
    if (match) {
      return `Create table "${match[1]}" via migration.`;
    }
  }
  if (failure.suggestion) {
    return failure.suggestion;
  }
  return "";
}

// ---------------------------------------------------------------------------
// Output parsers
// ---------------------------------------------------------------------------

/**
 * Parse output from tsx-based test runners (system-check, smoke-test, chaos).
 * Failure lines follow the pattern:  [Module] test name: error message
 * Suggestion lines follow:            Suggestion: ...
 */
function parseTsxOutput(output: string, suiteName: string): ParsedFailure[] {
  const failures: ParsedFailure[] = [];
  const lines = output.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^\s*\[(.+?)\]\s+(.+?):\s+(.+)$/);
    if (!match) continue;

    const [, module, testName, error] = match;

    let suggestion: string | undefined;
    const nextLine = lines[i + 1];
    if (nextLine) {
      const sugMatch = nextLine.match(/^\s*Suggestion:\s+(.+)$/);
      if (sugMatch) {
        suggestion = sugMatch[1];
        i++;
      }
    }

    const category = classifyFailure(error, module);
    const partial: ParsedFailure = {
      module,
      testName,
      error,
      suggestion,
      file: inferFileFromModule(module, suiteName),
      category,
      rootCause: "",
      fixStrategy: "",
    };
    partial.rootCause = getRootCause(partial);
    partial.fixStrategy = getFixStrategy(partial);
    failures.push(partial);
  }

  return failures;
}

/**
 * Parse Vitest output. Failures appear as:
 *   FAIL  tests/farmer/crops.test.tsx > describe > test name
 *   Error: ...
 */
function parseVitestOutput(output: string, _suiteName: string): ParsedFailure[] {
  const failures: ParsedFailure[] = [];
  const lines = output.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const failMatch = line.match(/FAIL\s+(.+?)\s+>\s+(.+)/);
    if (!failMatch) continue;

    const file = failMatch[1].trim();
    const testPath = failMatch[2].trim();
    const parts = testPath.split(" > ");
    const testName = parts[parts.length - 1];
    const module = parts.length > 1 ? parts[0] : file;

    let error = "";
    for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
      const errLine = lines[j].trim();
      if (errLine.startsWith("Error:") || errLine.startsWith("AssertionError:") ||
          errLine.startsWith("TypeError:") || errLine.startsWith("ReferenceError:") ||
          errLine.startsWith("expect(")) {
        error = errLine;
        break;
      }
    }

    if (!error) {
      error = `Test failed in ${file}`;
    }

    const category = classifyFailure(error, module);
    const partial: ParsedFailure = {
      module,
      testName,
      error,
      file,
      category,
      rootCause: "",
      fixStrategy: "",
    };
    partial.rootCause = getRootCause(partial);
    partial.fixStrategy = getFixStrategy(partial);
    failures.push(partial);
  }

  // Fallback: if no structured failures found but exit code was non-zero,
  // scan for common Vitest summary patterns
  if (failures.length === 0) {
    const failedSuiteMatch = output.match(/Tests\s+(\d+)\s+failed/);
    if (failedSuiteMatch) {
      const fileMatches = [...output.matchAll(/FAIL\s+(.+\.test\.tsx?)/g)];
      for (const fm of fileMatches) {
        const file = fm[1].trim();
        const category = classifyFailure("test failed", file);
        const partial: ParsedFailure = {
          module: file,
          testName: "Unknown test",
          error: `Test suite failed in ${file}`,
          file,
          category,
          rootCause: "",
          fixStrategy: "",
        };
        partial.rootCause = getRootCause(partial);
        partial.fixStrategy = getFixStrategy(partial);
        failures.push(partial);
      }
    }
  }

  return failures;
}

function inferFileFromModule(module: string, suiteName: string): string {
  const moduleMap: Record<string, Record<string, string>> = {
    "System Check": {
      "Auth Tests": "tests/auth-tests.ts",
      "Database Tests": "tests/database-tests.ts",
      "Farmer Dashboard": "tests/farmer-tests.ts",
      "Buyer Marketplace": "tests/buyer-tests.ts",
      "Logistics Dashboard": "tests/logistics-tests.ts",
      "Agent Dashboard": "tests/agent-tests.ts",
      "Admin Panel": "tests/admin-tests.ts",
      "Storage Tests": "tests/storage-tests.ts",
      "RLS Security": "tests/rls-tests.ts",
    },
    "Smoke Tests": {
      default: "tests/smoke-test.ts",
    },
    "Chaos Tests": {
      "Network Failure": "tests/chaos/network-failure.test.ts",
      "Database Delay": "tests/chaos/database-delay.test.ts",
      "Storage Outage": "tests/chaos/storage-outage.test.ts",
      "Auth Failure": "tests/chaos/auth-failure.test.ts",
      "Invalid Input": "tests/chaos/invalid-input.test.ts",
      "RLS Violation": "tests/chaos/rls-violation.test.ts",
      "Concurrency Collision": "tests/chaos/concurrency-collision.test.ts",
      "API Timeout": "tests/chaos/api-timeout.test.ts",
    },
    "Agent Tests": { default: "tests/agent/agent-system.test.ts" },
    "Logistics Tests": { default: "tests/logistics/logistics-system.test.ts" },
    "Admin Tests": { default: "tests/admin/admin-system.test.ts" },
  };

  const suiteMap = moduleMap[suiteName];
  if (suiteMap) {
    return suiteMap[module] ?? suiteMap["default"] ?? "unknown";
  }
  return "unknown";
}

// ---------------------------------------------------------------------------
// Suite runner
// ---------------------------------------------------------------------------

function runSuite(config: SuiteConfig): SuiteResult {
  const start = Date.now();
  let stdout = "";
  let stderr = "";
  let exitCode = 0;

  console.log(`\n  Running: ${config.name} (${config.command})...`);

  try {
    const output = execSync(config.command, {
      encoding: "utf-8",
      timeout: 300_000, // 5 min per suite
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, FORCE_COLOR: "0" },
    });
    stdout = output;
  } catch (err: unknown) {
    const execErr = err as { stdout?: string; stderr?: string; status?: number };
    stdout = execErr.stdout ?? "";
    stderr = execErr.stderr ?? "";
    exitCode = execErr.status ?? 1;
  }

  const duration = Date.now() - start;
  const combinedOutput = `${stdout}\n${stderr}`;

  const parser = config.parser === "vitest" ? parseVitestOutput : parseTsxOutput;
  const failures = parser(combinedOutput, config.name);

  // If exit code is non-zero but no failures were parsed, add a generic one
  if (exitCode !== 0 && failures.length === 0) {
    const errorSnippet = extractErrorSnippet(combinedOutput);
    const category = classifyFailure(errorSnippet, config.name);
    const partial: ParsedFailure = {
      module: config.name,
      testName: "Suite execution",
      error: errorSnippet || `Suite exited with code ${exitCode}`,
      category,
      rootCause: "",
      fixStrategy: "",
    };
    partial.rootCause = getRootCause(partial);
    partial.fixStrategy = getFixStrategy(partial);
    failures.push(partial);
  }

  const passed = exitCode === 0;
  const status = passed ? "PASS" : "FAIL";
  console.log(`  Result:  ${status}  (${failures.length} failures, ${duration}ms)`);

  return {
    name: config.name,
    command: config.command,
    passed,
    exitCode,
    stdout,
    stderr,
    failures,
    duration,
  };
}

function extractErrorSnippet(output: string): string {
  const lines = output.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed.startsWith("Error:") ||
      trimmed.startsWith("TypeError:") ||
      trimmed.startsWith("FATAL:") ||
      trimmed.includes("Missing required env var")
    ) {
      return trimmed.slice(0, 300);
    }
  }

  const lastLines = lines.slice(-20).filter((l) => l.trim()).join(" ").slice(0, 300);
  return lastLines || "Unknown error (no output captured)";
}

// ---------------------------------------------------------------------------
// Report generators
// ---------------------------------------------------------------------------

function generateFailureReport(results: SuiteResult[]): string {
  const timestamp = new Date().toISOString();
  const allFailures = results.flatMap((r) => r.failures);
  const totalPassed = results.filter((r) => r.passed).length;
  const totalSuites = results.length;

  let md = "";

  md += "# AGRINEXT GEN PLATFORM FAILURE REPORT\n\n";
  md += `**Generated At:** ${timestamp}\n\n`;
  md += `**Total Suites:** ${totalSuites} | **Passed:** ${totalPassed} | **Failed:** ${totalSuites - totalPassed}\n\n`;
  md += `**Total Failures:** ${allFailures.length}\n\n`;
  md += "---\n\n";

  // Validation Summary
  md += "## Validation Summary\n\n";
  md += "| Suite | Status | Failures | Duration |\n";
  md += "|-------|--------|----------|----------|\n";

  for (const r of results) {
    const status = r.passed ? "PASS" : "FAIL";
    const dur = r.duration < 1000 ? `${r.duration}ms` : `${(r.duration / 1000).toFixed(1)}s`;
    md += `| ${r.name} | ${status} | ${r.failures.length} | ${dur} |\n`;
  }
  md += "\n---\n\n";

  // Failure Details
  if (allFailures.length > 0) {
    md += "## Failure Details\n\n";

    for (const r of results) {
      if (r.failures.length === 0) continue;

      md += `### ${r.name}\n\n`;

      for (const f of r.failures) {
        md += `#### ${f.module} — ${f.testName}\n\n`;
        if (f.file) {
          md += `- **File:** \`${f.file}\`\n`;
        }
        md += `- **Error:** ${f.error}\n`;
        md += `- **Category:** ${formatCategory(f.category)}\n`;
        if (f.suggestion) {
          md += `- **Suggestion:** ${f.suggestion}\n`;
        }
        md += "\n";
      }
    }

    md += "---\n\n";

    // Root Cause Analysis
    md += "## Root Cause Analysis\n\n";

    const byCategory = groupBy(allFailures, (f) => f.category);
    for (const [category, failures] of Object.entries(byCategory)) {
      md += `### ${formatCategory(category as FailureCategory)}\n\n`;
      md += `**${failures.length} failure(s) in this category.**\n\n`;

      const uniqueCauses = [...new Set(failures.map((f) => f.rootCause))];
      for (const cause of uniqueCauses) {
        md += `- ${cause}\n`;
      }
      md += "\n";

      md += "**Affected tests:**\n\n";
      for (const f of failures) {
        md += `- \`[${f.module}]\` ${f.testName}\n`;
      }
      md += "\n";
    }

    md += "---\n\n";

    // Suggested Fix Strategy
    md += "## Suggested Fix Strategy\n\n";

    for (let i = 0; i < allFailures.length; i++) {
      const f = allFailures[i];
      md += `### ${i + 1}. ${f.module} — ${f.testName}\n\n`;
      md += `**Category:** ${formatCategory(f.category)}\n\n`;
      md += `${f.fixStrategy}\n\n`;
    }
  } else {
    md += "## All Tests Passed\n\n";
    md += "No failures detected. The platform is healthy.\n\n";
  }

  md += "---\n\n";
  md += `*Report generated by AgriNext Gen Failure Analysis System at ${timestamp}*\n`;

  return md;
}

function generateFixTasks(results: SuiteResult[]): string {
  const timestamp = new Date().toISOString();
  const allFailures = results.flatMap((r) => r.failures);

  let md = "";

  md += "# PLATFORM FIX TASK LIST\n\n";
  md += `**Generated At:** ${timestamp}\n\n`;
  md += `**Total Failures:** ${allFailures.length}\n\n`;

  if (allFailures.length === 0) {
    md += "No failures detected. No fixes required.\n";
    return md;
  }

  md += "---\n\n";
  md += "## Priority Tasks\n\n";

  const priorityOrder: FailureCategory[] = [
    "BACKEND",
    "AUTHENTICATION",
    "ROLE_PERMISSION",
    "STORAGE",
    "UI_WORKFLOW",
    "PERFORMANCE",
    "CHAOS",
  ];

  const byCategory = groupBy(allFailures, (f) => f.category);
  let taskNum = 1;

  for (const category of priorityOrder) {
    const failures = byCategory[category];
    if (!failures?.length) continue;

    md += `### ${formatCategory(category)}\n\n`;

    for (const f of failures) {
      const filePart = f.file ? ` in \`${f.file}\`` : "";
      md += `${taskNum}. **[${category}]** Fix ${f.testName}${filePart}\n`;
      md += `   - Error: ${f.error}\n`;
      if (f.suggestion) {
        md += `   - Hint: ${f.suggestion}\n`;
      }
      md += "\n";
      taskNum++;
    }
  }

  md += "---\n\n";
  md += `*Task list generated by AgriNext Gen Failure Analysis System at ${timestamp}*\n`;

  return md;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCategory(category: FailureCategory | string): string {
  const labels: Record<string, string> = {
    BACKEND: "Backend / Database Failure",
    AUTHENTICATION: "Authentication Failure",
    ROLE_PERMISSION: "Role Permission / RLS Failure",
    UI_WORKFLOW: "UI / Workflow Failure",
    STORAGE: "Storage Failure",
    PERFORMANCE: "Performance Failure",
    CHAOS: "Chaos Test Failure",
  };
  return labels[category] ?? category;
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const item of items) {
    const key = keyFn(item);
    (groups[key] ??= []).push(item);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const reportsDir = resolve(import.meta.dirname ?? __dirname, "..", "reports");
  mkdirSync(reportsDir, { recursive: true });

  console.log("==============================================");
  console.log("  AgriNext Gen — Platform Failure Analysis");
  console.log("==============================================");
  console.log(`  Started at: ${new Date().toISOString()}`);

  const results: SuiteResult[] = [];

  for (const suite of SUITES) {
    const result = runSuite(suite);
    results.push(result);
  }

  // Print console summary
  const allFailures = results.flatMap((r) => r.failures);
  const passedSuites = results.filter((r) => r.passed).length;

  console.log("\n==============================================");
  console.log("  PLATFORM VALIDATION SUMMARY");
  console.log("==============================================\n");

  for (const r of results) {
    const status = r.passed ? "PASS" : "FAIL";
    console.log(`  ${r.name.padEnd(24)} ${status}  (${r.failures.length} failures)`);
  }

  console.log(`\n  Suites: ${passedSuites}/${results.length} passed`);
  console.log(`  Failures: ${allFailures.length} total\n`);

  // Generate reports
  const failureReport = generateFailureReport(results);
  const fixTasks = generateFixTasks(results);

  const reportPath = resolve(reportsDir, "platform-failure-report.md");
  const tasksPath = resolve(reportsDir, "fix-tasks.md");

  writeFileSync(reportPath, failureReport, "utf-8");
  writeFileSync(tasksPath, fixTasks, "utf-8");

  console.log("  Reports generated:");
  console.log(`    ${reportPath}`);
  console.log(`    ${tasksPath}`);
  console.log("");

  if (allFailures.length > 0) {
    console.log(`  ${allFailures.length} failure(s) detected. Review reports for details.`);

    const categories = [...new Set(allFailures.map((f) => f.category))];
    console.log(`  Categories: ${categories.map(formatCategory).join(", ")}`);
    console.log("");
  } else {
    console.log("  All tests passed. Platform is healthy.");
    console.log("");
  }

  process.exit(allFailures.length > 0 ? 1 : 0);
}

main();
