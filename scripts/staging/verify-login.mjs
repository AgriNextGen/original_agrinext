/**
 * verify-login.mjs
 * Tests login-by-phone for all 5 dummy accounts and reports result.
 */
import dotenv from "dotenv";
dotenv.config();

const SUPABASE_URL = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "").replace(/^"|"$/g, "");
const ANON_KEY = (process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "").replace(/^"|"$/g, "");
const FN_URL = `${SUPABASE_URL}/functions/v1/login-by-phone`;

const ACCOUNTS = [
  { phone: "+919900000101", role: "farmer",    name: "Basavaraju Gowda",  dashboard: "/farmer/dashboard" },
  { phone: "+919900000102", role: "agent",     name: "Shwetha Kumar",     dashboard: "/agent/dashboard" },
  { phone: "+919900000103", role: "logistics", name: "Manjunath N",       dashboard: "/logistics/dashboard" },
  { phone: "+919900000104", role: "buyer",     name: "Ayesha Fathima",    dashboard: "/marketplace/dashboard" },
  { phone: "+919900000105", role: "admin",     name: "Raghavendra S",     dashboard: "/admin/dashboard" },
];

const PASSWORD = "Dummy@12345";

async function tryLogin(account) {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ phone: account.phone, password: PASSWORD }),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function main() {
  console.log(`\n${"=".repeat(70)}`);
  console.log("Login Verification — all 5 dummy accounts");
  console.log(`${"=".repeat(70)}\n`);

  let allOk = true;
  const results = [];

  for (const acc of ACCOUNTS) {
    process.stdout.write(`[${acc.role.padEnd(10)}] ${acc.phone}  →  `);
    try {
      const { status, body } = await tryLogin(acc);
      if (status === 200 && body.access_token) {
        console.log(`✅  LOGIN OK   token=${body.access_token.substring(0, 30)}...`);
        results.push({ ...acc, ok: true, note: "login success" });
      } else {
        console.log(`❌  FAIL  HTTP ${status}  ${JSON.stringify(body).substring(0, 100)}`);
        results.push({ ...acc, ok: false, note: `HTTP ${status}: ${body.error ?? JSON.stringify(body)}` });
        allOk = false;
      }
    } catch (e) {
      console.log(`❌  ERROR  ${e.message}`);
      results.push({ ...acc, ok: false, note: e.message });
      allOk = false;
    }
  }

  console.log(`\n${"=".repeat(70)}`);
  if (allOk) {
    console.log("✅  All 5 accounts can log in successfully.");
    console.log("\nExpected dashboard routes after login:");
    for (const r of results) {
      console.log(`  ${r.role.padEnd(10)}  →  ${r.dashboard}`);
    }
  } else {
    console.log("❌  Some accounts failed. See details above.");
    const failed = results.filter(r => !r.ok);
    for (const f of failed) {
      console.log(`  ${f.role.padEnd(10)}  ${f.phone}  →  ${f.note}`);
    }
  }
  console.log();
}

main().catch(err => {
  console.error("verify-login failed:", err.message);
  process.exit(1);
});
