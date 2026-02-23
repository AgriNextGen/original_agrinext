import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const migrationsDir = path.join(repoRoot, "supabase", "migrations");
const baselinePath = path.join(repoRoot, "scripts", "security", "sql-security-baseline.json");

function listSqlFiles(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith(".sql"))
    .map((d) => d.name)
    .sort()
    .map((name) => path.join(dir, name));
}

function lineOf(text, idx) {
  return text.slice(0, idx).split(/\r?\n/).length;
}

function* scanFunctions(filePath, text) {
  const regex = /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+([a-zA-Z0-9_.]+)\s*\(/gim;
  const matches = [...text.matchAll(regex)];
  for (let i = 0; i < matches.length; i += 1) {
    const match = matches[i];
    const fnName = match[1];
    const start = match.index ?? 0;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? text.length) : text.length;
    yield {
      fnName,
      start,
      line: lineOf(text, start),
      body: text.slice(start, end),
      file: path.relative(repoRoot, filePath),
    };
  }
}

function main() {
  const errors = [];
  const warnings = [];
  const infos = [];

  for (const filePath of listSqlFiles(migrationsDir)) {
    const text = fs.readFileSync(filePath, "utf8");
    const rel = path.relative(repoRoot, filePath);

    for (const fn of scanFunctions(filePath, text)) {
      const isSecurityDefiner = /SECURITY\s+DEFINER/i.test(fn.body);
      if (!isSecurityDefiner) continue;

      if (!/SET\s+search_path\s*=/i.test(fn.body.split("AS $$")[0] || fn.body)) {
        errors.push(`${fn.file}:${fn.line} ${fn.fnName} SECURITY DEFINER without SET search_path`);
      }

      if (/^admin\./i.test(fn.fnName) && !/public\.is_admin\s*\(/i.test(fn.body)) {
        warnings.push(`${fn.file}:${fn.line} ${fn.fnName} admin SECURITY DEFINER without explicit public.is_admin() check`);
      }

      if (/current_setting\s*\(\s*'app\.webhook'/i.test(fn.body)) {
        warnings.push(`${fn.file}:${fn.line} ${fn.fnName} relies on app.webhook session flag`);
      }

      if (/EXECUTE\s+format\s*\(/i.test(fn.body)) {
        infos.push(`${fn.file}:${fn.line} ${fn.fnName} uses dynamic SQL via EXECUTE format(...)`);
      }
    }

    for (const m of text.matchAll(/GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+([^\s(]+)\([^;]*\)\s+TO\s+public\s*;/gim)) {
      const fnSig = m[1];
      const ln = lineOf(text, m.index ?? 0);
      if (/payment|webhook|secure\./i.test(fnSig)) {
        errors.push(`${rel}:${ln} sensitive function granted EXECUTE TO public (${fnSig})`);
      } else {
        warnings.push(`${rel}:${ln} function granted EXECUTE TO public (${fnSig})`);
      }
    }
  }

  let baseline = { errors: [], warnings: [], infos: [] };
  if (fs.existsSync(baselinePath)) {
    try {
      baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
    } catch {
      // ignore malformed baseline and report raw findings
    }
  }

  const baselineErrors = new Set(baseline.errors || []);
  const baselineWarnings = new Set(baseline.warnings || []);
  const baselineInfos = new Set(baseline.infos || []);

  const newErrors = errors.filter((e) => !baselineErrors.has(e));
  const newWarnings = warnings.filter((w) => !baselineWarnings.has(w));
  const newInfos = infos.filter((i) => !baselineInfos.has(i));

  const result = {
    checked_at: new Date().toISOString(),
    baseline_loaded: fs.existsSync(baselinePath),
    totals: { errors: errors.length, warnings: warnings.length, infos: infos.length },
    new_findings: {
      errors: newErrors,
      warnings: newWarnings,
      infos: newInfos,
    },
    baseline_suppressed: {
      errors: errors.length - newErrors.length,
      warnings: warnings.length - newWarnings.length,
      infos: infos.length - newInfos.length,
    },
  };

  console.log(JSON.stringify(result, null, 2));
  if (newErrors.length > 0) process.exitCode = 1;
}

main();
