import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !ANON_KEY) {
  console.error("SUPABASE_URL and SUPABASE_ANON_KEY required in environment");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function loginByEmail(email, password) {
  // Try password signin
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.warn("signInWithPassword failed:", error.message);
    return null;
  }
  return data.session?.access_token;
}

async function farmerFlow(email, password) {
  console.log("Running farmer flow for", email);
  const token = await loginByEmail(email, password);
  if (!token) {
    console.warn("Skipping farmer flow due to no token");
    return;
  }
  const client = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });

  // Example: fetch profile
  const { data: profile, error: pErr } = await client.from("profiles").select("*").limit(1);
  console.log("profiles select:", !!profile, pErr?.message);
}

async function run() {
  console.log("Running P0 flows (requires user credentials created by seed)");
  // Example email/passwords used in seed
  await farmerFlow("farmer1+test@local", "Password123!");
  // Add other role flows as needed
}

run().catch((e) => {
  console.error("Run failed", e);
  process.exit(1);
});

