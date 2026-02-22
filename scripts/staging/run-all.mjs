import path from "node:path";
import { spawnSync } from "node:child_process";
import { argValue, hasFlag, generateDemoTag, writeJsonFile, assertStagingEnvironment } from "./common.mjs";

assertStagingEnvironment();

function runNodeScript(scriptPath, args) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    stdio: "inherit",
    env: process.env,
  });
  return {
    status: result.status ?? 1,
    signal: result.signal ?? null,
  };
}

function main() {
  const demoTag = argValue("--demo-tag") ?? generateDemoTag("dummy");
  const password = argValue("--password") ?? "Dummy@12345";
  const dryRun = hasFlag("--dry-run");
  const skipSignup = hasFlag("--skip-signup");

  if (!/^dummy_\d{8}_\d{4}$/.test(demoTag)) {
    throw new Error("demo_tag must match dummy_YYYYMMDD_HHMM");
  }

  const outDir = argValue("--out-dir") ?? "artifacts/staging";
  const baselineFile = path.join(outDir, `baseline-${demoTag}.json`);
  const usersFile = path.join(outDir, `demo-users-${demoTag}.json`);
  const seedFile = path.join(outDir, `seed-data-${demoTag}.json`);
  const smokeFile = path.join(outDir, `smoke-phone-auth-${demoTag}.json`);
  const manifestFile = path.join(outDir, `run-all-${demoTag}.json`);

  const operations = [];

  const baseline = runNodeScript("scripts/staging/verify-baseline.mjs", ["--output", baselineFile]);
  operations.push({ step: "verify-baseline", ...baseline, output: baselineFile });
  if (baseline.status !== 0) throw new Error("verify-baseline failed");

  const provisionArgs = ["--demo-tag", demoTag, "--password", password, "--output", usersFile];
  if (dryRun) provisionArgs.push("--dry-run");
  const provision = runNodeScript("scripts/staging/provision-dummy-users.mjs", provisionArgs);
  operations.push({ step: "provision-dummy-users", ...provision, output: usersFile });
  if (provision.status !== 0) throw new Error("provision-dummy-users failed");

  if (!dryRun) {
    const seed = runNodeScript("scripts/staging/seed-dummy-data.mjs", ["--users-file", usersFile, "--output", seedFile]);
    operations.push({ step: "seed-dummy-data", ...seed, output: seedFile });
    if (seed.status !== 0) throw new Error("seed-dummy-data failed");

    const smokeArgs = ["--users-file", usersFile, "--demo-tag", demoTag, "--password", password, "--output", smokeFile];
    if (skipSignup) smokeArgs.push("--skip-signup");
    const smoke = runNodeScript("scripts/staging/smoke-phone-auth.mjs", smokeArgs);
    operations.push({ step: "smoke-phone-auth", ...smoke, output: smokeFile });
    if (smoke.status !== 0) throw new Error("smoke-phone-auth failed");
  }

  const manifest = {
    kind: "staging_run_all",
    executed_at: new Date().toISOString(),
    demo_tag: demoTag,
    dry_run: dryRun,
    skip_signup: skipSignup,
    outputs: {
      baseline: baselineFile,
      users: usersFile,
      seed: dryRun ? null : seedFile,
      smoke: dryRun ? null : smokeFile,
    },
    operations,
  };

  writeJsonFile(manifestFile, manifest);
  console.log(`Run manifest written: ${manifestFile}`);
  console.log(`demo_tag=${demoTag}`);
  console.log(`dry_run=${dryRun}`);
}

main();
