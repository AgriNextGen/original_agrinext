import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function createUser(email, password, full_name, role) {
  // Try admin API if available
  if (supabase.auth && (supabase.auth as any).admin && (supabase.auth as any).admin.createUser) {
    const resp = await (supabase.auth as any).admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (resp.error) throw resp.error;
    const uid = resp.user?.id;
    // create profile
    await supabase.from("profiles").insert({ id: uid, full_name });
    // set role
    await supabase.from("user_roles").insert({ user_id: uid, role });
    return uid;
  }

  // Fallback: insert into profiles and user_roles only (assumes external user exists)
  const { data: profileData, error: profileErr } = await supabase
    .from("profiles")
    .insert({ full_name })
    .select()
    .maybeSingle();
  if (profileErr) throw profileErr;
  return profileData?.id || null;
}

async function run() {
  console.log("Seeding test users (P0) — run with SUPABASE_SERVICE_ROLE_KEY set");
  try {
    const farmerEmail = "farmer1+test@local";
    const agentEmail = "agent1+test@local";
    const transporterEmail = "transporter1+test@local";
    const buyerEmail = "buyer1+test@local";
    const adminEmail = "admin1+test@local";

    const farmerId = await createUser(farmerEmail, "Password123!", "Farmer One", "farmer");
    const agentId = await createUser(agentEmail, "Password123!", "Agent One", "agent");
    const transporterId = await createUser(transporterEmail, "Password123!", "Transporter One", "transporter");
    const buyerId = await createUser(buyerEmail, "Password123!", "Buyer One", "buyer");
    const adminId = await createUser(adminEmail, "Password123!", "Admin One", "admin");

    console.log({ farmerId, agentId, transporterId, buyerId, adminId });

    // Create an assignment: agent -> farmer
    if (agentId && farmerId) {
      await supabase.from("agent_farmer_assignments").insert({
        agent_id: agentId,
        farmer_id: farmerId,
        active: true,
      });
      console.log("Inserted agent_farmer_assignment");
    }

    console.log("Seed complete");
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  }
}

run();

