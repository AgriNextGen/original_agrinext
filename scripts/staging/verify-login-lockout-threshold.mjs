import {
  createAdminClient,
  getSupabaseConfig,
  argValue,
  writeJsonFile,
  readJsonFile,
  normalizePhone,
  assertStagingEnvironment,
} from "./common.mjs";

const admin = createAdminClient();
const { url } = getSupabaseConfig();
assertStagingEnvironment();

function intArg(flag, fallback) {
  const raw = argValue(flag);
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid integer for ${flag}: ${raw}`);
  }
  return parsed;
}

function resolvePhone({ phoneArg, usersFile, role }) {
  if (phoneArg) return normalizePhone(phoneArg);
  if (!usersFile) throw new Error("Provide --phone or --users-file");
  const artifact = readJsonFile(usersFile);
  const user = (artifact?.users ?? []).find((item) => item.role === role);
  if (!user?.phone) throw new Error(`Role ${role} not found in users artifact`);
  return normalizePhone(user.phone);
}

async function resetLockoutStateByPhone(phone) {
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, account_status")
    .eq("phone", phone);
  if (error) throw error;
  if (!profiles?.length) throw new Error(`No profile found for ${phone}`);

  for (const profile of profiles) {
    const nextStatus = profile.account_status === "restricted" ? "active" : profile.account_status;
    const { error: updateError } = await admin
      .from("profiles")
      .update({
        blocked_until: null,
        failed_login_count_window: 0,
        failed_login_window_started_at: null,
        last_failed_login_at: null,
        account_status: nextStatus,
      })
      .eq("id", profile.id);
    if (updateError) throw updateError;
  }

  return profiles.map((p) => p.id);
}

async function loginAttempt(phone, password, role) {
  const response = await fetch(`${url}/functions/v1/login-by-phone`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password, role }),
  });
  const body = await response.json().catch(() => null);
  return {
    status: response.status,
    ok: response.ok,
    retry_after: response.headers.get("Retry-After"),
    body,
  };
}

function passForAttempt(index, threshold, result, cooldownMinutes) {
  if (index <= threshold) {
    return result.status === 401;
  }

  const maxCooldownSeconds = cooldownMinutes * 60;
  const bodyRetry = Number(result?.body?.retry_after_seconds ?? NaN);
  const headerRetry = Number(result?.retry_after ?? NaN);
  const retryValue = Number.isFinite(bodyRetry) ? bodyRetry : headerRetry;
  const hasRetry = Number.isFinite(retryValue) && retryValue > 0 && retryValue <= maxCooldownSeconds;

  return result.status === 429 && hasRetry;
}

async function main() {
  const role = argValue("--role") ?? "farmer";
  const usersFile = argValue("--users-file");
  const phone = resolvePhone({
    phoneArg: argValue("--phone"),
    usersFile,
    role,
  });
  const validPassword = argValue("--valid-password") ?? "KarnatakaDemo@2026";
  const wrongPassword = argValue("--wrong-password") ?? "WrongPass!2026";
  const threshold = intArg("--threshold", 10);
  const cooldownMinutes = intArg("--cooldown-minutes", 5);
  const attempts = intArg("--attempts", threshold + 1);
  const outputPath = argValue("--output") ?? `artifacts/staging/verify-login-lockout-${Date.now()}.json`;

  if (attempts < threshold + 1) {
    throw new Error(`--attempts must be at least threshold+1 (${threshold + 1})`);
  }

  const profileIds = await resetLockoutStateByPhone(phone);

  const attemptResults = [];
  let allExpected = true;
  for (let i = 1; i <= attempts; i += 1) {
    const result = await loginAttempt(phone, wrongPassword, role);
    const expectedPass = passForAttempt(i, threshold, result, cooldownMinutes);
    if (!expectedPass) allExpected = false;
    attemptResults.push({
      attempt: i,
      status: result.status,
      ok: result.ok,
      retry_after: result.retry_after,
      body: result.body,
      expectation_met: expectedPass,
    });
    if (i >= threshold + 1 && result.status === 429) break;
  }

  const lastAttempt = attemptResults[attemptResults.length - 1] ?? null;

  await resetLockoutStateByPhone(phone);
  const validLogin = await loginAttempt(phone, validPassword, role);
  const validLoginOk = validLogin.status === 200 && Boolean(validLogin.body?.access_token);

  const artifact = {
    kind: "verify_login_lockout_threshold",
    executed_at: new Date().toISOString(),
    project_url: url,
    role,
    phone,
    profile_ids: profileIds,
    policy: {
      threshold,
      cooldown_minutes: cooldownMinutes,
      expected_behavior: "attempts_1_to_threshold_return_401_then_next_attempt_returns_429_with_retry",
    },
    summary: {
      wrong_password_sequence_ok: allExpected,
      valid_login_after_reset_ok: validLoginOk,
      overall_ok: allExpected && validLoginOk,
      attempts_executed: attemptResults.length,
      stopped_on_429: lastAttempt?.status === 429,
    },
    attempts: attemptResults,
    valid_login_after_reset: {
      status: validLogin.status,
      ok: validLogin.ok,
      has_access_token: Boolean(validLogin.body?.access_token),
    },
  };

  writeJsonFile(outputPath, artifact);
  console.log(`Verification artifact written: ${outputPath}`);
  console.log(`overall_ok=${artifact.summary.overall_ok}`);
  console.log(`attempts_executed=${artifact.summary.attempts_executed}`);
  console.log(`stopped_on_429=${artifact.summary.stopped_on_429}`);

  if (!artifact.summary.overall_ok) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`verify-login-lockout-threshold failed: ${err.message}`);
  process.exit(1);
});
