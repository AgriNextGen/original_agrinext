/**
 * Agent Auth Tests — login, session verification, route access, cross-role denial
 */

import type { TestContext } from "../test-utils";
import { TEST_PASSWORD } from "../test-utils";

const MODULE = "Agent Auth";

function throwPg(error: unknown): never {
  if (error && typeof error === "object" && "message" in error) {
    throw new Error((error as { message: string }).message);
  }
  throw error;
}

export async function run(ctx: TestContext): Promise<void> {
  const agent = ctx.userOf("agent");

  // --- Agent login via login-by-phone ---
  try {
    const res = await fetch(`${ctx.supabaseUrl}/functions/v1/login-by-phone`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: agent.phone,
        password: TEST_PASSWORD,
        role: "agent",
      }),
    });

    const body = await res.json().catch(() => null);
    const accessToken: string | undefined =
      body?.access_token ?? body?.session?.access_token;

    if (!res.ok || !accessToken) {
      throw new Error(`Login HTTP ${res.status}: ${JSON.stringify(body)}`);
    }

    (ctx as any)._tokens["agent"] = accessToken;
    ctx.pass(MODULE, "Agent login");
  } catch (err) {
    ctx.fail(MODULE, "Agent login", err, "Check login-by-phone Edge Function and agent user credentials");
  }

  // --- Session verification via /auth/v1/user ---
  try {
    const token = ctx.tokenOf("agent");
    const res = await fetch(`${ctx.supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: ctx.anonKey,
        Authorization: `Bearer ${token}`,
      },
    });

    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.id) {
      throw new Error(`HTTP ${res.status}, no user ID returned`);
    }

    if (body.id !== agent.userId) {
      throw new Error(`User ID mismatch: expected ${agent.userId}, got ${body.id}`);
    }

    ctx.pass(MODULE, "Session verify");
  } catch (err) {
    ctx.fail(MODULE, "Session verify", err, "Check that agent access token is valid and matches the provisioned user");
  }

  // --- Agent can access agent-scoped data (agent_farmer_assignments) ---
  try {
    const client = ctx.authedClient("agent");
    const { error } = await client
      .from("agent_farmer_assignments")
      .select("agent_id")
      .eq("agent_id", agent.userId)
      .limit(1);

    if (error) throwPg(error);
    ctx.pass(MODULE, "Agent route access");
  } catch (err) {
    ctx.fail(MODULE, "Agent route access", err, "Check RLS SELECT policy on agent_farmer_assignments for agent role");
  }

  // --- Agent CANNOT access admin-only data ---
  try {
    const client = ctx.authedClient("agent");
    const { data, error } = await client
      .from("admin_users")
      .select("user_id")
      .limit(1);

    if (error) throwPg(error);

    if (data && data.length > 0) {
      throw new Error(`Agent can see admin_users (${data.length} rows). RLS not enforcing admin isolation.`);
    }

    ctx.pass(MODULE, "Cannot access admin data");
  } catch (err) {
    ctx.fail(MODULE, "Cannot access admin data", err, "Check RLS SELECT policy on admin_users — agent should see 0 rows");
  }

  // --- Agent CANNOT access logistics-only data ---
  try {
    const client = ctx.authedClient("agent");
    const { data, error } = await client
      .from("transporters")
      .select("user_id")
      .limit(1);

    if (error) throwPg(error);

    if (data && data.length > 0) {
      throw new Error(`Agent can see transporters (${data.length} rows). RLS not enforcing logistics isolation.`);
    }

    ctx.pass(MODULE, "Cannot access logistics data");
  } catch (err) {
    ctx.fail(MODULE, "Cannot access logistics data", err, "Check RLS SELECT policy on transporters — agent should see 0 rows");
  }

  // --- Login all other roles for downstream tests ---
  const otherRoles = ["farmer", "logistics", "buyer", "admin"];
  for (const role of otherRoles) {
    try {
      const user = ctx.userOf(role);
      const res = await fetch(`${ctx.supabaseUrl}/functions/v1/login-by-phone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: user.phone,
          password: TEST_PASSWORD,
          role,
        }),
      });

      const body = await res.json().catch(() => null);
      const accessToken: string | undefined =
        body?.access_token ?? body?.session?.access_token;

      if (!res.ok || !accessToken) {
        throw new Error(`Login HTTP ${res.status}: ${JSON.stringify(body)}`);
      }

      (ctx as any)._tokens[role] = accessToken;
      ctx.pass(MODULE, `Login ${role} (support)`);
    } catch (err) {
      ctx.fail(MODULE, `Login ${role} (support)`, err, `Check login-by-phone for ${role}`);
    }
  }
}
