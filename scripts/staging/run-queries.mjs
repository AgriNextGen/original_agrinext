import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://rmtkkzfzdmpjlqexrbme.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtdGtremZ6ZG1wamxxZXhyYm1lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE3MTM0MywiZXhwIjoyMDg2NzQ3MzQzfQ.boHbegytdSBXEhCT_dkg8Bl98W5lyQupb2bGo0nSqR4";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runSql(label, sql) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`QUERY: ${label}`);
  console.log("=".repeat(60));
  const { data, error } = await supabase.rpc("exec_sql", { query: sql }).catch(() => ({ data: null, error: { message: "rpc exec_sql not available" } }));
  if (error) {
    // Fall back to direct REST query via pg endpoint
    console.log("RPC unavailable, using REST API...");
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    });
    const body = await res.text();
    console.log("Status:", res.status);
    console.log("Body:", body);
    return;
  }
  console.log(JSON.stringify(data, null, 2));
}

async function runPgQuery(label, sql) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`QUERY: ${label}`);
  console.log("=".repeat(60));

  // Use Supabase Management API to run SQL
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });
  
  // Try direct table queries using supabase-js
  return null;
}

// QUERY 1 - profiles + roles for demo phones (two separate queries, then join in JS)
async function query1() {
  console.log(`\n${"=".repeat(60)}`);
  console.log("QUERY 1 — Demo accounts with phones, names, roles, status");
  console.log("=".repeat(60));

  const demoPhones = [
    '+919900000101', '+919900000102', '+919900000103',
    '+919900000104', '+919900000105',
    '+917022209551', '+917022209552', '+917022209553', '+917022209554',
    '+918867296074', '+919980092461'
  ];

  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("id, phone, full_name, auth_email, account_status, created_at")
    .in("phone", demoPhones)
    .order("phone");

  if (pErr) {
    console.log("ERROR (profiles):", JSON.stringify(pErr, null, 2));
    return;
  }

  const profileIds = (profiles ?? []).map(p => p.id);

  // Try user_roles first, then roles
  let roles = [];
  const { data: ur, error: urErr } = await supabase
    .from("user_roles")
    .select("user_id, role")
    .in("user_id", profileIds);

  if (!urErr) {
    roles = ur ?? [];
  } else {
    console.log("user_roles error:", urErr.message, "— trying 'roles' table...");
    const { data: r2, error: r2Err } = await supabase
      .from("roles")
      .select("user_id, role")
      .in("user_id", profileIds);
    if (!r2Err) {
      roles = r2 ?? [];
    } else {
      console.log("roles error:", r2Err.message);
    }
  }

  const roleMap = {};
  for (const r of roles) {
    roleMap[r.user_id] = r.role;
  }

  const merged = (profiles ?? []).map(p => ({
    phone: p.phone,
    full_name: p.full_name,
    auth_email: p.auth_email,
    account_status: p.account_status,
    role: roleMap[p.id] ?? null,
    created_at: p.created_at,
  }));

  console.log("ROWS:", merged.length);
  console.log(JSON.stringify(merged, null, 2));
}

// QUERY 2 - Latest 5 profiles
async function query2() {
  console.log(`\n${"=".repeat(60)}`);
  console.log("QUERY 2 — Latest 5 profiles (most recently created)");
  console.log("=".repeat(60));

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, auth_email, account_status")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.log("ERROR:", JSON.stringify(error, null, 2));
  } else {
    console.log("ROWS:", data?.length ?? 0);
    console.log(JSON.stringify(data, null, 2));
  }
}

// QUERY 3 - auth.users for demo accounts
async function query3() {
  console.log(`\n${"=".repeat(60)}`);
  console.log("QUERY 3 — auth.users metadata for demo accounts");
  console.log("=".repeat(60));

  const demoPhones = [
    '+919900000101', '+919900000102', '+919900000103',
    '+919900000104', '+919900000105'
  ];

  // Use admin API to list users
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 200 });
  if (error) {
    console.log("ERROR:", JSON.stringify(error, null, 2));
    return;
  }

  const filtered = (data?.users ?? []).filter(u => {
    return (
      demoPhones.includes(u.phone) ||
      (u.email && (u.email.includes("9900000") || u.email.includes("919900000"))) ||
      (u.phone && u.phone.includes("9900000"))
    );
  });

  console.log("TOTAL auth.users fetched:", data?.users?.length ?? 0);
  console.log("MATCHING rows:", filtered.length);
  
  const mapped = filtered.map(u => ({
    id: u.id,
    email: u.email,
    phone: u.phone,
    full_name: u.user_metadata?.full_name ?? u.raw_user_meta_data?.full_name ?? null,
    meta_role: u.user_metadata?.role ?? u.raw_user_meta_data?.role ?? null,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
  }));
  
  console.log(JSON.stringify(mapped, null, 2));
}

await query1();
await query2();
await query3();
console.log("\nDone.");
