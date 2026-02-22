import { createAdminClient, argValue, readJsonFile, writeJsonFile, assertStagingEnvironment } from "./common.mjs";
import { SeedProfileDataRequestSchema, validateSchema } from "./contracts.mjs";

const admin = createAdminClient();
assertStagingEnvironment();

async function selectOne(table, filters) {
  let query = admin.from(table).select("*");
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}

async function insertOne(table, payload) {
  const { data, error } = await admin.from(table).insert(payload).select("*").maybeSingle();
  if (error) throw error;
  return data;
}

async function insertOnce(table, filters, payload) {
  const existing = await selectOne(table, filters);
  if (existing) return { record: existing, created: false };
  const created = await insertOne(table, payload);
  return { record: created, created: true };
}

async function appendNotification(userId, title, message, type = "system") {
  const existing = await admin
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("title", title)
    .maybeSingle();
  if (existing.data?.id) return { id: existing.data.id, created: false };
  const inserted = await insertOne("notifications", {
    user_id: userId,
    title,
    message,
    type,
    is_read: false,
  });
  return { id: inserted.id, created: true };
}

async function ensureBuyerId(userId, demoTag) {
  await admin
    .from("buyers")
    .upsert(
      {
        id: userId,
        user_id: userId,
        name: "Dummy Buyer One",
        phone: null,
        district: "Bengaluru Urban",
        preferred_crops: ["onion", "tomato"],
        demo_tag: demoTag,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .throwOnError();

  const existing = await admin.from("buyers").select("id").eq("user_id", userId).maybeSingle();
  if (existing.error) throw existing.error;
  return existing.data?.id ?? userId;
}

async function ensureTransporterId(userId, demoTag) {
  const existing = await admin.from("transporters").select("id").eq("user_id", userId).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data?.id) return existing.data.id;
  const inserted = await insertOne("transporters", {
    user_id: userId,
    name: "Dummy Logistics One",
    phone: null,
    operating_district: "Ramanagara",
    vehicle_type: "mini_truck",
    demo_tag: demoTag,
  });
  return inserted.id;
}

async function optionalInsertSupportTicket(adminUserId, demoTag, entityId) {
  try {
    const existing = await admin
      .from("support_tickets")
      .select("id")
      .eq("created_by", adminUserId)
      .ilike("message", `%${demoTag}%`)
      .maybeSingle();
    if (existing.data?.id) return { id: existing.data.id, created: false };
    const inserted = await insertOne("support_tickets", {
      created_by: adminUserId,
      category: "order",
      entity_id: entityId,
      message: `[${demoTag}] Dummy support ticket for admin dashboard`,
      status: "open",
      priority: "normal",
    });
    return { id: inserted.id, created: true };
  } catch (_err) {
    return { id: null, created: false, skipped: true };
  }
}

async function main() {
  const usersFile = argValue("--users-file");
  if (!usersFile) {
    throw new Error("Missing --users-file <path>");
  }

  const outputPath = argValue("--output") ?? usersFile.replace("demo-users-", "seed-data-");
  const usersArtifact = readJsonFile(usersFile);
  const users = usersArtifact.users ?? [];
  const demoTag = usersArtifact.demo_tag;

  if (!demoTag) {
    throw new Error("users artifact missing demo_tag");
  }

  const seedRequest = validateSchema(
    SeedProfileDataRequestSchema,
    {
      demo_tag: demoTag,
      users: users
        .filter((item) => item.user_id)
        .map((item) => ({ user_id: item.user_id, role: item.role, phone: item.phone })),
      richness: "rich",
    },
    "SeedProfileDataRequest",
  );

  const byRole = new Map(seedRequest.users.map((item) => [item.role, item]));
  const farmer = byRole.get("farmer");
  const agent = byRole.get("agent");
  const logistics = byRole.get("logistics");
  const buyerUser = byRole.get("buyer");
  const adminUser = byRole.get("admin");

  if (!farmer || !agent || !logistics || !buyerUser || !adminUser) {
    throw new Error("users artifact must include farmer, agent, logistics, buyer, admin");
  }

  const inserted = {
    farmlands: [],
    crops: [],
    listings: [],
    transport_requests: [],
    trips: [],
    transport_status_events: [],
    vehicles: [],
    agent_farmer_assignments: [],
    agent_tasks: [],
    agent_visits: [],
    agent_voice_notes: [],
    market_orders: [],
    notifications: [],
    support_tickets: [],
    agent_data: [],
  };

  const farmA = await insertOnce(
    "farmlands",
    { farmer_id: farmer.user_id, demo_tag: demoTag, name: "Demo Farm A" },
    {
      farmer_id: farmer.user_id,
      name: "Demo Farm A",
      area: 2.5,
      area_unit: "acres",
      village: "Mysuru Rural",
      district: "Mysuru",
      soil_type: "loamy",
      geo_verified: true,
      demo_tag: demoTag,
    },
  );
  inserted.farmlands.push({ id: farmA.record.id, created: farmA.created });

  const farmB = await insertOnce(
    "farmlands",
    { farmer_id: farmer.user_id, demo_tag: demoTag, name: "Demo Farm B" },
    {
      farmer_id: farmer.user_id,
      name: "Demo Farm B",
      area: 1.4,
      area_unit: "acres",
      village: "Nanjangud",
      district: "Mysuru",
      soil_type: "red",
      geo_verified: true,
      demo_tag: demoTag,
    },
  );
  inserted.farmlands.push({ id: farmB.record.id, created: farmB.created });

  const cropOnion = await insertOnce(
    "crops",
    { farmer_id: farmer.user_id, demo_tag: demoTag, crop_name: "Onion Demo Crop" },
    {
      farmer_id: farmer.user_id,
      land_id: farmA.record.id,
      crop_name: "Onion Demo Crop",
      variety: "Nasik Red",
      status: "growing",
      health_status: "good",
      estimated_quantity: 1200,
      quantity_unit: "kg",
      demo_tag: demoTag,
    },
  );
  inserted.crops.push({ id: cropOnion.record.id, created: cropOnion.created });

  const cropTomato = await insertOnce(
    "crops",
    { farmer_id: farmer.user_id, demo_tag: demoTag, crop_name: "Tomato Demo Crop" },
    {
      farmer_id: farmer.user_id,
      land_id: farmB.record.id,
      crop_name: "Tomato Demo Crop",
      variety: "Hybrid",
      status: "growing",
      health_status: "excellent",
      estimated_quantity: 900,
      quantity_unit: "kg",
      demo_tag: demoTag,
    },
  );
  inserted.crops.push({ id: cropTomato.record.id, created: cropTomato.created });

  const listing = await insertOnce(
    "listings",
    { seller_id: farmer.user_id, demo_tag: demoTag, title: "Demo Onion Listing" },
    {
      seller_id: farmer.user_id,
      crop_id: cropOnion.record.id,
      title: "Demo Onion Listing",
      description: `[${demoTag}] High quality onion lot`,
      category: "vegetables",
      price: 24,
      quantity: 1200,
      unit: "kg",
      location: "Mysuru Mandi",
      is_active: true,
      demo_tag: demoTag,
    },
  );
  inserted.listings.push({ id: listing.record.id, created: listing.created });

  const request = await insertOnce(
    "transport_requests",
    { farmer_id: farmer.user_id, demo_tag: demoTag, pickup_location: "Demo Farm A Gate" },
    {
      farmer_id: farmer.user_id,
      crop_id: cropOnion.record.id,
      pickup_location: "Demo Farm A Gate",
      pickup_village: "Mysuru Rural",
      drop_location: "Mysuru Mandi Yard",
      quantity: 1200,
      quantity_unit: "kg",
      status: "requested",
      notes: `[${demoTag}] dummy transport load`,
      demo_tag: demoTag,
    },
  );
  inserted.transport_requests.push({ id: request.record.id, created: request.created });

  const transporterId = await ensureTransporterId(logistics.user_id, demoTag);
  const vehicle = await insertOnce(
    "vehicles",
    { transporter_id: transporterId, registration_number: `KA-DEMO-${demoTag.slice(-4)}` },
    {
      transporter_id: transporterId,
      vehicle_type: "mini_truck",
      registration_number: `KA-DEMO-${demoTag.slice(-4)}`,
      capacity_kg: 1500,
      refrigerated: false,
    },
  );
  inserted.vehicles.push({ id: vehicle.record.id, created: vehicle.created });

  await admin
    .from("transport_requests")
    .update({
      transporter_id: logistics.user_id,
      vehicle_id: vehicle.record.id,
      assigned_at: new Date().toISOString(),
    })
    .eq("id", request.record.id);

  const trip = await insertOnce(
    "trips",
    { transport_request_id: request.record.id, demo_tag: demoTag },
    {
      transport_request_id: request.record.id,
      transporter_id: logistics.user_id,
      status: "assigned",
      assigned_at: new Date().toISOString(),
      demo_tag: demoTag,
    },
  );
  inserted.trips.push({ id: trip.record.id, created: trip.created });

  const statusEvent = await insertOnce(
    "transport_status_events",
    { transport_request_id: request.record.id, demo_tag: demoTag, new_status: "assigned" },
    {
      transport_request_id: request.record.id,
      trip_id: trip.record.id,
      actor_id: logistics.user_id,
      actor_role: "logistics",
      old_status: "requested",
      new_status: "assigned",
      note: `[${demoTag}] transporter assigned to load`,
      demo_tag: demoTag,
    },
  );
  inserted.transport_status_events.push({ id: statusEvent.record.id, created: statusEvent.created });

  const assignment = await insertOnce(
    "agent_farmer_assignments",
    { agent_id: agent.user_id, farmer_id: farmer.user_id },
    {
      agent_id: agent.user_id,
      farmer_id: farmer.user_id,
      active: true,
      assigned_by: adminUser.user_id,
      demo_tag: demoTag,
    },
  );
  inserted.agent_farmer_assignments.push({ id: `${assignment.record.agent_id}:${assignment.record.farmer_id}`, created: assignment.created });

  const task = await insertOnce(
    "agent_tasks",
    { agent_id: agent.user_id, farmer_id: farmer.user_id, demo_tag: demoTag, task_type: "visit" },
    {
      agent_id: agent.user_id,
      farmer_id: farmer.user_id,
      crop_id: cropOnion.record.id,
      task_type: "visit",
      task_status: "pending",
      priority: 1,
      due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      notes: `[${demoTag}] verify crop readiness`,
      demo_tag: demoTag,
    },
  );
  inserted.agent_tasks.push({ id: task.record.id, created: task.created });

  const visit = await insertOnce(
    "agent_visits",
    { agent_id: agent.user_id, farmer_id: farmer.user_id, demo_tag: demoTag },
    {
      agent_id: agent.user_id,
      farmer_id: farmer.user_id,
      task_id: task.record.id,
      check_in_at: new Date().toISOString(),
      notes: `[${demoTag}] field visit completed`,
      demo_tag: demoTag,
    },
  );
  inserted.agent_visits.push({ id: visit.record.id, created: visit.created });

  const voice = await insertOnce(
    "agent_voice_notes",
    { agent_id: agent.user_id, task_id: task.record.id, note_text: `[${demoTag}] audio summary` },
    {
      agent_id: agent.user_id,
      farmer_id: farmer.user_id,
      crop_id: cropOnion.record.id,
      task_id: task.record.id,
      note_text: `[${demoTag}] audio summary`,
      language_code: "en",
    },
  );
  inserted.agent_voice_notes.push({ id: voice.record.id, created: voice.created });

  const agentData = await insertOnce(
    "agent_data",
    { agent_id: agent.user_id, farmer_id: farmer.user_id, demo_tag: demoTag },
    {
      agent_id: agent.user_id,
      farmer_id: farmer.user_id,
      farm_location: "Mysuru",
      crop_type: "onion",
      crop_health: "good",
      notes: `[${demoTag}] agent observation`,
      demo_tag: demoTag,
    },
  );
  inserted.agent_data.push({ id: agentData.record.id, created: agentData.created });

  const ensuredBuyerId = await ensureBuyerId(buyerUser.user_id, demoTag);
  const order = await insertOnce(
    "market_orders",
    { listing_id: listing.record.id, buyer_id: ensuredBuyerId, demo_tag: demoTag },
    {
      listing_id: listing.record.id,
      crop_id: cropOnion.record.id,
      buyer_id: ensuredBuyerId,
      farmer_id: farmer.user_id,
      quantity: 150,
      price_agreed: 24,
      status: "placed",
      demo_tag: demoTag,
    },
  );
  inserted.market_orders.push({ id: order.record.id, created: order.created });

  const noteFarmer = await appendNotification(
    farmer.user_id,
    `[${demoTag}] New buyer order`,
    "Dummy buyer placed an order for onion listing",
    "order",
  );
  const noteAgent = await appendNotification(
    agent.user_id,
    `[${demoTag}] Assignment active`,
    "Dummy farmer assignment is active",
    "task",
  );
  const noteLogistics = await appendNotification(
    logistics.user_id,
    `[${demoTag}] Trip available`,
    "Dummy transport request has been assigned",
    "shipment",
  );
  const noteBuyer = await appendNotification(
    buyerUser.user_id,
    `[${demoTag}] Order placed`,
    "Your dummy marketplace order was created",
    "order",
  );
  const noteAdmin = await appendNotification(
    adminUser.user_id,
    `[${demoTag}] System seed complete`,
    "Dummy seed data set is available for dashboard checks",
    "system",
  );
  inserted.notifications.push(noteFarmer, noteAgent, noteLogistics, noteBuyer, noteAdmin);

  const ticket = await optionalInsertSupportTicket(adminUser.user_id, demoTag, order.record.id);
  inserted.support_tickets.push(ticket);

  const artifact = {
    kind: "dummy_seed_data",
    generated_at: new Date().toISOString(),
    demo_tag: demoTag,
    users_file: usersFile,
    inserted,
  };

  writeJsonFile(outputPath, artifact);
  console.log(`Seed artifact written: ${outputPath}`);
  console.log(`demo_tag=${demoTag}`);
}

main().catch((err) => {
  console.error(`seed-dummy-data failed: ${err.message}`);
  process.exit(1);
});
