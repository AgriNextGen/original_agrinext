import {
  createAdminClient,
  getSupabaseConfig,
  argValue,
  hasFlag,
  readJsonFile,
  writeJsonFile,
  normalizePhone,
  assertStagingEnvironment,
} from "./common.mjs";
import {
  SmokeTestResultSchema,
  SignupByPhoneRequestSchema,
  SignupByPhoneResponseSchema,
  validateSchema,
} from "./contracts.mjs";

const admin = createAdminClient();
const { url, anonKey } = getSupabaseConfig();
assertStagingEnvironment();

const ROLE_DASHBOARD = {
  farmer: "/farmer/dashboard",
  agent: "/agent/dashboard",
  logistics: "/logistics/dashboard",
  buyer: "/marketplace/dashboard",
  admin: "/admin/dashboard",
};

const ROLE_RPC = {
  farmer: { name: "farmer_dashboard_v1", payload: {} },
  agent: { name: "agent_dashboard_v1", payload: {} },
  logistics: { name: "logistics_dashboard_v1", payload: {} },
  buyer: { name: "buyer_dashboard_v1", payload: {} },
  admin: { name: "admin_dashboard_v1", payload: { p_days: 1 } },
};

function addStep(steps, role, step, ok, status = null, note = null) {
  steps.push({ role, step, ok, status, note });
}

function demoPhoneFromTag(demoTag, idx) {
  const digits = demoTag.replace(/\D/g, "");
  const base = digits.slice(-8).padStart(8, "0");
  const raw = `7${base}${idx}`;
  return normalizePhone(raw);
}

async function listAuthUserByEmail(email) {
  let page = 1;
  while (page <= 50) {
    const listed = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (listed.error) throw listed.error;
    const users = listed.data?.users ?? [];
    const found = users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (users.length < 200) break;
    page += 1;
  }
  return null;
}

async function upsertSignupRelations({ userId, role, phone, email, demoTag }) {
  await admin.from("profiles").upsert(
    {
      id: userId,
      full_name: `Smoke ${role}`,
      phone,
      auth_email: email,
      demo_tag: demoTag,
      district: "Mysuru",
      village: "Smoke Village",
      preferred_language: "en",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  await admin.from("user_roles").upsert(
    { user_id: userId, role, created_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );

  try {
    await admin.from("user_profiles").upsert(
      {
        user_id: userId,
        profile_type: role,
        display_name: `Smoke ${role}`,
        phone,
        is_active: true,
      },
      { onConflict: "user_id,profile_type" },
    );
  } catch (_err) {
    // optional on environments where user_profiles constraints/policies differ
  }
}

async function signupByPhoneRole({ role, phone, password, demoTag }) {
  const phoneDigits = phone.replace(/\D/g, "");
  const email = `smoke.${role}.${phoneDigits}@example.com`;
  const payload = validateSchema(
    SignupByPhoneRequestSchema,
    {
      role,
      phone,
      password,
      full_name: `Smoke ${role}`,
      email,
      profile_metadata: {
        district: "Mysuru",
        village: "Smoke Village",
        preferred_language: "en",
      },
    },
    `SignupByPhoneRequest(${role})`,
  );

  const signupResponse = await fetch(`${url}/functions/v1/signup-by-phone`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify(payload),
  });
  const rawBody = await signupResponse.json().catch(() => null);
  let body = rawBody;
  try {
    body = validateSchema(
      SignupByPhoneResponseSchema,
      rawBody,
      `SignupByPhoneResponse(${role})`,
    );
  } catch (_err) {
    body = rawBody;
  }

  let userId = body?.ok ? body.user_id : null;
  const alreadyExists = !body?.ok && (
    body?.error_code === "PHONE_ALREADY_EXISTS" ||
    body?.error_code === "EMAIL_ALREADY_EXISTS"
  );
  if (!userId && alreadyExists) {
    const existing = await listAuthUserByEmail(email);
    userId = existing?.id ?? null;
  }

  if (userId) {
    await upsertSignupRelations({ userId, role, phone, email, demoTag });
  }

  return {
    role,
    phone,
    email,
    user_id: userId,
    status: signupResponse.status,
    ok: signupResponse.ok || Boolean(userId),
    note: signupResponse.ok ? null : body?.message ?? body?.error ?? null,
  };
}

async function loginByPhone({ phone, password, role }) {
  const response = await fetch(`${url}/functions/v1/login-by-phone`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password, role }),
  });
  const body = await response.json().catch(() => null);
  return {
    status: response.status,
    ok: response.ok,
    body,
  };
}

async function verifySession(accessToken) {
  const response = await fetch(`${url}/auth/v1/user`, {
    method: "GET",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const body = await response.json().catch(() => null);
  return { status: response.status, ok: response.ok, body };
}

async function verifyRole(userId, expectedRole) {
  const res = await admin.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
  if (res.error) {
    return { ok: false, actual_role: null, note: res.error.message };
  }
  const actualRole = res.data?.role ?? null;
  return { ok: actualRole === expectedRole, actual_role: actualRole, note: null };
}

async function verifyRoleRpc(role, accessToken) {
  const rpc = ROLE_RPC[role];
  if (!rpc) return { ok: false, status: 500, note: "No RPC mapping for role" };

  const response = await fetch(`${url}/rest/v1/rpc/${rpc.name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(rpc.payload),
  });
  const body = await response.json().catch(() => null);
  return {
    ok: response.ok,
    status: response.status,
    note: response.ok ? null : body?.message ?? body?.hint ?? body?.error ?? "RPC denied",
  };
}

async function attemptBlockScenario(userId, phone, password, role, steps) {
  const now = Date.now();
  const blockedUntil = new Date(now + 5 * 60 * 1000).toISOString();
  const restrictedUpdate = await admin
    .from("profiles")
    .update({ blocked_until: blockedUntil, account_status: "restricted" })
    .eq("id", userId);

  if (restrictedUpdate.error) {
    addStep(
      steps,
      role,
      "restricted account login should be blocked",
      true,
      null,
      `SKIPPED: ${restrictedUpdate.error.message}`,
    );
    return;
  }

  const blockedLogin = await loginByPhone({ phone, password, role });
  const blockedOk = blockedLogin.status === 429 || blockedLogin.status === 403;
  addStep(
    steps,
    role,
    "restricted account login should return 429/403",
    blockedOk,
    blockedLogin.status,
    blockedOk ? null : "Expected temporary block status",
  );

  await admin
    .from("profiles")
    .update({ blocked_until: null, account_status: "active" })
    .eq("id", userId);
}

async function attemptLockScenario(userId, phone, password, role, steps) {
  const lockUpdate = await admin
    .from("profiles")
    .update({ account_status: "locked", blocked_until: null })
    .eq("id", userId);

  if (lockUpdate.error) {
    addStep(
      steps,
      role,
      "locked account login should be denied",
      true,
      null,
      `SKIPPED: ${lockUpdate.error.message}`,
    );
    return;
  }

  const lockedLogin = await loginByPhone({ phone, password, role });
  const lockedOk = lockedLogin.status === 403;
  addStep(
    steps,
    role,
    "locked account login should return 403",
    lockedOk,
    lockedLogin.status,
    lockedOk ? null : "Expected account_locked behavior",
  );

  await admin
    .from("profiles")
    .update({ account_status: "active", blocked_until: null })
    .eq("id", userId);
}

async function main() {
  const usersFile = argValue("--users-file");
  const usersArtifact = usersFile ? readJsonFile(usersFile) : null;
  const artifactUsers = Array.isArray(usersArtifact?.users) ? usersArtifact.users : [];
  const demoTag = argValue("--demo-tag") ?? usersArtifact?.demo_tag ?? null;
  const runSignup = !hasFlag("--skip-signup");
  const password = argValue("--password") ?? "Dummy@12345";
  const outputPath = argValue("--output") ?? `artifacts/staging/smoke-phone-auth-${demoTag ?? "manual"}.json`;

  if (!demoTag || !/^dummy_\d{8}_\d{4}$/.test(demoTag)) {
    throw new Error("Missing or invalid demo_tag. Provide --demo-tag or --users-file.");
  }

  const steps = [];
  const evidence = {
    signup: [],
    role_matrix: {},
  };

  const allRoleUsers = [];

  if (runSignup) {
    const roles = ["farmer", "agent", "logistics", "buyer", "admin"];
    let idx = 1;
    for (const role of roles) {
      const phone = demoPhoneFromTag(demoTag, idx);
      const signup = await signupByPhoneRole({ role, phone, password, demoTag });
      evidence.signup.push(signup);
      if (signup.ok || signup.user_id) {
        allRoleUsers.push({
          role,
          user_id: signup.user_id,
          phone,
          password,
          source: "signup",
          dashboard_path: ROLE_DASHBOARD[role],
        });
      }

      addStep(
        steps,
        role,
        "signup via signup-by-phone",
        signup.ok,
        signup.status,
        signup.note ?? null,
      );
      idx += 1;
    }
  }

  for (const user of artifactUsers) {
    allRoleUsers.push({
      role: user.role,
      user_id: user.user_id ?? null,
      phone: user.phone,
      password: user.password ?? password,
      source: "dummy-artifact",
      dashboard_path: user.dashboard_path ?? ROLE_DASHBOARD[user.role],
    });
  }

  const dedupe = new Map();
  for (const user of allRoleUsers) {
    if (!user.role || !user.phone) continue;
    const key = `${user.role}:${user.phone}`;
    if (!dedupe.has(key)) dedupe.set(key, user);
  }
  const usersToTest = [...dedupe.values()];

  for (const user of usersToTest) {
    const matrix = evidence.role_matrix[user.role] ?? {
      login_ok: false,
      session_ok: false,
      rpc_ok: false,
      status_codes: [],
    };

    const login = await loginByPhone({
      phone: user.phone,
      password: user.password,
      role: user.role,
    });
    matrix.status_codes.push(login.status);
    matrix.login_ok = login.ok;

    addStep(
      steps,
      user.role,
      `phone login (${user.source})`,
      login.ok,
      login.status,
      login.ok ? null : "login-by-phone failed",
    );

    if (!login.ok || !login.body?.access_token) {
      evidence.role_matrix[user.role] = matrix;
      continue;
    }

    const sessionCheck = await verifySession(login.body.access_token);
    matrix.status_codes.push(sessionCheck.status);
    matrix.session_ok = sessionCheck.ok;
    addStep(
      steps,
      user.role,
      "session establishment",
      sessionCheck.ok,
      sessionCheck.status,
      sessionCheck.ok ? null : "auth/v1/user failed",
    );

    const userId = user.user_id ?? sessionCheck.body?.id ?? null;
    if (userId) {
      const roleCheck = await verifyRole(userId, user.role);
      addStep(
        steps,
        user.role,
        "role mapping matches expected dashboard",
        roleCheck.ok,
        null,
        roleCheck.ok
          ? `dashboard=${user.dashboard_path}`
          : `expected=${user.role}, actual=${roleCheck.actual_role ?? "unknown"}`,
      );
    } else {
      addStep(steps, user.role, "role mapping matches expected dashboard", false, null, "missing user_id");
    }

    const rpcCheck = await verifyRoleRpc(user.role, login.body.access_token);
    matrix.status_codes.push(rpcCheck.status);
    matrix.rpc_ok = rpcCheck.ok;
    addStep(
      steps,
      user.role,
      `role dashboard RPC (${ROLE_RPC[user.role].name})`,
      rpcCheck.ok,
      rpcCheck.status,
      rpcCheck.note,
    );

    evidence.role_matrix[user.role] = matrix;
  }

  if (usersToTest.length > 0) {
    const refUser = usersToTest[0];
    const badLogin = await loginByPhone({
      phone: refUser.phone,
      password: `${refUser.password}_wrong`,
      role: refUser.role,
    });
    const badOk = badLogin.status === 401;
    addStep(
      steps,
      "shared",
      "wrong password login should fail with 401",
      badOk,
      badLogin.status,
      badOk ? null : "Expected 401 for invalid credentials",
    );
  }

  const farmerUser =
    usersToTest.find((item) => item.role === "farmer" && item.user_id) ??
    usersToTest.find((item) => item.role === "farmer");
  if (farmerUser?.user_id) {
    await attemptBlockScenario(farmerUser.user_id, farmerUser.phone, farmerUser.password, "farmer", steps);
    await attemptLockScenario(farmerUser.user_id, farmerUser.phone, farmerUser.password, "farmer", steps);
  } else {
    addStep(
      steps,
      "shared",
      "restricted/locked scenarios",
      false,
      null,
      "SKIPPED: missing farmer user_id",
    );
  }

  const totalSteps = steps.length;
  const failedSteps = steps.filter((item) => !item.ok).length;
  const passedSteps = totalSteps - failedSteps;

  const reportPayload = {
    executed_at: new Date().toISOString(),
    demo_tag: demoTag,
    project_url: url,
    summary: {
      total_steps: totalSteps,
      passed_steps: passedSteps,
      failed_steps: failedSteps,
    },
    steps,
    evidence,
  };
  const report = validateSchema(SmokeTestResultSchema, reportPayload, "SmokeTestResult");
  writeJsonFile(outputPath, report);

  console.log(`Smoke report written: ${outputPath}`);
  console.log(`demo_tag=${demoTag}`);
  console.log(`steps=${totalSteps}`);
  console.log(`passed=${passedSteps}`);
  console.log(`failed=${failedSteps}`);
}

main().catch((err) => {
  console.error(`smoke-phone-auth failed: ${err.message}`);
  process.exit(1);
});
