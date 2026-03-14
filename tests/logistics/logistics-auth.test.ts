/**
 * Logistics Auth Tests — login, session verification, route access, cross-role denial
 */

import type { TestContext } from "../test-utils";
import { TEST_PASSWORD } from "../test-utils";

const MODULE = "Logistics Auth";

function throwPg(error: unknown): never {
  if (error && typeof error === "object" && "message" in error) {
    throw new Error((error as { message: string }).message);
  }
  throw error;
}

export async function run(ctx: TestContext): Promise<void> {
  const logistics = ctx.userOf("logistics");

  // --- Logistics login via login-by-phone ---
  try {
    const res = await fetch(`${ctx.supabaseUrl}/functions/v1/login-by-phone`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: logistics.phone,
        password: TEST_PASSWORD,
        role: "logistics",
      }),
    });

    const body = await res.json().catch(() => null);
    const accessToken: string | undefined =
      body?.access_token ?? body?.session?.access_token;

    if (!res.ok || !accessToken) {
      throw new Error(`Login HTTP ${res.status}: ${JSON.stringify(body)}`);
    }

    (ctx as any)._tokens["logistics"] = accessToken;
    ctx.pass(MODULE, "Logistics login");
  } catch (err) {
    ctx.fail(MODULE, "Logistics login", err, "Check login-by-phone Edge Function and logistics user credentials");
  }

  // --- Session verification via /auth/v1/user ---
  try {
    const token = ctx.tokenOf("logistics");
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

    if (body.id !== logistics.userId) {
      throw new Error(`User ID mismatch: expected ${logistics.userId}, got ${body.id}`);
    }

    ctx.pass(MODULE, "Session verify");
  } catch (err) {
    ctx.fail(MODULE, "Session verify", err, "Check that logistics access token is valid and matches provisioned user");
  }

  // --- Logistics can access transport-scoped data (transport_requests) ---
  try {
    const client = ctx.authedClient("logistics");
    const { error } = await client
      .from("transport_requests")
      .select("id, status")
      .eq("status", "requested")
      .limit(1);

    if (error) throwPg(error);
    ctx.pass(MODULE, "Logistics route access");
  } catch (err) {
    ctx.fail(MODULE, "Logistics route access", err, "Check RLS SELECT policy on transport_requests for logistics role");
  }

  // --- Logistics CANNOT access admin-only data ---
  try {
    const client = ctx.authedClient("logistics");
    const { data, error } = await client
      .from("admin_users")
      .select("user_id")
      .limit(1);

    if (error) throwPg(error);

    if (data && data.length > 0) {
      throw new Error(`Logistics can see admin_users (${data.length} rows). RLS not enforcing admin isolation.`);
    }

    ctx.pass(MODULE, "Cannot access admin data");
  } catch (err) {
    ctx.fail(MODULE, "Cannot access admin data", err, "Check RLS SELECT policy on admin_users — logistics should see 0 rows");
  }

  // --- Logistics CANNOT access agent-scoped data ---
  try {
    const client = ctx.authedClient("logistics");
    const { data, error } = await client
      .from("agent_farmer_assignments")
      .select("agent_id")
      .limit(1);

    if (error) throwPg(error);

    if (data && data.length > 0) {
      throw new Error(`Logistics can see agent_farmer_assignments (${data.length} rows). RLS not enforcing agent isolation.`);
    }

    ctx.pass(MODULE, "Cannot access agent data");
  } catch (err) {
    ctx.fail(MODULE, "Cannot access agent data", err, "Check RLS SELECT policy on agent_farmer_assignments — logistics should see 0 rows");
  }

  // --- Login all other roles for downstream tests ---
  const otherRoles = ["farmer", "agent", "buyer", "admin"];
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
