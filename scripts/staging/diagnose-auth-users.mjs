/**
 * diagnose-auth-users.mjs
 * Checks whether the 5 dummy accounts have matching auth.users entries
 * and what passwords/emails are set.
 */
import { createAdminClient, assertStagingEnvironment } from "./common.mjs";

assertStagingEnvironment();
const admin = createAdminClient();

const PHONES = [
  "+919900000101",
  "+919900000102",
  "+919900000103",
  "+919900000104",
  "+919900000105",
];

async function main() {
  // 1. Fetch profile rows
  const { data: profiles, error: pErr } = await admin
    .from("profiles")
    .select("id, phone, full_name, auth_email, account_status")
    .in("phone", PHONES)
    .order("phone");
  if (pErr) throw new Error("profiles query: " + pErr.message);

  console.log("\n=== profiles.auth_email ===");
  console.log("phone            | auth_email                          | account_status");
  console.log("-".repeat(80));
  for (const p of profiles ?? []) {
    console.log(
      `${p.phone.padEnd(16)} | ${(p.auth_email ?? "NULL").padEnd(35)} | ${p.account_status}`
    );
  }

  // 2. Fetch all auth users (paginated)
  const allAuthUsers = [];
  let page = 1;
  while (page <= 20) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error("listUsers: " + error.message);
    allAuthUsers.push(...(data?.users ?? []));
    if ((data?.users?.length ?? 0) < 200) break;
    page++;
  }

  const emailMap = new Map(allAuthUsers.map(u => [u.email?.toLowerCase(), u]));

  console.log("\n=== auth.users lookup ===");
  console.log(
    "phone            | auth_email                          | auth_user | email_confirmed | has_password"
  );
  console.log("-".repeat(110));

  for (const p of profiles ?? []) {
    const email = (p.auth_email ?? "").toLowerCase();
    const authUser = emailMap.get(email);
    const exists = !!authUser;
    const confirmed = authUser?.email_confirmed_at ? "YES" : "NO";
    const hasPassword = authUser?.encrypted_password
      ? authUser.encrypted_password.length > 10
        ? "YES"
        : "EMPTY"
      : "UNKNOWN";

    console.log(
      `${p.phone.padEnd(16)} | ${email.padEnd(35)} | ${(exists ? "EXISTS" : "MISSING").padEnd(9)} | ${confirmed.padEnd(15)} | ${hasPassword}`
    );
  }

  // 3. Try to re-provision if any auth user is missing
  const missing = (profiles ?? []).filter(p => {
    const email = (p.auth_email ?? "").toLowerCase();
    return !emailMap.has(email);
  });

  if (missing.length > 0) {
    console.log(`\n⚠  ${missing.length} auth user(s) missing. Run staging:provision-dummy-users to create them.`);
  } else {
    console.log("\n✓  All auth users exist. The 401 is likely a wrong password.");
    console.log("   Re-provisioning will reset passwords to Dummy@12345 ...\n");
  }

  console.log("\n=== Total auth users in project ===", allAuthUsers.length);
}

main().catch(err => {
  console.error("diagnose-auth-users failed:", err.message);
  process.exit(1);
});
