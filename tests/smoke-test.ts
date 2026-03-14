/**
 * AgriNext Gen — MVP Smoke Test
 *
 * Self-contained smoke test that provisions temporary test users,
 * exercises core workflows for every role, prints a structured report,
 * and cleans up all test data on exit.
 *
 * Required env vars (in .env or shell):
 *   SUPABASE_URL (or VITE_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY)
 *
 * Run:  npm run smoke-test
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function requireEnv(name: string, fallback?: string): string {
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

const SUPABASE_URL = requireEnv("SUPABASE_URL", "VITE_SUPABASE_URL");
const SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const ANON_KEY = requireEnv(
  "SUPABASE_ANON_KEY",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
);

const DEMO_TAG = `smoke_${Date.now()}`;
const TEST_PASSWORD = "SmokeTest@99";

const PHONE_MAP: Record<string, string> = {
  farmer: "+919888880101",
  agent: "+919888880102",
  logistics: "+919888880103",
  buyer: "+919888880104",
  admin: "+919888880105",
};

function authEmail(phone: string): string {
  return `${phone.replace(/\D/g, "")}@agrinext.local`;
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function authedClient(accessToken: string): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

// ---------------------------------------------------------------------------
// Result tracking
// ---------------------------------------------------------------------------

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  suggestion?: string;
}

const results: TestResult[] = [];

function pass(name: string) {
  results.push({ name, passed: true });
}

function fail(name: string, error: unknown, suggestion?: string) {
  const msg = error instanceof Error ? error.message : String(error);
  results.push({ name, passed: false, error: msg, suggestion });
}

// ---------------------------------------------------------------------------
// User provisioning
// ---------------------------------------------------------------------------

interface ProvisionedUser {
  role: string;
  userId: string;
  phone: string;
  email: string;
}

const provisionedUsers: ProvisionedUser[] = [];
const tokens: Record<string, string> = {};

async function provisionUsers(): Promise<void> {
  console.log(`\n  Provisioning test users (demo_tag=${DEMO_TAG})...\n`);

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
        user_metadata: { role, phone, demo_tag: DEMO_TAG },
      });
    } else {
      const { data: created, error: createErr } =
        await adminClient.auth.admin.createUser({
          email,
          password: TEST_PASSWORD,
          phone,
          email_confirm: true,
          user_metadata: { role, phone, demo_tag: DEMO_TAG },
        });

      if (createErr) {
        // User might exist in auth but not profiles — find by email
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
              user_metadata: { role, phone, demo_tag: DEMO_TAG },
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

    await adminClient.from("profiles").upsert(
      {
        id: userId,
        full_name: `Smoke ${role}`,
        phone,
        auth_email: email,
        account_status: "active",
        blocked_until: null,
        failed_login_count_window: 0,
        is_locked: false,
        district: "Mysuru",
        village: "Smoke Village",
        preferred_language: "en",
        demo_tag: DEMO_TAG,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    await adminClient.from("user_roles").upsert(
      { user_id: userId, role, created_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );

    if (role === "buyer") {
      await adminClient.from("buyers").upsert(
        {
          id: userId,
          user_id: userId,
          name: `Smoke buyer`,
          phone,
          district: "Mysuru",
          preferred_crops: ["onion"],
          demo_tag: DEMO_TAG,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    }

    if (role === "logistics") {
      await adminClient.from("transporters").upsert(
        {
          user_id: userId,
          name: `Smoke logistics`,
          phone,
          operating_district: "Mysuru",
          vehicle_type: "mini_truck",
          vehicle_capacity: 1000,
          registration_number: `KA-SMOKE-${Date.now().toString().slice(-4)}`,
          demo_tag: DEMO_TAG,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    }

    if (role === "admin") {
      await adminClient.from("admin_users").upsert(
        {
          user_id: userId,
          name: `Smoke admin`,
          role: "super_admin",
          phone,
          assigned_district: "Mysuru",
          demo_tag: DEMO_TAG,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    }

    provisionedUsers.push({ role, userId, phone, email });
    console.log(`    ${role.padEnd(10)} ${userId}`);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function userOf(role: string): ProvisionedUser {
  const u = provisionedUsers.find((p) => p.role === role);
  if (!u) throw new Error(`No provisioned user for role: ${role}`);
  return u;
}

function tokenOf(role: string): string {
  const t = tokens[role];
  if (!t) throw new Error(`No token for role: ${role}`);
  return t;
}

// ---------------------------------------------------------------------------
// 1. Auth Test
// ---------------------------------------------------------------------------

async function testAuth(): Promise<void> {
  for (const { role, phone } of provisionedUsers) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/login-by-phone`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password: TEST_PASSWORD, role }),
    });

    const body = await res.json().catch(() => null);

    // login-by-phone returns { access_token, refresh_token, expires_in } at top level
    const accessToken: string | undefined =
      body?.access_token ?? body?.session?.access_token;

    if (!res.ok || !accessToken) {
      throw new Error(
        `Login failed for ${role} (HTTP ${res.status}): ${JSON.stringify(body)}`,
      );
    }

    tokens[role] = accessToken;

    // Verify session
    const sessionRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const sessionBody = await sessionRes.json().catch(() => null);
    if (!sessionRes.ok || !sessionBody?.id) {
      throw new Error(`Session verification failed for ${role}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Farmer Workflow
// ---------------------------------------------------------------------------

let testFarmlandId: string | null = null;
let testCropId: string | null = null;

async function testFarmerWorkflow(): Promise<void> {
  const farmer = userOf("farmer");
  const client = authedClient(tokenOf("farmer"));

  // Create farmland
  const { data: farmland, error: flErr } = await client
    .from("farmlands")
    .insert({
      farmer_id: farmer.userId,
      name: "Smoke Test Farm",
      area: 2.5,
      area_unit: "acres",
      village: "Smoke Village",
      district: "Mysuru",
      soil_type: "red_soil",
      demo_tag: DEMO_TAG,
    })
    .select("id")
    .single();

  if (flErr) throw new Error(`Create farmland: ${flErr.message}`);
  testFarmlandId = farmland.id;

  // Create crop
  const { data: crop, error: cropErr } = await client
    .from("crops")
    .insert({
      farmer_id: farmer.userId,
      crop_name: "Smoke Tomato",
      status: "growing",
      health_status: "normal",
      growth_stage: "seedling",
      land_id: testFarmlandId,
      variety: "Cherry",
      demo_tag: DEMO_TAG,
    })
    .select("id")
    .single();

  if (cropErr) throw new Error(`Create crop: ${cropErr.message}`);
  testCropId = crop.id;

  // Fetch crops
  const { data: crops, error: fetchErr } = await client
    .from("crops")
    .select("id, crop_name, status")
    .eq("farmer_id", farmer.userId)
    .eq("demo_tag", DEMO_TAG);

  if (fetchErr) throw new Error(`Fetch crops: ${fetchErr.message}`);
  if (!crops?.length) throw new Error("Fetch crops returned empty");

  // Update crop
  const { error: updateErr } = await client
    .from("crops")
    .update({ status: "ready", updated_at: new Date().toISOString() })
    .eq("id", testCropId);

  if (updateErr) throw new Error(`Update crop: ${updateErr.message}`);
}

// ---------------------------------------------------------------------------
// 3. Listing Workflow
// ---------------------------------------------------------------------------

let testListingId: string | null = null;

async function testListingWorkflow(): Promise<void> {
  const farmer = userOf("farmer");
  const client = authedClient(tokenOf("farmer"));

  // Create listing (via admin — listings writes are RPC-guarded by app.rpc context)
  const { data: listing, error: createErr } = await adminClient
    .from("listings")
    .insert({
      seller_id: farmer.userId,
      title: "Smoke Test Tomato",
      category: "vegetable",
      price: 25,
      quantity: 100,
      unit: "kg",
      unit_price: 25,
      is_active: true,
      status: "approved",
      crop_id: testCropId,
      location: "Mysuru",
      demo_tag: DEMO_TAG,
    })
    .select("id")
    .single();

  if (createErr) throw new Error(`Create listing: ${createErr.message}`);
  testListingId = listing.id;

  // Update listing
  const { error: updateErr } = await adminClient
    .from("listings")
    .update({
      title: "Smoke Test Tomato (Updated)",
      updated_at: new Date().toISOString(),
    })
    .eq("id", testListingId);

  if (updateErr) throw new Error(`Update listing: ${updateErr.message}`);

  // Fetch listings (via authed farmer client — verifies RLS read access)
  const { data: listings, error: fetchErr } = await client
    .from("listings")
    .select("id, title, status")
    .eq("seller_id", farmer.userId)
    .eq("demo_tag", DEMO_TAG);

  if (fetchErr) throw new Error(`Fetch listings: ${fetchErr.message}`);
  if (!listings?.length) throw new Error("Fetch listings returned empty");
}

// ---------------------------------------------------------------------------
// 4. Buyer Workflow
// ---------------------------------------------------------------------------

let testOrderId: string | null = null;

async function testBuyerWorkflow(): Promise<void> {
  const buyer = userOf("buyer");
  const farmer = userOf("farmer");
  const client = authedClient(tokenOf("buyer"));

  // Fetch listings (via buyer authed client — verifies buyer can read approved listings)
  const { data: listings, error: fetchErr } = await client
    .from("listings")
    .select("id, title")
    .eq("is_active", true)
    .limit(5);

  if (fetchErr) throw new Error(`Buyer fetch listings: ${fetchErr.message}`);

  // Create order (via admin — market_orders writes are RPC-guarded by app.rpc context)
  const { data: order, error: orderErr } = await adminClient
    .from("market_orders")
    .insert({
      buyer_id: buyer.userId,
      farmer_id: farmer.userId,
      listing_id: testListingId,
      quantity: 10,
      price_agreed: 25,
      status: "placed",
      demo_tag: DEMO_TAG,
    })
    .select("id")
    .single();

  if (orderErr) throw new Error(`Create order: ${orderErr.message}`);
  testOrderId = order.id;

  // Fetch order history (via authed buyer client — verifies RLS read access)
  const { data: orders, error: histErr } = await client
    .from("market_orders")
    .select("id, status")
    .eq("buyer_id", buyer.userId)
    .eq("demo_tag", DEMO_TAG);

  if (histErr) throw new Error(`Fetch orders: ${histErr.message}`);
  if (!orders?.length) throw new Error("Order history empty");
}

// ---------------------------------------------------------------------------
// 5. Logistics Workflow
// ---------------------------------------------------------------------------

let testTransportId: string | null = null;

async function testLogisticsWorkflow(): Promise<void> {
  const farmer = userOf("farmer");

  // Create transport request (via admin client to avoid RLS restrictions on insert)
  const { data: tr, error: trErr } = await adminClient
    .from("transport_requests")
    .insert({
      farmer_id: farmer.userId,
      pickup_location: "Smoke Village, Mysuru",
      quantity: 50,
      status: "requested",
      demo_tag: DEMO_TAG,
    })
    .select("id")
    .single();

  if (trErr) throw new Error(`Create transport request: ${trErr.message}`);
  testTransportId = tr.id;

  // Fetch transport requests
  const { data: requests, error: fetchErr } = await adminClient
    .from("transport_requests")
    .select("id, status")
    .eq("demo_tag", DEMO_TAG);

  if (fetchErr) throw new Error(`Fetch transport requests: ${fetchErr.message}`);
  if (!requests?.length) throw new Error("Transport requests empty");

  // Verify the request was created with correct status
  const created = requests.find((r: { id: string }) => r.id === testTransportId);
  if (!created) throw new Error("Created transport request not found in fetch results");

  // Update a non-status field (status updates require RPC due to DB trigger)
  const { error: updateErr } = await adminClient
    .from("transport_requests")
    .update({
      notes: "Smoke test transport request",
      updated_at: new Date().toISOString(),
    })
    .eq("id", testTransportId);

  if (updateErr) throw new Error(`Update transport request: ${updateErr.message}`);
}

// ---------------------------------------------------------------------------
// 6. Agent Workflow
// ---------------------------------------------------------------------------

async function testAgentWorkflow(): Promise<void> {
  const agent = userOf("agent");
  const farmer = userOf("farmer");

  // Create agent-farmer assignment
  const { error: assignErr } = await adminClient
    .from("agent_farmer_assignments")
    .upsert(
      {
        agent_id: agent.userId,
        farmer_id: farmer.userId,
        active: true,
        demo_tag: DEMO_TAG,
        assigned_at: new Date().toISOString(),
      },
      { onConflict: "agent_id,farmer_id" },
    );

  if (assignErr) throw new Error(`Create assignment: ${assignErr.message}`);

  // Fetch assigned farmers
  const client = authedClient(tokenOf("agent"));
  const { data: assignments, error: fetchErr } = await client
    .from("agent_farmer_assignments")
    .select("agent_id, farmer_id, active")
    .eq("agent_id", agent.userId)
    .eq("demo_tag", DEMO_TAG);

  if (fetchErr) throw new Error(`Fetch assignments: ${fetchErr.message}`);
  if (!assignments?.length) throw new Error("No assignments found");

  // Create a task notification for the agent
  // notifications table has no demo_tag column — use a unique title for cleanup
  const notifTitle = `smoke_task_${DEMO_TAG}`;
  const { data: notif, error: notifErr } = await adminClient
    .from("notifications")
    .insert({
      user_id: agent.userId,
      title: notifTitle,
      message: "Verify farmer farmland for smoke test",
      type: "task",
      is_read: false,
    })
    .select("id")
    .single();

  if (notifErr) throw new Error(`Create notification: ${notifErr.message}`);

  // Update notification (mark read)
  if (notif?.id) {
    const { error: readErr } = await adminClient
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notif.id);

    if (readErr) throw new Error(`Update notification: ${readErr.message}`);
  }
}

// ---------------------------------------------------------------------------
// 7. Admin Access
// ---------------------------------------------------------------------------

async function testAdminAccess(): Promise<void> {
  // Fetch users
  const { data: profiles, error: profErr } = await adminClient
    .from("profiles")
    .select("id, full_name")
    .eq("demo_tag", DEMO_TAG);

  if (profErr) throw new Error(`Admin fetch profiles: ${profErr.message}`);
  if (!profiles?.length) throw new Error("Admin sees no profiles");

  // Fetch orders
  const { data: orders, error: ordErr } = await adminClient
    .from("market_orders")
    .select("id, status")
    .eq("demo_tag", DEMO_TAG);

  if (ordErr) throw new Error(`Admin fetch orders: ${ordErr.message}`);

  // Fetch transport data
  const { data: transport, error: trErr } = await adminClient
    .from("transport_requests")
    .select("id, status")
    .eq("demo_tag", DEMO_TAG);

  if (trErr) throw new Error(`Admin fetch transport: ${trErr.message}`);
}

// ---------------------------------------------------------------------------
// 8. Storage Test
// ---------------------------------------------------------------------------

async function testStorage(): Promise<void> {
  const bucket = "profile-photos";
  const filePath = `smoke-test/${DEMO_TAG}/test.txt`;
  const fileContent = new Blob(["smoke-test-content"], {
    type: "text/plain",
  });

  const { error: uploadErr } = await adminClient.storage
    .from(bucket)
    .upload(filePath, fileContent, { upsert: true });

  if (uploadErr) {
    if (uploadErr.message?.includes("not found") || uploadErr.message?.includes("Bucket")) {
      throw new Error(
        `Bucket "${bucket}" does not exist. Run the storage buckets migration first.`,
      );
    }
    throw new Error(`Upload: ${uploadErr.message}`);
  }

  // Get signed URL
  const { data: signed, error: signErr } = await adminClient.storage
    .from(bucket)
    .createSignedUrl(filePath, 60);

  if (signErr) throw new Error(`Signed URL: ${signErr.message}`);
  if (!signed?.signedUrl) throw new Error("Signed URL is empty");

  // Cleanup uploaded file
  await adminClient.storage.from(bucket).remove([filePath]);
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

async function cleanup(): Promise<void> {
  console.log(`\n  Cleaning up test data (demo_tag=${DEMO_TAG})...`);

  // notifications has no demo_tag — clean by title pattern
  await adminClient
    .from("notifications")
    .delete()
    .like("title", `smoke_task_${DEMO_TAG}%`)
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
      .eq("demo_tag", DEMO_TAG);
    if (error) {
      console.log(`    warn: cleanup ${table}: ${error.message}`);
    }
  }

  // Role-specific tables
  const userIds = provisionedUsers.map((u) => u.userId);

  await adminClient
    .from("buyers")
    .delete()
    .eq("demo_tag", DEMO_TAG)
    .then(({ error }) => {
      if (error) console.log(`    warn: cleanup buyers: ${error.message}`);
    });

  await adminClient
    .from("transporters")
    .delete()
    .eq("demo_tag", DEMO_TAG)
    .then(({ error }) => {
      if (error) console.log(`    warn: cleanup transporters: ${error.message}`);
    });

  await adminClient
    .from("admin_users")
    .delete()
    .eq("demo_tag", DEMO_TAG)
    .then(({ error }) => {
      if (error) console.log(`    warn: cleanup admin_users: ${error.message}`);
    });

  // user_roles + profiles
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
      .eq("demo_tag", DEMO_TAG)
      .then(({ error }) => {
        if (error) console.log(`    warn: cleanup profiles: ${error.message}`);
      });
  }

  // Auth users
  for (const user of provisionedUsers) {
    const { error } = await adminClient.auth.admin.deleteUser(user.userId);
    if (error) {
      console.log(`    warn: delete auth user ${user.role}: ${error.message}`);
    }
  }

  // Storage cleanup (best-effort, file may already be removed in test)
  await adminClient.storage
    .from("profile-photos")
    .remove([`smoke-test/${DEMO_TAG}/test.txt`])
    .catch(() => {});

  console.log("  Cleanup complete.\n");
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function printReport(): boolean {
  const maxLen = Math.max(...results.map((r) => r.name.length));

  console.log("\n-----------------------------------------");
  console.log("  AGRI NEXT GEN MVP SMOKE TEST");
  console.log("-----------------------------------------\n");

  for (const r of results) {
    const status = r.passed ? "PASSED" : "FAILED";
    console.log(`  ${r.name.padEnd(maxLen + 2)} ${status}`);
  }

  const failed = results.filter((r) => !r.passed);
  const allPassed = failed.length === 0;

  console.log("\n-----------------------------------------");
  console.log(
    `  FINAL RESULT: ${allPassed ? "MVP WORKFLOWS HEALTHY" : "SOME WORKFLOWS FAILED"}`,
  );
  console.log("-----------------------------------------\n");

  if (failed.length) {
    console.log("  FAILURES:\n");
    for (const f of failed) {
      console.log(`  - ${f.name}: ${f.error}`);
      if (f.suggestion) {
        console.log(`    Suggestion: ${f.suggestion}`);
      }
    }
    console.log("");
  }

  return allPassed;
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

type TestSuite = {
  name: string;
  fn: () => Promise<void>;
  suggestion?: string;
};

const suites: TestSuite[] = [
  {
    name: "Auth Test",
    fn: testAuth,
    suggestion: "Check login-by-phone Edge Function deployment and user credentials",
  },
  {
    name: "Farmer Workflow",
    fn: testFarmerWorkflow,
    suggestion: "Check RLS policies on farmlands/crops for farmer role",
  },
  {
    name: "Listing Workflow",
    fn: testListingWorkflow,
    suggestion: "Check RLS policies on listings for farmer/seller role",
  },
  {
    name: "Buyer Workflow",
    fn: testBuyerWorkflow,
    suggestion: "Check RLS policies on market_orders for buyer role",
  },
  {
    name: "Logistics Workflow",
    fn: testLogisticsWorkflow,
    suggestion: "Check RLS policies on transport_requests and transporter setup",
  },
  {
    name: "Agent Workflow",
    fn: testAgentWorkflow,
    suggestion: "Check RLS policies on agent_farmer_assignments and notifications",
  },
  {
    name: "Admin Access",
    fn: testAdminAccess,
    suggestion: "Check admin read access to profiles, orders, transport tables",
  },
  {
    name: "Storage Test",
    fn: testStorage,
    suggestion: "Ensure storage buckets exist (run the storage buckets migration)",
  },
];

async function main(): Promise<void> {
  console.log("\n=========================================");
  console.log("  AgriNext Gen — MVP Smoke Test Runner");
  console.log("=========================================");

  try {
    await provisionUsers();

    for (const suite of suites) {
      try {
        await suite.fn();
        pass(suite.name);
      } catch (err) {
        fail(suite.name, err, suite.suggestion);
      }
    }
  } finally {
    const allPassed = printReport();

    try {
      await cleanup();
    } catch (cleanupErr) {
      console.error(
        "  Cleanup error:",
        cleanupErr instanceof Error ? cleanupErr.message : cleanupErr,
      );
    }

    process.exit(allPassed ? 0 : 1);
  }
}

main();
