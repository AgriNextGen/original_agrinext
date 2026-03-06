/**
 * repair-auth.mjs
 *
 * Diagnoses and repairs the 5 dummy test accounts in one pass:
 *   1. Prints current state (account_status, blocked_until, failed_login_count_window, role)
 *   2. Resets all lockout state (account_status → active, blocked_until → null, counters → 0)
 *      Also force-unlocks permanently-locked accounts.
 *   3. Ensures user_roles row exists for each account.
 *   4. Prints final verified state.
 *
 * Requires:
 *   SUPABASE_URL            (or VITE_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node scripts/staging/repair-auth.mjs
 *   node scripts/staging/repair-auth.mjs --dry-run
 */

import { createAdminClient, argValue, hasFlag, assertStagingEnvironment } from "./common.mjs";

assertStagingEnvironment();
const admin = createAdminClient();
const DRY_RUN = hasFlag("--dry-run");

const DUMMY_ACCOUNTS = [
  { phone: "+919900000101", role: "farmer",    name: "Basavaraju Gowda" },
  { phone: "+919900000102", role: "agent",     name: "Shwetha Kumar" },
  { phone: "+919900000103", role: "logistics", name: "Manjunath N" },
  { phone: "+919900000104", role: "buyer",     name: "Ayesha Fathima" },
  { phone: "+919900000105", role: "admin",     name: "Raghavendra S" },
];

function fmt(val) {
  if (val === null || val === undefined) return "null";
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

async function fetchProfile(phone) {
  const { data, error } = await admin
    .from("profiles")
    .select("id, full_name, phone, account_status, blocked_until, failed_login_count_window, failed_login_window_started_at")
    .eq("phone", phone)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`profiles query failed for ${phone}: ${error.message}`);
  return data;
}

async function fetchRole(userId) {
  const { data, error } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`user_roles query failed for ${userId}: ${error.message}`);
  return data?.role ?? null;
}

async function resetLockout(profileId, phone) {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would reset lockout for ${phone} (id=${profileId})`);
    return true;
  }
  const { error } = await admin
    .from("profiles")
    .update({
      account_status: "active",
      blocked_until: null,
      failed_login_count_window: 0,
      failed_login_window_started_at: null,
      last_failed_login_at: null,
    })
    .eq("id", profileId);
  if (error) throw new Error(`profiles update failed for ${phone}: ${error.message}`);
  return true;
}

async function ensureUserRole(userId, role, phone) {
  const { error } = await admin
    .from("user_roles")
    .upsert({ user_id: userId, role, created_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw new Error(`user_roles upsert failed for ${phone}: ${error.message}`);
}

async function main() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`repair-auth.mjs${DRY_RUN ? " [DRY RUN]" : ""}`);
  console.log(`${"=".repeat(60)}\n`);

  const before = [];
  const after = [];

  // ── PHASE 1: DIAGNOSE ─────────────────────────────────────────
  console.log("PHASE 1 — Current state of dummy accounts\n");
  console.log("Phone            | Name                | Status     | blocked_until        | fails | role");
  console.log("-".repeat(100));

  for (const spec of DUMMY_ACCOUNTS) {
    const profile = await fetchProfile(spec.phone);
    const role = profile ? await fetchRole(profile.id) : null;

    const state = {
      phone: spec.phone,
      name: spec.name,
      profile_found: !!profile,
      profile_id: profile?.id ?? null,
      account_status: profile?.account_status ?? "MISSING",
      blocked_until: profile?.blocked_until ?? null,
      failed_login_count_window: profile?.failed_login_count_window ?? null,
      role_in_db: role,
      expected_role: spec.role,
    };
    before.push(state);

    const statusFlag = !profile ? "NO PROFILE" : state.account_status !== "active" ? `⚠ ${state.account_status}` : "active";
    const roleFlag = !role ? "MISSING" : role !== spec.role ? `WRONG (${role})` : role;
    console.log(
      `${spec.phone.padEnd(16)} | ${spec.name.padEnd(20)} | ${statusFlag.padEnd(10)} | ${fmt(state.blocked_until).padEnd(20)} | ${fmt(state.failed_login_count_window).padStart(5)} | ${roleFlag}`,
    );
  }

  console.log();

  // ── PHASE 2: FIX ──────────────────────────────────────────────
  console.log(`PHASE 2 — Applying fixes${DRY_RUN ? " (DRY RUN — no writes)" : ""}\n`);

  const errors = [];

  for (const state of before) {
    process.stdout.write(`  ${state.phone} (${state.expected_role}): `);

    if (!state.profile_found) {
      console.log("SKIP — profile not found (run staging:provision-dummy-users to create)");
      errors.push(`${state.phone}: profile not found — run staging:provision-dummy-users`);
      continue;
    }

    const fixes = [];

    // Fix 1: Reset lockout state
    const needsUnlock =
      state.account_status !== "active" ||
      state.blocked_until !== null ||
      (state.failed_login_count_window ?? 0) > 0;

    if (needsUnlock) {
      await resetLockout(state.profile_id, state.phone);
      fixes.push(`reset lockout (was: ${state.account_status}, ${fmt(state.blocked_until)}, ${state.failed_login_count_window} fails)`);
    }

    // Fix 2: Ensure user_roles
    const roleWrong = !state.role_in_db || state.role_in_db !== state.expected_role;
    if (roleWrong && !DRY_RUN) {
      await ensureUserRole(state.profile_id, state.expected_role, state.phone);
      fixes.push(`set role to ${state.expected_role} (was: ${state.role_in_db ?? "MISSING"})`);
    } else if (roleWrong && DRY_RUN) {
      fixes.push(`[DRY RUN] would set role to ${state.expected_role} (was: ${state.role_in_db ?? "MISSING"})`);
    }

    if (fixes.length === 0) {
      console.log("already clean — no changes needed");
    } else {
      console.log(fixes.join("; "));
    }
  }

  console.log();

  // ── PHASE 3: VERIFY ──────────────────────────────────────────
  console.log("PHASE 3 — Verified state after fixes\n");
  console.log("Phone            | Name                | Status     | blocked_until        | fails | role");
  console.log("-".repeat(100));

  let allOk = true;

  for (const spec of DUMMY_ACCOUNTS) {
    const profile = await fetchProfile(spec.phone);
    const role = profile ? await fetchRole(profile.id) : null;

    const state = {
      phone: spec.phone,
      name: spec.name,
      account_status: profile?.account_status ?? "MISSING",
      blocked_until: profile?.blocked_until ?? null,
      failed_login_count_window: profile?.failed_login_count_window ?? null,
      role_in_db: role,
    };
    after.push(state);

    const ok =
      !!profile &&
      state.account_status === "active" &&
      state.blocked_until === null &&
      role === spec.role;

    if (!ok) allOk = false;

    const indicator = ok ? "OK" : "FAIL";
    console.log(
      `${spec.phone.padEnd(16)} | ${spec.name.padEnd(20)} | ${state.account_status.padEnd(10)} | ${fmt(state.blocked_until).padEnd(20)} | ${fmt(state.failed_login_count_window).padStart(5)} | ${(role ?? "MISSING").padEnd(10)} [${indicator}]`,
    );
  }

  console.log();

  if (errors.length > 0) {
    console.log("ERRORS (require manual action):");
    for (const e of errors) {
      console.log(`  - ${e}`);
    }
    console.log();
    console.log("To create missing profiles, run:");
    console.log("  npm run staging:provision-dummy-users -- --demo-tag dummy_20260306_1200");
    console.log();
  }

  if (allOk && errors.length === 0) {
    console.log("All 5 dummy accounts are clean and ready to log in.");
    console.log("\nCredentials: phone 9900000101–9900000105, password Dummy@12345");
  } else if (!allOk) {
    console.log("Some accounts still need attention — see ERRORS above.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`repair-auth failed: ${err.message}`);
  process.exit(1);
});
