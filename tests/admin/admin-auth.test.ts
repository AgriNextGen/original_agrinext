/**
 * Admin Auth Tests — login, session verification, route access, cross-role denial
 */

import type { TestContext } from "../test-utils";
import { TEST_PASSWORD } from "../test-utils";

const MODULE = "Admin Auth";

function throwPg(error: unknown): never {
  if (error && typeof error === "object" && "message" in error) {
    throw new Error((error as { message: string }).message);
  }
  throw error;
}

export async function run(ctx: TestContext): Promise<void> {
  const admin = ctx.userOf("admin");

  // --- Admin login via login-by-phone ---
  try {
    const res = await fetch(`${ctx.supabaseUrl}/functions/v1/login-by-phone`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: admin.phone,
        password: TEST_PASSWORD,
        role: "admin",
      }),
    });

    const body = await res.json().catch(() => null);
    const accessToken: string | undefined =
      body?.access_token ?? body?.session?.access_token;

    if (!res.ok || !accessToken) {
      throw new Error(`Login HTTP ${res.status}: ${JSON.stringify(body)}`);
    }

    (ctx as any)._tokens["admin"] = accessToken;
    ctx.pass(MODULE, "Admin login");
  } catch (err) {
    ctx.fail(MODULE, "Admin login", err, "Check login-by-phone Edge Function and admin user credentials");
  }

  // --- Login all other roles for downstream cross-role tests ---
  const otherRoles = ["farmer", "agent", "logistics", "buyer"];
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

  // --- Session verification via /auth/v1/user ---
  try {
    const token = ctx.tokenOf("admin");
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

    if (body.id !== admin.userId) {
      throw new Error(`User ID mismatch: expected ${admin.userId}, got ${body.id}`);
    }

    ctx.pass(MODULE, "Session verify");
  } catch (err) {
    ctx.fail(MODULE, "Session verify", err, "Check that admin access token is valid and matches the provisioned user");
  }

  // --- Admin CAN access admin_users table ---
  try {
    const client = ctx.authedClient("admin");
    const { data, error } = await client
      .from("admin_users")
      .select("user_id, name, role")
      .eq("user_id", admin.userId)
      .limit(1);

    if (error) throwPg(error);
    if (!data?.length) throw new Error("Admin cannot see own admin_users row");

    ctx.pass(MODULE, "Admin route access");
  } catch (err) {
    ctx.fail(MODULE, "Admin route access", err, "Check RLS SELECT policy on admin_users for admin role");
  }

  // --- Non-admin roles CANNOT access admin_users ---
  for (const role of otherRoles) {
    try {
      const client = ctx.authedClient(role);
      const { data, error } = await client
        .from("admin_users")
        .select("user_id")
        .limit(1);

      if (error) throwPg(error);

      if (data && data.length > 0) {
        throw new Error(`${role} can see admin_users (${data.length} rows). RLS not enforcing admin isolation.`);
      }

      ctx.pass(MODULE, `${role} denied admin_users`);
    } catch (err) {
      ctx.fail(MODULE, `${role} denied admin_users`, err, `Check RLS SELECT policy on admin_users — ${role} should see 0 rows`);
    }
  }
}
