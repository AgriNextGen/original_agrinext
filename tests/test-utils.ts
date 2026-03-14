/**
 * AgriNext Gen — System Check shared utilities
 *
 * Provides TestContext, client factories, user provisioning,
 * result tracking, and cleanup used by every test module.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Env helpers
// ---------------------------------------------------------------------------

export function requireEnv(name: string, fallback?: string): string {
  const value =
    process.env[name] ?? (fallback ? process.env[fallback] : undefined);
  if (!value?.trim()) {
    console.error(
      `Missing required env var: ${name}${fallback ? ` (or ${fallback})` : ""}`,
    );
    process.exit(1);
  }
  return value.trim();
}

export function authEmail(phone: string): string {
  return `${phone.replace(/\D/g, "")}@agrinext.local`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProvisionedUser {
  role: string;
  userId: string;
  phone: string;
  email: string;
}

export interface TestResult {
  module: string;
  name: string;
  passed: boolean;
  error?: string;
  suggestion?: string;
}

export interface SharedState {
  farmlandId?: string;
  cropId?: string;
  listingId?: string;
  orderId?: string;
  transportRequestId?: string;
  tripId?: string;
  assignmentFarmerId?: string;
  notificationId?: string;
}

export interface TestContext {
  supabaseUrl: string;
  anonKey: string;
  adminClient: SupabaseClient;
  authedClient: (role: string) => SupabaseClient;
  userOf: (role: string) => ProvisionedUser;
  tokenOf: (role: string) => string;
  pass: (module: string, name: string) => void;
  fail: (module: string, name: string, error: unknown, suggestion?: string) => void;
  shared: SharedState;
  results: TestResult[];
  demoTag: string;
}

// ---------------------------------------------------------------------------
// Client factories
// ---------------------------------------------------------------------------

export function createAdminClient(url: string, serviceRoleKey: string): SupabaseClient {
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function createAnonClient(url: string, anonKey: string): SupabaseClient {
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function createAuthedClient(
  url: string,
  anonKey: string,
  accessToken: string,
): SupabaseClient {
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

// ---------------------------------------------------------------------------
// Phone map (same as smoke-test)
// ---------------------------------------------------------------------------

export const PHONE_MAP: Record<string, string> = {
  farmer: "+919888880101",
  agent: "+919888880102",
  logistics: "+919888880103",
  buyer: "+919888880104",
  admin: "+919888880105",
};

export const TEST_PASSWORD = "SmokeTest@99";

// ---------------------------------------------------------------------------
// Result tracking
// ---------------------------------------------------------------------------

export function createResultTracker() {
  const results: TestResult[] = [];

  function pass(module: string, name: string) {
    results.push({ module, name, passed: true });
  }

  function fail(module: string, name: string, error: unknown, suggestion?: string) {
    const msg = error instanceof Error ? error.message : String(error);
    results.push({ module, name, passed: false, error: msg, suggestion });
  }

  return { results, pass, fail };
}

// ---------------------------------------------------------------------------
// User provisioning
// ---------------------------------------------------------------------------

export async function provisionUsers(
  adminClient: SupabaseClient,
  demoTag: string,
): Promise<ProvisionedUser[]> {
  const provisionedUsers: ProvisionedUser[] = [];

  console.log(`\n  Provisioning test users (demo_tag=${demoTag})...\n`);

  for (const [role, phone] of Object.entries(PHONE_MAP)) {
    const email = authEmail(phone);
    let userId: string | null = null;

    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (existingProfile?.id) {
      userId = existingProfile.id;
      await adminClient.auth.admin.updateUserById(userId, {
        email,
        password: TEST_PASSWORD,
        phone,
        email_confirm: true,
        user_metadata: { role, phone, demo_tag: demoTag },
      });
    } else {
      const { data: created, error: createErr } =
        await adminClient.auth.admin.createUser({
          email,
          password: TEST_PASSWORD,
          phone,
          email_confirm: true,
          user_metadata: { role, phone, demo_tag: demoTag },
        });

      if (createErr) {
        let page = 1;
        while (page <= 10 && !userId) {
          const listed = await adminClient.auth.admin.listUsers({
            page,
            perPage: 100,
          });
          const found = listed.data?.users?.find(
            (u) => u.email?.toLowerCase() === email.toLowerCase(),
          );
          if (found) {
            userId = found.id;
            await adminClient.auth.admin.updateUserById(userId, {
              password: TEST_PASSWORD,
              phone,
              email_confirm: true,
              user_metadata: { role, phone, demo_tag: demoTag },
            });
          }
          if ((listed.data?.users?.length ?? 0) < 100) break;
          page++;
        }
        if (!userId) throw new Error(`Cannot provision ${role}: ${createErr.message}`);
      } else {
        userId = created.user.id;
      }
    }

    const { error: profErr } = await adminClient.from("profiles").upsert(
      {
        id: userId,
        full_name: `SystemCheck ${role}`,
        phone,
        auth_email: email,
        account_status: "active",
        blocked_until: null,
        failed_login_count_window: 0,
        is_locked: false,
        district: "Mysuru",
        village: "SystemCheck Village",
        preferred_language: "en",
        demo_tag: demoTag,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    if (profErr) {
      console.log(`    warn: profile upsert ${role}: ${profErr.message}`);
    }

    const { error: roleErr } = await adminClient.from("user_roles").upsert(
      { user_id: userId, role, created_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
    if (roleErr) {
      console.log(`    warn: user_roles upsert ${role}: ${roleErr.message}`);
    }

    if (role === "buyer") {
      await adminClient.from("buyers").upsert(
        {
          id: userId,
          user_id: userId,
          name: "SystemCheck buyer",
          phone,
          district: "Mysuru",
          preferred_crops: ["onion"],
          demo_tag: demoTag,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    }

    if (role === "logistics") {
      await adminClient.from("transporters").upsert(
        {
          user_id: userId,
          name: "SystemCheck logistics",
          phone,
          operating_district: "Mysuru",
          vehicle_type: "mini_truck",
          vehicle_capacity: 1000,
          registration_number: `KA-SYSCHK-${Date.now().toString().slice(-4)}`,
          demo_tag: demoTag,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    }

    if (role === "admin") {
      await adminClient.from("admin_users").upsert(
        {
          user_id: userId,
          name: "SystemCheck admin",
          role: "super_admin",
          phone,
          assigned_district: "Mysuru",
          demo_tag: demoTag,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    }

    provisionedUsers.push({ role, userId, phone, email });
    console.log(`    ${role.padEnd(10)} ${userId}`);
  }

  return provisionedUsers;
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

export async function cleanup(
  adminClient: SupabaseClient,
  provisionedUsers: ProvisionedUser[],
  demoTag: string,
): Promise<void> {
  console.log(`\n  Cleaning up test data (demo_tag=${demoTag})...`);

  await adminClient
    .from("notifications")
    .delete()
    .like("title", `syschk_${demoTag}%`)
    .then(({ error }) => {
      if (error) console.log(`    warn: cleanup notifications: ${error.message}`);
    });

  const tablesWithDemoTag = [
    "market_orders",
    "trips",
    "transport_requests",
    "agent_farmer_assignments",
    "listings",
    "crops",
    "farmlands",
  ];

  for (const table of tablesWithDemoTag) {
    const { error } = await adminClient
      .from(table)
      .delete()
      .eq("demo_tag", demoTag);
    if (error) {
      console.log(`    warn: cleanup ${table}: ${error.message}`);
    }
  }

  const userIds = provisionedUsers.map((u) => u.userId);

  await adminClient
    .from("buyers")
    .delete()
    .eq("demo_tag", demoTag)
    .then(({ error }) => {
      if (error) console.log(`    warn: cleanup buyers: ${error.message}`);
    });

  await adminClient
    .from("transporters")
    .delete()
    .eq("demo_tag", demoTag)
    .then(({ error }) => {
      if (error) console.log(`    warn: cleanup transporters: ${error.message}`);
    });

  await adminClient
    .from("admin_users")
    .delete()
    .eq("demo_tag", demoTag)
    .then(({ error }) => {
      if (error) console.log(`    warn: cleanup admin_users: ${error.message}`);
    });

  if (userIds.length) {
    await adminClient
      .from("user_roles")
      .delete()
      .in("user_id", userIds)
      .then(({ error }) => {
        if (error) console.log(`    warn: cleanup user_roles: ${error.message}`);
      });

    await adminClient
      .from("profiles")
      .delete()
      .eq("demo_tag", demoTag)
      .then(({ error }) => {
        if (error) console.log(`    warn: cleanup profiles: ${error.message}`);
      });
  }

  for (const user of provisionedUsers) {
    const { error } = await adminClient.auth.admin.deleteUser(user.userId);
    if (error) {
      console.log(`    warn: delete auth user ${user.role}: ${error.message}`);
    }
  }

  await adminClient.storage
    .from("profile-photos")
    .remove([`system-check/${demoTag}/test.txt`])
    .catch(() => {});

  console.log("  Cleanup complete.\n");
}

// ---------------------------------------------------------------------------
// Report printer
// ---------------------------------------------------------------------------

export function printReport(results: TestResult[]): boolean {
  const modules = [...new Set(results.map((r) => r.module))];

  console.log("\n--------------------------------------");
  console.log("  AGRI NEXT GEN SYSTEM VALIDATION");
  console.log("--------------------------------------\n");

  let totalPassed = 0;
  let totalCount = 0;

  for (const mod of modules) {
    const modResults = results.filter((r) => r.module === mod);
    const passed = modResults.filter((r) => r.passed).length;
    const total = modResults.length;
    totalPassed += passed;
    totalCount += total;

    const status = passed === total ? "PASSED" : "FAILED";
    console.log(`  ${mod.padEnd(24)} ${status}  (${passed}/${total})`);
  }

  const allPassed = totalPassed === totalCount;

  console.log("\n--------------------------------------");
  console.log(
    `  FINAL RESULT: ${allPassed ? "SYSTEM HEALTHY" : "SOME CHECKS FAILED"}  (${totalPassed}/${totalCount} checks passed)`,
  );
  console.log("--------------------------------------\n");

  const failed = results.filter((r) => !r.passed);
  if (failed.length) {
    console.log("  FAILURES:\n");
    for (const f of failed) {
      console.log(`  [${f.module}] ${f.name}: ${f.error}`);
      if (f.suggestion) {
        console.log(`    Suggestion: ${f.suggestion}`);
      }
    }
    console.log("");
  }

  return allPassed;
}
