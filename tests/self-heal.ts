/**
 * AgriNext Gen — Self-Healing MVP System
 *
 * Orchestrates an automated detect-fix-verify loop:
 *   1. Run platform validation (platform-check)
 *   2. If healthy, exit
 *   3. Run failure analysis to classify issues
 *   4. Apply safe, deterministic code fixes
 *   5. Re-run validation
 *   6. Repeat up to 3 iterations
 *   7. Generate final self-healing report
 *
 * Safety: never deletes data, never modifies DB schema, only safe code patches.
 *
 * Output:
 *   reports/fix-log.md
 *   reports/self-healing-report.md
 *
 * Run:  npm run self-heal
 */

import { execSync } from "child_process";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from "fs";
import { resolve, normalize } from "path";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const MAX_ITERATIONS = 3;
const PLATFORM_CHECK_TIMEOUT = 600_000; // 10 min
const ROOT_DIR = resolve(import.meta.dirname ?? __dirname, "..");
const REPORTS_DIR = resolve(ROOT_DIR, "reports");
const SRC_DIR = resolve(ROOT_DIR, "src");

const PROTECTED_PATHS = [
  "supabase/migrations",
  "src/integrations/supabase/types.ts",
  "src/components/ui",
  ".env",
  ".env.local",
  ".env.production",
  "node_modules",
  "package-lock.json",
  "bun.lockb",
];

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

interface DetectedFailure {
  module: string;
  testName: string;
  error: string;
  suggestion?: string;
  file?: string;
  category: FailureCategory;
  rootCause: string;
}

interface FixRecord {
  file: string;
  description: string;
  category: string;
  before: string;
  after: string;
}

interface HealingIteration {
  iteration: number;
  failuresBefore: number;
  fixesApplied: FixRecord[];
  failuresAfter: number;
  durationMs: number;
}

interface SelfHealingReport {
  startedAt: string;
  completedAt: string;
  iterations: HealingIteration[];
  totalFixesApplied: number;
  initialFailures: number;
  finalFailures: number;
  finalStatus: "HEALTHY" | "HEALED" | "PARTIALLY_HEALED" | "UNRESOLVED";
}

interface ValidationResult {
  passed: boolean;
  failureCount: number;
  failures: DetectedFailure[];
  rawOutput: string;
}

// ---------------------------------------------------------------------------
// Console helpers
// ---------------------------------------------------------------------------

const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  white: "\x1b[37m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgRed: "\x1b[41m",
};

function banner(text: string, color: string): void {
  const line = "=".repeat(60);
  console.log(`\n${color}${COLORS.bold}${line}`);
  console.log(`  ${text}`);
  console.log(`${line}${COLORS.reset}\n`);
}

function info(msg: string): void {
  console.log(`  ${COLORS.cyan}[INFO]${COLORS.reset} ${msg}`);
}

function success(msg: string): void {
  console.log(`  ${COLORS.green}[PASS]${COLORS.reset} ${msg}`);
}

function warn(msg: string): void {
  console.log(`  ${COLORS.yellow}[WARN]${COLORS.reset} ${msg}`);
}

function fail(msg: string): void {
  console.log(`  ${COLORS.red}[FAIL]${COLORS.reset} ${msg}`);
}

function heading(msg: string): void {
  console.log(`\n  ${COLORS.bold}${COLORS.white}${msg}${COLORS.reset}`);
}

// ---------------------------------------------------------------------------
// Path safety
// ---------------------------------------------------------------------------

function isProtectedPath(filePath: string): boolean {
  const normalized = normalize(filePath).replace(/\\/g, "/");
  return PROTECTED_PATHS.some((p) => normalized.includes(p));
}

function resolveSourceFile(relativePath: string): string | null {
  const candidates = [
    resolve(ROOT_DIR, relativePath),
    resolve(SRC_DIR, relativePath),
    resolve(ROOT_DIR, relativePath.replace(/^src\//, "")),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Step 2: Run platform validation
// ---------------------------------------------------------------------------

function runPlatformCheck(): ValidationResult {
  info("Running platform validation (npm run platform-check)...");

  let stdout = "";
  let stderr = "";
  let exitCode = 0;

  try {
    stdout = execSync("npm run platform-check", {
      encoding: "utf-8",
      timeout: PLATFORM_CHECK_TIMEOUT,
      stdio: ["pipe", "pipe", "pipe"],
      cwd: ROOT_DIR,
      env: { ...process.env, FORCE_COLOR: "0" },
    });
  } catch (err: unknown) {
    const execErr = err as { stdout?: string; stderr?: string; status?: number };
    stdout = execErr.stdout ?? "";
    stderr = execErr.stderr ?? "";
    exitCode = execErr.status ?? 1;
  }

  const rawOutput = `${stdout}\n${stderr}`;
  const passed = exitCode === 0;

  if (passed) {
    return { passed: true, failureCount: 0, failures: [], rawOutput };
  }

  const failures = parseFailuresFromReport();
  if (failures.length === 0) {
    const fallback = parseFailuresFromOutput(rawOutput);
    return {
      passed: false,
      failureCount: fallback.length || 1,
      failures: fallback,
      rawOutput,
    };
  }

  return { passed: false, failureCount: failures.length, failures, rawOutput };
}

// ---------------------------------------------------------------------------
// Step 3: Detect failures (parse report markdown)
// ---------------------------------------------------------------------------

function parseFailuresFromReport(): DetectedFailure[] {
  const reportPath = resolve(REPORTS_DIR, "platform-failure-report.md");
  if (!existsSync(reportPath)) return [];

  const content = readFileSync(reportPath, "utf-8");
  const failures: DetectedFailure[] = [];

  const detailSection = content.split("## Failure Details")[1];
  if (!detailSection) return [];

  const blockRegex =
    /####\s+(.+?)\s+—\s+(.+?)\n([\s\S]*?)(?=####|\n## |---|\*Report)/g;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(detailSection)) !== null) {
    const module = match[1].trim();
    const testName = match[2].trim();
    const body = match[3];

    const fileMatch = body.match(/\*\*File:\*\*\s+`(.+?)`/);
    const errorMatch = body.match(/\*\*Error:\*\*\s+(.+)/);
    const categoryMatch = body.match(/\*\*Category:\*\*\s+(.+)/);
    const suggestionMatch = body.match(/\*\*Suggestion:\*\*\s+(.+)/);

    const categoryRaw = categoryMatch?.[1]?.trim() ?? "";
    const category = inferCategoryFromLabel(categoryRaw);

    failures.push({
      module,
      testName,
      error: errorMatch?.[1]?.trim() ?? "Unknown error",
      suggestion: suggestionMatch?.[1]?.trim(),
      file: fileMatch?.[1]?.trim(),
      category,
      rootCause: "",
    });
  }

  return failures;
}

function parseFailuresFromOutput(output: string): DetectedFailure[] {
  const failures: DetectedFailure[] = [];
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

    failures.push({
      module,
      testName,
      error,
      suggestion,
      category: inferCategoryFromError(error, module),
      rootCause: "",
    });
  }

  return failures;
}

function inferCategoryFromLabel(label: string): FailureCategory {
  const l = label.toLowerCase();
  if (l.includes("backend") || l.includes("database")) return "BACKEND";
  if (l.includes("auth")) return "AUTHENTICATION";
  if (l.includes("permission") || l.includes("rls")) return "ROLE_PERMISSION";
  if (l.includes("ui") || l.includes("workflow")) return "UI_WORKFLOW";
  if (l.includes("storage")) return "STORAGE";
  if (l.includes("performance")) return "PERFORMANCE";
  if (l.includes("chaos")) return "CHAOS";
  return "BACKEND";
}

function inferCategoryFromError(error: string, module: string): FailureCategory {
  const e = error.toLowerCase();
  const m = module.toLowerCase();

  if (/401|unauthorized|token|jwt|session|login.*fail/i.test(e)) return "AUTHENTICATION";
  if (/rls|permission|forbidden|403|policy.*denied/i.test(e)) return "ROLE_PERMISSION";
  if (/upload.*fail|bucket|storage.*error|signed.url/i.test(e)) return "STORAGE";
  if (/timeout|etimedout|econnreset|504|408/i.test(e)) return "PERFORMANCE";
  if (/chaos|resilience/i.test(e) || m.includes("chaos")) return "CHAOS";
  if (/render|component|null.*access|undefined is not|cannot read prop/i.test(e)) return "UI_WORKFLOW";
  if (/column.*does not exist|relation.*does not|pgrst|database.*error/i.test(e)) return "BACKEND";

  if (m.includes("auth")) return "AUTHENTICATION";
  if (m.includes("storage")) return "STORAGE";
  if (m.includes("rls") || m.includes("permission")) return "ROLE_PERMISSION";
  if (m.includes("dashboard") || m.includes("ui")) return "UI_WORKFLOW";

  return "BACKEND";
}

// ---------------------------------------------------------------------------
// Step 5: Auto-fix engine
// ---------------------------------------------------------------------------

interface FixRule {
  id: string;
  category: FailureCategory[];
  errorPattern: RegExp;
  apply: (failure: DetectedFailure, fileContent: string, filePath: string) => FixAttempt | null;
}

interface FixAttempt {
  description: string;
  before: string;
  after: string;
}

const FIX_RULES: FixRule[] = [
  // --- Null guard: .single() -> .maybeSingle() ---
  {
    id: "single-to-maybeSingle",
    category: ["BACKEND", "UI_WORKFLOW"],
    errorPattern: /no rows|multiple.*rows|JSON object requested.*multiple/i,
    apply: (_failure, content, _path) => {
      const pattern = /\.single\(\)/g;
      if (!pattern.test(content)) return null;
      const before = content.match(/.{0,60}\.single\(\).{0,40}/)?.[0] ?? ".single()";
      return {
        description: "Replace .single() with .maybeSingle() to handle empty results gracefully",
        before,
        after: before.replace(".single()", ".maybeSingle()"),
      };
    },
  },

  // --- Null guard for health_status ---
  {
    id: "null-guard-health-status",
    category: ["BACKEND", "UI_WORKFLOW"],
    errorPattern: /health.?status|null|undefined is not|cannot read prop/i,
    apply: (_failure, content, _path) => {
      const dangerousPatterns = [
        { find: /(\w+)\.health_status\b(?!\s*[\?\!]|\s*\?\?)/g, field: "health_status", fallback: "'normal'" },
        { find: /(\w+)\.growth_stage\b(?!\s*[\?\!]|\s*\?\?)/g, field: "growth_stage", fallback: "'seedling'" },
      ];

      for (const { find, field, fallback } of dangerousPatterns) {
        const match = content.match(find);
        if (match) {
          const original = match[0];
          if (original.includes("??") || original.includes("?.")) continue;
          const parts = original.split(".");
          const obj = parts.slice(0, -1).join(".");
          const fixed = `(${obj}.${field} ?? ${fallback})`;
          return {
            description: `Add null guard for .${field} with fallback ${fallback}`,
            before: original,
            after: fixed,
          };
        }
      }
      return null;
    },
  },

  // --- Missing optional chaining on DB query results ---
  {
    id: "optional-chaining-data",
    category: ["UI_WORKFLOW", "BACKEND"],
    errorPattern: /cannot read prop|undefined is not|null.*access|TypeError/i,
    apply: (failure, content, _path) => {
      const propMatch = failure.error.match(/Cannot read propert(?:y|ies) of (?:null|undefined) \(reading '(\w+)'\)/i);
      if (!propMatch) return null;

      const prop = propMatch[1];
      const accessPattern = new RegExp(`(data|result|response|row|record|item)\\.${prop}\\b`, "g");
      const match = content.match(accessPattern);
      if (!match) return null;

      const original = match[0];
      if (original.includes("?.")) return null;
      const fixed = original.replace(`.${prop}`, `?.${prop}`);

      return {
        description: `Add optional chaining for .${prop} access to prevent null reference`,
        before: original,
        after: fixed,
      };
    },
  },

  // --- Add loading guard to component ---
  {
    id: "loading-guard",
    category: ["UI_WORKFLOW"],
    errorPattern: /blank.page|render|cannot read prop|undefined is not/i,
    apply: (_failure, content, filePath) => {
      if (!filePath.endsWith(".tsx")) return null;
      if (content.includes("isLoading") && content.includes("return")) return null;

      const hookMatch = content.match(/const\s*\{([^}]*isLoading[^}]*)\}\s*=\s*useQuery/);
      if (!hookMatch) return null;

      const returnMatch = content.match(/(\n\s*return\s*\()/);
      if (!returnMatch) return null;

      const before = returnMatch[1];
      const indent = before.match(/\n(\s*)/)?.[1] ?? "  ";
      const guard = `\n${indent}if (isLoading) return <div className="flex items-center justify-center p-8">Loading...</div>;\n`;
      const after = guard + before;

      return {
        description: "Add loading guard before render to prevent null access during data fetch",
        before: before.trim(),
        after: after.trim(),
      };
    },
  },

  // --- Fix .select('*') on sensitive tables ---
  {
    id: "explicit-select-columns",
    category: ["BACKEND", "ROLE_PERMISSION"],
    errorPattern: /permission|column.*does not exist|PGRST/i,
    apply: (_failure, content, _path) => {
      const sensitiveTablePattern = /\.from\(['"](profiles|user_roles|admin_users)['"]\)\s*\.select\(\s*['"]\*['"]\s*\)/;
      const match = content.match(sensitiveTablePattern);
      if (!match) return null;

      const table = match[1];
      const columnMap: Record<string, string> = {
        profiles: "'id, display_name, phone, role, language_preference, created_at'",
        user_roles: "'user_id, role, is_active, created_at'",
        admin_users: "'user_id, access_level, created_at'",
      };
      const columns = columnMap[table] ?? "'*'";

      return {
        description: `Replace .select('*') with explicit columns for ${table} table`,
        before: match[0],
        after: match[0].replace("'*'", columns).replace('"*"', columns),
      };
    },
  },

  // --- Fix missing error handling on Supabase queries ---
  {
    id: "supabase-error-handling",
    category: ["BACKEND"],
    errorPattern: /supabase.*error|database.*error|PGRST/i,
    apply: (_failure, content, _path) => {
      const pattern = /const\s*\{\s*data\s*\}\s*=\s*await\s+supabase/;
      const match = content.match(pattern);
      if (!match) return null;

      return {
        description: "Add error destructuring to Supabase query to enable proper error handling",
        before: match[0],
        after: match[0].replace("{ data }", "{ data, error }"),
      };
    },
  },

  // --- Add auth check to component ---
  {
    id: "auth-session-guard",
    category: ["AUTHENTICATION"],
    errorPattern: /401|unauthorized|session|token.*invalid/i,
    apply: (_failure, content, filePath) => {
      if (!filePath.endsWith(".tsx") && !filePath.endsWith(".ts")) return null;
      if (content.includes("useAuth")) return null;

      const hasSupabaseAuth = /supabase\.auth\.(getSession|getUser)/.test(content);
      if (!hasSupabaseAuth) return null;

      const pattern = /supabase\.auth\.getSession\(\)/;
      const match = content.match(pattern);
      if (!match) return null;

      return {
        description: "Session call found without useAuth hook — recommend migrating to useAuth pattern",
        before: match[0],
        after: match[0],
      };
    },
  },

  // --- Fix RLS-compatible queries (add user_id filter) ---
  {
    id: "rls-user-filter",
    category: ["ROLE_PERMISSION"],
    errorPattern: /permission|rls|forbidden|403|policy.*denied|row.*level/i,
    apply: (failure, content, _path) => {
      const tableMatch = failure.error.match(/(?:table|relation)\s+"?(\w+)"?/i);
      if (!tableMatch) return null;

      const table = tableMatch[1];
      const queryPattern = new RegExp(
        `\\.from\\(['"]${table}['"]\\)\\s*\\.select\\([^)]*\\)(?!\\s*\\.eq\\(['"](?:user_id|farmer_id|buyer_id|agent_id))`,
      );
      const match = content.match(queryPattern);
      if (!match) return null;

      return {
        description: `Add user_id filter to ${table} query for RLS compliance`,
        before: match[0],
        after: match[0] + "\n      .eq('user_id', userId)",
      };
    },
  },

  // --- Fix storage path format ---
  {
    id: "storage-path-fix",
    category: ["STORAGE"],
    errorPattern: /storage|bucket|upload.*fail|object.*not.*found/i,
    apply: (_failure, content, _path) => {
      const badPathPattern = /\.upload\(\s*['"]\/([^'"]+)['"]/;
      const match = content.match(badPathPattern);
      if (!match) return null;

      return {
        description: "Remove leading slash from storage upload path (Supabase Storage rejects leading slashes)",
        before: match[0],
        after: match[0].replace(`'/${match[1]}'`, `'${match[1]}'`).replace(`"/${match[1]}"`, `"${match[1]}"`),
      };
    },
  },

  // --- Add timeout/retry for network issues ---
  {
    id: "add-fetch-timeout",
    category: ["PERFORMANCE"],
    errorPattern: /timeout|etimedout|econnreset|abort.*signal/i,
    apply: (_failure, content, _path) => {
      const fetchWithoutSignal = /fetch\(\s*[^,]+,\s*\{(?![^}]*signal)[^}]*\}/;
      const match = content.match(fetchWithoutSignal);
      if (!match) return null;

      const original = match[0];
      const insertPoint = original.lastIndexOf("}");
      const fixed =
        original.slice(0, insertPoint) +
        ", signal: AbortSignal.timeout(30000)" +
        original.slice(insertPoint);

      return {
        description: "Add 30s timeout signal to fetch call to prevent hanging requests",
        before: original.slice(0, 80) + "...",
        after: fixed.slice(0, 80) + "...",
      };
    },
  },
];

function applyAutoFixes(failures: DetectedFailure[]): FixRecord[] {
  const fixes: FixRecord[] = [];
  const modifiedFiles = new Set<string>();

  for (const failure of failures) {
    if (!failure.file || failure.file === "unknown") continue;

    const filePath = resolveSourceFile(failure.file);
    if (!filePath) {
      warn(`Cannot locate file: ${failure.file}`);
      continue;
    }

    if (isProtectedPath(filePath)) {
      warn(`Skipping protected file: ${failure.file}`);
      continue;
    }

    let content: string;
    try {
      content = readFileSync(filePath, "utf-8");
    } catch {
      warn(`Cannot read file: ${filePath}`);
      continue;
    }

    for (const rule of FIX_RULES) {
      if (!rule.category.includes(failure.category)) continue;
      if (!rule.errorPattern.test(failure.error)) continue;

      const attempt = rule.apply(failure, content, filePath);
      if (!attempt) continue;
      if (attempt.before === attempt.after) continue;

      if (!content.includes(attempt.before)) continue;

      const newContent = content.replace(attempt.before, attempt.after);
      if (newContent === content) continue;

      try {
        writeFileSync(filePath, newContent, "utf-8");
        content = newContent;
        modifiedFiles.add(filePath);

        fixes.push({
          file: failure.file,
          description: attempt.description,
          category: failure.category,
          before: attempt.before,
          after: attempt.after,
        });

        success(`Fixed [${rule.id}] in ${failure.file}: ${attempt.description}`);
      } catch (writeErr) {
        warn(`Failed to write fix to ${filePath}: ${writeErr}`);
      }

      break;
    }
  }

  return fixes;
}

// ---------------------------------------------------------------------------
// Step 6: Fix log generation
// ---------------------------------------------------------------------------

function generateFixLog(allFixes: FixRecord[], iterations: HealingIteration[]): string {
  const timestamp = new Date().toISOString();
  let md = "";

  md += "# AGRINEXT GEN — AUTO-FIX LOG\n\n";
  md += `**Generated At:** ${timestamp}\n\n`;
  md += `**Total Fixes Applied:** ${allFixes.length}\n\n`;
  md += `**Healing Iterations:** ${iterations.length}\n\n`;
  md += "---\n\n";

  if (allFixes.length === 0) {
    md += "No auto-fixes were applied. All failures require manual intervention.\n\n";
    return md;
  }

  for (const iter of iterations) {
    if (iter.fixesApplied.length === 0) continue;

    md += `## Iteration ${iter.iteration}\n\n`;
    md += `- **Failures Before:** ${iter.failuresBefore}\n`;
    md += `- **Fixes Applied:** ${iter.fixesApplied.length}\n`;
    md += `- **Failures After:** ${iter.failuresAfter}\n`;
    md += `- **Duration:** ${formatDuration(iter.durationMs)}\n\n`;

    for (let i = 0; i < iter.fixesApplied.length; i++) {
      const fix = iter.fixesApplied[i];
      md += `### Fix ${i + 1}: ${fix.description}\n\n`;
      md += `- **File:** \`${fix.file}\`\n`;
      md += `- **Category:** ${fix.category}\n\n`;
      md += "**Before:**\n";
      md += "```\n" + fix.before + "\n```\n\n";
      md += "**After:**\n";
      md += "```\n" + fix.after + "\n```\n\n";
    }

    md += "---\n\n";
  }

  md += "## Files Modified\n\n";
  const uniqueFiles = [...new Set(allFixes.map((f) => f.file))];
  for (const file of uniqueFiles) {
    const count = allFixes.filter((f) => f.file === file).length;
    md += `- \`${file}\` (${count} fix${count > 1 ? "es" : ""})\n`;
  }
  md += "\n";

  md += "---\n\n";
  md += `*Fix log generated by AgriNext Gen Self-Healing System at ${timestamp}*\n`;

  return md;
}

// ---------------------------------------------------------------------------
// Step 9: Final report generation
// ---------------------------------------------------------------------------

function generateSelfHealingReport(report: SelfHealingReport): string {
  const { startedAt, completedAt, iterations, totalFixesApplied, initialFailures, finalFailures, finalStatus } = report;

  let md = "";

  md += "# AGRINEXT GEN — SELF-HEALING REPORT\n\n";
  md += `**Started At:** ${startedAt}\n`;
  md += `**Completed At:** ${completedAt}\n\n`;
  md += `**Final Status:** ${formatStatus(finalStatus)}\n\n`;
  md += "---\n\n";

  // Executive summary
  md += "## Executive Summary\n\n";
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Validation Cycles | ${iterations.length} |\n`;
  md += `| Initial Failures | ${initialFailures} |\n`;
  md += `| Final Failures | ${finalFailures} |\n`;
  md += `| Failures Resolved | ${initialFailures - finalFailures} |\n`;
  md += `| Total Fixes Applied | ${totalFixesApplied} |\n`;
  md += `| Final Status | ${finalStatus} |\n`;
  md += "\n---\n\n";

  // Iteration details
  md += "## Validation Cycles\n\n";

  for (const iter of iterations) {
    md += `### Cycle ${iter.iteration}\n\n`;
    md += `| Metric | Value |\n`;
    md += `|--------|-------|\n`;
    md += `| Failures Detected | ${iter.failuresBefore} |\n`;
    md += `| Fixes Applied | ${iter.fixesApplied.length} |\n`;
    md += `| Failures After | ${iter.failuresAfter} |\n`;
    md += `| Duration | ${formatDuration(iter.durationMs)} |\n`;
    md += "\n";

    if (iter.fixesApplied.length > 0) {
      md += "**Fixes Applied:**\n\n";
      for (const fix of iter.fixesApplied) {
        md += `- **[${fix.category}]** ${fix.description} in \`${fix.file}\`\n`;
      }
      md += "\n";
    }
  }

  md += "---\n\n";

  // Status explanation
  md += "## Status Explanation\n\n";
  switch (finalStatus) {
    case "HEALTHY":
      md += "The platform passed all validation checks on the first run. No fixes were needed.\n\n";
      break;
    case "HEALED":
      md += "The platform had failures that were automatically resolved. All validation checks now pass.\n\n";
      break;
    case "PARTIALLY_HEALED":
      md += "Some failures were automatically resolved, but others remain and require manual intervention.\n";
      md += "Review `reports/platform-failure-report.md` for remaining issues.\n\n";
      break;
    case "UNRESOLVED":
      md += "The self-healing system was unable to resolve any failures automatically.\n";
      md += "All failures require manual investigation.\n";
      md += "Review `reports/platform-failure-report.md` and `reports/fix-tasks.md` for details.\n\n";
      break;
  }

  md += "---\n\n";
  md += `*Report generated by AgriNext Gen Self-Healing System at ${completedAt}*\n`;

  return md;
}

function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    HEALTHY: "SYSTEM HEALTHY (no issues detected)",
    HEALED: "PLATFORM SUCCESSFULLY HEALED",
    PARTIALLY_HEALED: "PARTIALLY HEALED (some issues remain)",
    UNRESOLVED: "UNRESOLVED (manual intervention required)",
  };
  return labels[status] ?? status;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = ((ms % 60_000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
}

// ---------------------------------------------------------------------------
// Main orchestration loop
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  mkdirSync(REPORTS_DIR, { recursive: true });

  const startedAt = new Date().toISOString();
  const iterations: HealingIteration[] = [];
  const allFixes: FixRecord[] = [];

  banner("AgriNext Gen — Self-Healing System", COLORS.cyan);
  info(`Started at: ${startedAt}`);
  info(`Max iterations: ${MAX_ITERATIONS}`);
  info(`Reports directory: ${REPORTS_DIR}`);

  // --- Initial validation ---
  heading("STEP 1: Initial Platform Validation");
  const initial = runPlatformCheck();

  if (initial.passed) {
    banner("SYSTEM HEALTHY", COLORS.bgGreen);
    info("All platform validation checks passed. No healing required.");

    const report: SelfHealingReport = {
      startedAt,
      completedAt: new Date().toISOString(),
      iterations: [],
      totalFixesApplied: 0,
      initialFailures: 0,
      finalFailures: 0,
      finalStatus: "HEALTHY",
    };

    writeReport(report, allFixes, iterations);
    process.exit(0);
  }

  const initialFailures = initial.failureCount;
  info(`Detected ${initialFailures} failure(s) across platform validation suites.`);

  // --- Healing loop ---
  let lastValidation = initial;

  for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
    const iterStart = Date.now();

    banner(`Healing Iteration ${iteration}/${MAX_ITERATIONS}`, COLORS.magenta);

    // Step 3: Detect and display failures
    heading(`STEP 3: Failure Detection (Iteration ${iteration})`);
    info(`${lastValidation.failures.length} failure(s) to analyze.`);

    const categoryCounts: Record<string, number> = {};
    for (const f of lastValidation.failures) {
      categoryCounts[f.category] = (categoryCounts[f.category] ?? 0) + 1;
    }
    for (const [cat, count] of Object.entries(categoryCounts)) {
      info(`  ${cat}: ${count} failure(s)`);
    }

    // Step 4: Run failure analysis (regenerates reports)
    heading(`STEP 4: Failure Analysis (Iteration ${iteration})`);
    info("Running failure analysis to generate detailed report...");
    try {
      execSync("npm run failure-analysis", {
        encoding: "utf-8",
        timeout: PLATFORM_CHECK_TIMEOUT,
        stdio: ["pipe", "pipe", "pipe"],
        cwd: ROOT_DIR,
        env: { ...process.env, FORCE_COLOR: "0" },
      });
    } catch {
      // failure-analysis exits with code 1 when failures exist — expected
    }

    const freshFailures = parseFailuresFromReport();
    if (freshFailures.length > 0) {
      lastValidation.failures = freshFailures;
      lastValidation.failureCount = freshFailures.length;
    }

    // Step 5: Apply auto-fixes
    heading(`STEP 5: Auto-Fix Phase (Iteration ${iteration})`);
    const fixes = applyAutoFixes(lastValidation.failures);

    if (fixes.length === 0) {
      warn("No auto-fixable patterns found. Remaining failures require manual intervention.");

      iterations.push({
        iteration,
        failuresBefore: lastValidation.failureCount,
        fixesApplied: [],
        failuresAfter: lastValidation.failureCount,
        durationMs: Date.now() - iterStart,
      });
      break;
    }

    allFixes.push(...fixes);
    info(`Applied ${fixes.length} fix(es) in this iteration.`);

    // Step 6: Log fixes
    heading(`STEP 6: Fix Logging (Iteration ${iteration})`);
    info("Fix details will be written to reports/fix-log.md after all iterations.");

    // Step 7: Re-run validation
    heading(`STEP 7: Re-Validation (Iteration ${iteration})`);
    const revalidation = runPlatformCheck();

    iterations.push({
      iteration,
      failuresBefore: lastValidation.failureCount,
      fixesApplied: fixes,
      failuresAfter: revalidation.failureCount,
      durationMs: Date.now() - iterStart,
    });

    // Step 8: Check health
    heading(`STEP 8: Health Check (Iteration ${iteration})`);

    if (revalidation.passed) {
      banner("PLATFORM SUCCESSFULLY HEALED", COLORS.bgGreen);
      info(`Resolved all ${initialFailures} failure(s) in ${iteration} iteration(s).`);
      info(`Total fixes applied: ${allFixes.length}`);

      const report: SelfHealingReport = {
        startedAt,
        completedAt: new Date().toISOString(),
        iterations,
        totalFixesApplied: allFixes.length,
        initialFailures,
        finalFailures: 0,
        finalStatus: "HEALED",
      };

      writeReport(report, allFixes, iterations);
      process.exit(0);
    }

    info(`${revalidation.failureCount} failure(s) remain after iteration ${iteration}.`);

    if (revalidation.failureCount >= lastValidation.failureCount) {
      warn("No improvement detected. Fixes may not be addressing root causes.");
    } else {
      success(`Reduced failures from ${lastValidation.failureCount} to ${revalidation.failureCount}.`);
    }

    lastValidation = revalidation;
  }

  // --- Final status ---
  const finalFailures = lastValidation.failureCount;
  const resolved = initialFailures - finalFailures;
  const finalStatus: SelfHealingReport["finalStatus"] =
    finalFailures === 0
      ? "HEALED"
      : resolved > 0
        ? "PARTIALLY_HEALED"
        : "UNRESOLVED";

  if (finalStatus === "PARTIALLY_HEALED") {
    banner("PARTIALLY HEALED", COLORS.bgYellow);
    info(`Resolved ${resolved} of ${initialFailures} failure(s).`);
    info(`${finalFailures} failure(s) remain and require manual intervention.`);
  } else {
    banner("UNRESOLVED", COLORS.bgRed);
    fail(`Unable to automatically resolve ${finalFailures} failure(s).`);
    fail("Manual intervention required. Review reports for details.");
  }

  const report: SelfHealingReport = {
    startedAt,
    completedAt: new Date().toISOString(),
    iterations,
    totalFixesApplied: allFixes.length,
    initialFailures,
    finalFailures,
    finalStatus,
  };

  writeReport(report, allFixes, iterations);
  process.exit(finalFailures > 0 ? 1 : 0);
}

function writeReport(
  report: SelfHealingReport,
  allFixes: FixRecord[],
  iterations: HealingIteration[],
): void {
  heading("STEP 9: Final Reports");

  const fixLogPath = resolve(REPORTS_DIR, "fix-log.md");
  const reportPath = resolve(REPORTS_DIR, "self-healing-report.md");

  const fixLog = generateFixLog(allFixes, iterations);
  const healingReport = generateSelfHealingReport(report);

  writeFileSync(fixLogPath, fixLog, "utf-8");
  writeFileSync(reportPath, healingReport, "utf-8");

  info("Reports generated:");
  info(`  ${fixLogPath}`);
  info(`  ${reportPath}`);
  console.log("");

  // Print final summary table
  heading("FINAL SUMMARY");
  console.log("");
  console.log("  +----------------------------+-------------------+");
  console.log("  | Metric                     | Value             |");
  console.log("  +----------------------------+-------------------+");
  console.log(`  | Validation Cycles          | ${String(report.iterations.length).padEnd(17)} |`);
  console.log(`  | Initial Failures           | ${String(report.initialFailures).padEnd(17)} |`);
  console.log(`  | Final Failures             | ${String(report.finalFailures).padEnd(17)} |`);
  console.log(`  | Failures Resolved          | ${String(report.initialFailures - report.finalFailures).padEnd(17)} |`);
  console.log(`  | Total Fixes Applied        | ${String(report.totalFixesApplied).padEnd(17)} |`);
  console.log(`  | Final Status               | ${report.finalStatus.padEnd(17)} |`);
  console.log("  +----------------------------+-------------------+");
  console.log("");
}

main();
