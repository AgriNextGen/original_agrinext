import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !ANON_KEY) {
  console.error("SUPABASE_URL and SUPABASE_ANON_KEY required in environment");
  process.exit(1);
}

const anonymous = createClient(SUPABASE_URL, ANON_KEY);

function reportStep(report, role, step, ok, info = null) {
  report[role].push({ step, ok, info });
  console.log(`[${role}] ${ok ? "PASS" : "FAIL"} - ${step}${info ? ` -> ${JSON.stringify(info)}` : ""}`);
}

async function signInToken(email, password) {
  const { data, error } = await anonymous.auth.signInWithPassword({ email, password });
  if (error) return { error };
  return { token: data.session?.access_token, user: data.user };
}

async function runFarmerFlow(email, password, report) {
  const role = "farmer";
  report[role] = [];
  const res = await signInToken(email, password);
  if (res.error || !res.token) {
    reportStep(report, role, "signIn", false, res.error?.message || "no token");
    return;
  }
  reportStep(report, role, "signIn", true);

  const client = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${res.token}` } } });
  try {
    const { data: profile, error: pErr } = await client.from("profiles").select("*").eq("id", res.user.id).maybeSingle();
    reportStep(report, role, "select_profile", !pErr && !!profile, pErr?.message);

    // Insert crop
    let cropId = null;
    try {
      const { data: cropData, error: cropErr } = await client.from("crops").insert({
        farmer_id: res.user.id,
        crop_name: "test-crop",
      }).select().maybeSingle();
      cropId = cropData?.id;
      reportStep(report, role, "insert_crop", !cropErr && !!cropData, cropErr?.message);
    } catch (e) {
      reportStep(report, role, "insert_crop", false, e.message);
    }

    // Select own crops
    try {
      const { data: crops, error: cropsErr } = await client.from("crops").select("*").eq("farmer_id", res.user.id);
      reportStep(report, role, "select_own_crops", !cropsErr, cropsErr?.message);
    } catch (e) {
      reportStep(report, role, "select_own_crops", false, e.message);
    }

    // Insert farmland
    let farmId = null;
    try {
      const { data: fData, error: fErr } = await client.from("farmlands").insert({
        farmer_id: res.user.id,
        name: "test-farm",
      }).select().maybeSingle();
      farmId = fData?.id;
      reportStep(report, role, "insert_farmland", !fErr && !!fData, fErr?.message);
    } catch (e) {
      reportStep(report, role, "insert_farmland", false, e.message);
    }

    // Insert transport request
    try {
      const { data: trData, error: trErr } = await client.from("transport_requests").insert({
        farmer_id: res.user.id,
        pickup_village: "TestVillage",
        status: "requested",
      }).select().maybeSingle();
      reportStep(report, role, "insert_transport_request", !trErr && !!trData, trErr?.message);
    } catch (e) {
      reportStep(report, role, "insert_transport_request", false, e.message);
    }

    // Select listings
    try {
      const { data: listings, error: lErr } = await client.from("listings").select("*").eq("seller_id", res.user.id);
      reportStep(report, role, "select_listings", !lErr, lErr?.message);
    } catch (e) {
      reportStep(report, role, "select_listings", false, e.message);
    }

    // Select notifications
    try {
      const { data: notes, error: nErr } = await client.from("notifications").select("*").eq("user_id", res.user.id);
      reportStep(report, role, "select_notifications", !nErr, nErr?.message);
    } catch (e) {
      reportStep(report, role, "select_notifications", false, e.message);
    }

    // RPC get_farmer_orders_with_context
    try {
      const { data: orders, error: oErr } = await client.rpc("get_farmer_orders_with_context", { farmer_id: res.user.id });
      reportStep(report, role, "rpc_get_farmer_orders_with_context", !oErr, oErr?.message);
    } catch (e) {
      reportStep(report, role, "rpc_get_farmer_orders_with_context", false, e.message);
    }

    // Cleanup: delete created crop and farmland if present
    if (cropId) {
      try {
        const { error: delErr } = await client.from("crops").delete().eq("id", cropId);
        reportStep(report, role, "delete_crop", !delErr, delErr?.message);
      } catch (e) {
        reportStep(report, role, "delete_crop", false, e.message);
      }
    }
    if (farmId) {
      try {
        const { error: delF } = await client.from("farmlands").delete().eq("id", farmId);
        reportStep(report, role, "delete_farmland", !delF, delF?.message);
      } catch (e) {
        reportStep(report, role, "delete_farmland", false, e.message);
      }
    }
  } catch (e) {
    reportStep(report, role, "exception", false, e.message);
  }
}

async function runAgentFlow(email, password, report) {
  const role = "agent";
  report[role] = [];
  const res = await signInToken(email, password);
  if (res.error || !res.token) {
    reportStep(report, role, "signIn", false, res.error?.message || "no token");
    return;
  }
  reportStep(report, role, "signIn", true);
  const client = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${res.token}` } } });
  try {
    const { data: profile, error: pErr } = await client.from("profiles").select("*").eq("id", res.user.id).maybeSingle();
    reportStep(report, role, "select_profile", !pErr && !!profile, pErr?.message);

    const { data: assignments, error: aErr } = await client.from("agent_farmer_assignments").select("*").eq("agent_id", res.user.id).eq("active", true);
    reportStep(report, role, "select_assignments", !aErr, aErr?.message);
    const farmerIds = (assignments || []).map((a) => a.farmer_id).filter(Boolean);

    // Assigned farmers' profiles
    try {
      const { data: fProfiles, error: fpErr } = await client.from("profiles").select("*").in("id", farmerIds);
      reportStep(report, role, "select_assigned_profiles", !fpErr, fpErr?.message);
    } catch (e) {
      reportStep(report, role, "select_assigned_profiles", false, e.message);
    }

    // Assigned farmers' crops
    try {
      const { data: crops, error: cErr } = await client.from("crops").select("*").in("farmer_id", farmerIds);
      reportStep(report, role, "select_assigned_crops", !cErr, cErr?.message);
    } catch (e) {
      reportStep(report, role, "select_assigned_crops", false, e.message);
    }

    // transport_requests
    try {
      const { data: trs, error: trErr } = await client.from("transport_requests").select("*").in("farmer_id", farmerIds);
      reportStep(report, role, "select_assigned_transport_requests", !trErr, trErr?.message);
    } catch (e) {
      reportStep(report, role, "select_assigned_transport_requests", false, e.message);
    }

    // Insert agent_task for assigned farmer (if any)
    if (farmerIds.length > 0) {
      try {
        const { data: taskData, error: taskErr } = await client.from("agent_tasks").insert({
          agent_id: res.user.id,
          farmer_id: farmerIds[0],
          task_type: "visit",
          due_date: new Date().toISOString(),
          priority: 1,
        }).select().maybeSingle();
        reportStep(report, role, "insert_agent_task", !taskErr && !!taskData, taskErr?.message);
        if (taskData?.id) {
          // Update status
          const { error: upErr } = await client.from("agent_tasks").update({ task_status: "completed" }).eq("id", taskData.id);
          reportStep(report, role, "update_agent_task_status", !upErr, upErr?.message);
          // cleanup
          await client.from("agent_tasks").delete().eq("id", taskData.id);
        }
      } catch (e) {
        reportStep(report, role, "insert_agent_task", false, e.message);
      }
    } else {
      reportStep(report, role, "insert_agent_task", false, "no assigned farmers");
    }
  } catch (e) {
    reportStep(report, role, "exception", false, e.message);
  }
}

async function runTransporterFlow(email, password, report) {
  const role = "transporter";
  report[role] = [];
  const res = await signInToken(email, password);
  if (res.error || !res.token) {
    reportStep(report, role, "signIn", false, res.error?.message || "no token");
    return;
  }
  reportStep(report, role, "signIn", true);
  const client = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${res.token}` } } });
  try {
    const { data: profile, error: pErr } = await client.from("profiles").select("*").eq("id", res.user.id).maybeSingle();
    reportStep(report, role, "select_profile", !pErr && !!profile, pErr?.message);

    const { data: loads, error: lErr } = await client.from("transport_requests").select("*").eq("status", "requested");
    reportStep(report, role, "select_available_loads", !lErr, lErr?.message);

    // Insert vehicle
    try {
      const { data: vData, error: vErr } = await client.from("vehicles").insert({ transporter_id: res.user.id, name: "test-vehicle" }).select().maybeSingle();
      reportStep(report, role, "insert_vehicle", !vErr && !!vData, vErr?.message);
      if (vData?.id) {
        await client.from("vehicles").delete().eq("id", vData.id);
      }
    } catch (e) {
      reportStep(report, role, "insert_vehicle", false, e.message);
    }

    // RPC accept_transport_load (if exists)
    try {
      const { data: rpcData, error: rpcErr } = await client.rpc("accept_transport_load", { /* params may vary */ });
      reportStep(report, role, "rpc_accept_transport_load", !rpcErr, rpcErr?.message);
    } catch (e) {
      reportStep(report, role, "rpc_accept_transport_load", false, e.message);
    }
  } catch (e) {
    reportStep(report, role, "exception", false, e.message);
  }
}

async function runBuyerFlow(email, password, report) {
  const role = "buyer";
  report[role] = [];
  const res = await signInToken(email, password);
  if (res.error || !res.token) {
    reportStep(report, role, "signIn", false, res.error?.message || "no token");
    return;
  }
  reportStep(report, role, "signIn", true);
  const client = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${res.token}` } } });
  try {
    const { data: profile, error: pErr } = await client.from("profiles").select("*").eq("id", res.user.id).maybeSingle();
    reportStep(report, role, "select_profile", !pErr && !!profile, pErr?.message);

    const { data: buyerRec, error: bErr } = await client.from("buyers").select("*").eq("buyer_id", res.user.id).maybeSingle();
    reportStep(report, role, "select_buyer_record", !bErr, bErr?.message);

    const { data: listings, error: lErr } = await client.from("listings").select("*").limit(5);
    reportStep(report, role, "select_active_listings", !lErr, lErr?.message);

    // Insert market_order
    try {
      const { data: orderData, error: oErr } = await client.from("market_orders").insert({
        buyer_id: res.user.id,
        crop_id: listings?.[0]?.id || null,
        quantity: 1,
      }).select().maybeSingle();
      reportStep(report, role, "insert_market_order", !oErr && !!orderData, oErr?.message);
      if (orderData?.id) {
        await client.from("market_orders").delete().eq("id", orderData.id);
      }
    } catch (e) {
      reportStep(report, role, "insert_market_order", false, e.message);
    }
  } catch (e) {
    reportStep(report, role, "exception", false, e.message);
  }
}

async function runAdminFlow(email, password, report) {
  const role = "admin";
  report[role] = [];
  const res = await signInToken(email, password);
  if (res.error || !res.token) {
    reportStep(report, role, "signIn", false, res.error?.message || "no token");
    return;
  }
  reportStep(report, role, "signIn", true);
  const client = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${res.token}` } } });
  try {
    const { data: profiles, error: pErr } = await client.from("profiles").select("*").limit(5);
    reportStep(report, role, "select_all_profiles", !pErr, pErr?.message);

    const { data: crops, error: cErr } = await client.from("crops").select("*").limit(5);
    reportStep(report, role, "select_all_crops", !cErr, cErr?.message);

    const { data: trs, error: trErr } = await client.from("transport_requests").select("*").limit(5);
    reportStep(report, role, "select_all_transport_requests", !trErr, trErr?.message);

    const { data: mo, error: moErr } = await client.from("market_orders").select("*").limit(5);
    reportStep(report, role, "select_all_market_orders", !moErr, moErr?.message);

    const { data: admins, error: aErr } = await client.from("admin_users").select("*").limit(5);
    reportStep(report, role, "select_admin_users", !aErr, aErr?.message);

    const { data: roles, error: rErr } = await client.from("user_roles").select("*").limit(5);
    reportStep(report, role, "select_user_roles", !rErr, rErr?.message);
  } catch (e) {
    reportStep(report, role, "exception", false, e.message);
  }
}

async function runAll() {
  const report = {};
  console.log("Running P0 verification flows for all roles");
  // Emails/passwords used by seed-test-users.js
  await runFarmerFlow("farmer1+test@local", "Password123!", report);
  await runAgentFlow("agent1+test@local", "Password123!", report);
  await runTransporterFlow("transporter1+test@local", "Password123!", report);
  await runBuyerFlow("buyer1+test@local", "Password123!", report);
  await runAdminFlow("admin1+test@local", "Password123!", report);

  console.log("\nP0 Verification Report:");
  console.log(JSON.stringify(report, null, 2));
  // Exit code non-zero if any FAIL
  let anyFail = false;
  for (const role of Object.keys(report)) {
    for (const s of report[role]) {
      if (!s.ok) anyFail = true;
    }
  }
  process.exit(anyFail ? 2 : 0);
}

runAll().catch((e) => {
  console.error("RunAll failed", e);
  process.exit(1);
});

