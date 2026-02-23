import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const functionsDir = path.join(repoRoot, "supabase", "functions");
const configTomlPath = path.join(repoRoot, "supabase", "config.toml");

function listFunctionDirs() {
  return fs
    .readdirSync(functionsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "_shared")
    .map((d) => d.name)
    .sort();
}

function parseFunctionVerifyJwtConfig(tomlText) {
  const map = new Map();
  let currentFn = null;
  for (const rawLine of tomlText.split(/\r?\n/)) {
    const line = rawLine.trim();
    const section = line.match(/^\[functions\.(?:"([^"]+)"|([^\]]+))\]$/);
    if (section) {
      currentFn = (section[1] || section[2] || "").trim();
      continue;
    }
    if (!currentFn) continue;
    const verify = line.match(/^verify_jwt\s*=\s*(true|false)\s*$/i);
    if (verify) {
      map.set(currentFn, verify[1].toLowerCase() === "true");
    }
  }
  return map;
}

function analyzeFunctionFile(fnName) {
  const indexPath = path.join(functionsDir, fnName, "index.ts");
  if (!fs.existsSync(indexPath)) {
    return {
      fnName,
      indexPath,
      errors: [`missing index.ts`],
      warnings: [],
    };
  }
  const text = fs.readFileSync(indexPath, "utf8");
  const errors = [];
  const warnings = [];

  const serveCount = (text.match(/\bDeno\.serve\s*\(/g) || []).length + (text.match(/^\s*serve\s*\(/gm) || []).length;
  if (serveCount !== 1) {
    errors.push(`expected exactly 1 serve handler, found ${serveCount}`);
  }

  for (const mod of ["env.ts", "cors.ts", "errors.ts"]) {
    const relImport = `../_shared/${mod}`;
    if (text.includes(relImport) && !fs.existsSync(path.join(functionsDir, "_shared", mod))) {
      errors.push(`imports missing shared helper ${relImport}`);
    }
  }

  if (/\b[a-zA-Z_]\w*::[a-zA-Z_]\w*\b/.test(text)) {
    errors.push(`possible leaked Postgres cast syntax (::) in TypeScript source`);
  }

  if (text.includes("SUPABASE_SERVICE_ROLE_KEY") && !/Authorization|auth\.getUser|\/auth\/v1\/user|x-worker-secret|signature/i.test(text)) {
    warnings.push(`service-role usage without obvious auth/secret/signature guard pattern`);
  }

  return {
    fnName,
    indexPath: path.relative(repoRoot, indexPath),
    errors,
    warnings,
  };
}

function main() {
  const functionDirs = listFunctionDirs();
  const configText = fs.readFileSync(configTomlPath, "utf8");
  const verifyMap = parseFunctionVerifyJwtConfig(configText);

  const results = functionDirs.map(analyzeFunctionFile);
  const errors = [];
  const warnings = [];

  for (const fn of functionDirs) {
    if (!verifyMap.has(fn)) {
      errors.push(`supabase/config.toml missing [functions.\"${fn}\"] verify_jwt`);
    }
  }

  for (const entry of results) {
    for (const error of entry.errors) {
      errors.push(`${entry.indexPath}: ${error}`);
    }
    for (const warning of entry.warnings) {
      warnings.push(`${entry.indexPath}: ${warning}`);
    }
  }

  const summary = {
    checked_at: new Date().toISOString(),
    functions_checked: functionDirs.length,
    verify_jwt_entries: verifyMap.size,
    errors,
    warnings,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (errors.length > 0) {
    process.exitCode = 1;
  }
}

main();
