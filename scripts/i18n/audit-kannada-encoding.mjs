import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

const TARGETS = [
  { path: "src/i18n/kn.ts", severity: "warn" },
  { path: "src/i18n/index.ts", severity: "error" },
  { path: "src/components/farmer/VoiceAssistant.tsx", severity: "error" },
  { path: "src/pages/farmer/Settings.tsx", severity: "error" },
  { path: "src/pages/marketplace/Dashboard.tsx", severity: "error" },
  { path: "src/pages/agent/Dashboard.tsx", severity: "error" },
  { path: "src/pages/logistics/Dashboard.tsx", severity: "error" },
  { path: "src/pages/admin/Dashboard.tsx", severity: "error" },
];

const suspiciousPatterns = [
  { name: "mojibake_a_grave", regex: /à[^\s]{1,}/g },
  { name: "mojibake_A_tilde", regex: /Ã[^\s]{1,}/g },
  { name: "mojibake_A_circumflex", regex: /Â[^\s]{1,}/g },
  { name: "replacement_char", regex: /\uFFFD/g },
  { name: "placeholder_question_run", regex: /\?{4,}/g },
];

function collectMatches(text) {
  const findings = [];
  for (const pattern of suspiciousPatterns) {
    let match;
    while ((match = pattern.regex.exec(text)) !== null) {
      findings.push({
        pattern: pattern.name,
        index: match.index,
        sample: match[0].slice(0, 80),
      });
      if (findings.length > 1000) break;
    }
  }
  return findings;
}

function isIgnoredFinding(targetPath, text, finding) {
  if (
    targetPath === "src/i18n/index.ts" &&
    finding.pattern === "placeholder_question_run"
  ) {
    const window = text.slice(Math.max(0, finding.index - 30), finding.index + 30);
    if (window.includes("includes('????')")) return true;
  }
  return false;
}

let failed = false;

for (const target of TARGETS) {
  const relative = target.path;
  const abs = path.join(repoRoot, relative);
  if (!fs.existsSync(abs)) continue;
  const text = fs.readFileSync(abs, "utf8");
  const findings = collectMatches(text).filter((finding) => !isIgnoredFinding(relative, text, finding));
  if (findings.length) {
    if (target.severity === "error") failed = true;
    const prefix = target.severity === "error" ? "FAIL" : "WARN";
    const sink = target.severity === "error" ? console.error : console.warn;
    sink(`${prefix} ${relative}: ${findings.length} suspicious match(es)`);
    for (const finding of findings.slice(0, 20)) {
      sink(`  - ${finding.pattern} @ ${finding.index}: ${JSON.stringify(finding.sample)}`);
    }
    if (findings.length > 20) {
      sink(`  ... ${findings.length - 20} more`);
    }
  } else {
    console.log(`PASS ${relative}`);
  }
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log("Kannada encoding audit passed.");
}
