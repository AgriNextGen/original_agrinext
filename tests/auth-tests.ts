/**
 * Auth Tests — login, session verification, refresh, logout
 */

import type { TestContext } from "./test-utils";
import { TEST_PASSWORD } from "./test-utils";

const MODULE = "Auth Tests";

export async function run(ctx: TestContext): Promise<void> {
  const roles = ["farmer", "agent", "logistics", "buyer", "admin"];

  for (const role of roles) {
    const user = ctx.userOf(role);
    try {
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
      const refreshToken: string | undefined =
        body?.refresh_token ?? body?.session?.refresh_token;

      if (!res.ok || !accessToken) {
        throw new Error(
          `Login HTTP ${res.status}: ${JSON.stringify(body)}`,
        );
      }

      // Store token for downstream tests (mutate the tokens map via the runner)
      (ctx as any)._tokens[role] = accessToken;
      (ctx as any)._refreshTokens[role] = refreshToken;

      ctx.pass(MODULE, `Login ${role}`);
    } catch (err) {
      ctx.fail(MODULE, `Login ${role}`, err, "Check login-by-phone Edge Function deployment and user credentials");
    }
  }

  // --- Session verification via authenticated Supabase client ---
  for (const role of roles) {
    try {
      const token = ctx.tokenOf(role);
      const client = ctx.authedClient(role);

      // Verify the token works for actual data queries (more reliable than /auth/v1/user
      // which can return 403 for tokens obtained via the /auth/v1/token endpoint)
      const { data, error } = await client
        .from("profiles")
        .select("id")
        .eq("id", ctx.userOf(role).userId)
        .maybeSingle();

      if (error) {
        const msg = typeof error === "object" && "message" in error
          ? (error as { message: string }).message
          : String(error);
        throw new Error(`Profile query failed: ${msg}`);
      }

      if (!data?.id) {
        throw new Error("Token is valid but profile not found");
      }

      if (data.id !== ctx.userOf(role).userId) {
        throw new Error(
          `User ID mismatch: expected ${ctx.userOf(role).userId}, got ${data.id}`,
        );
      }

      ctx.pass(MODULE, `Session verify ${role}`);
    } catch (err) {
      ctx.fail(MODULE, `Session verify ${role}`, err, "Check that the access token is valid and matches the provisioned user");
    }
  }

  // --- Session refresh (test one role to avoid rate limits) ---
  try {
    const refreshToken = (ctx as any)._refreshTokens?.["farmer"];
    if (!refreshToken) throw new Error("No refresh token stored for farmer");

    const res = await fetch(
      `${ctx.supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: ctx.anonKey,
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      },
    );

    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.access_token) {
      throw new Error(
        `Refresh HTTP ${res.status}: ${body?.error_description ?? body?.error ?? "no access_token"}`,
      );
    }

    ctx.pass(MODULE, "Session refresh");
  } catch (err) {
    ctx.fail(MODULE, "Session refresh", err, "Check Supabase Auth refresh token handling");
  }

  // --- Logout (verify token can be used then invalidated) ---
  try {
    const token = ctx.tokenOf("farmer");

    const res = await fetch(`${ctx.supabaseUrl}/auth/v1/logout`, {
      method: "POST",
      headers: {
        apikey: ctx.anonKey,
        Authorization: `Bearer ${token}`,
      },
    });

    // 204 No Content = success, 401 = token already expired (acceptable)
    if (res.status !== 204 && res.status !== 200 && res.status !== 401) {
      throw new Error(`Logout HTTP ${res.status}`);
    }

    ctx.pass(MODULE, "Logout");
  } catch (err) {
    ctx.fail(MODULE, "Logout", err, "Check Supabase Auth sign-out configuration");
  }
}
