import {
  createAdminClient,
  generateDemoTag,
  normalizePhone,
  authEmailFromPhone,
  argValue,
  writeJsonFile,
  hasFlag,
  assertStagingEnvironment,
} from "./common.mjs";
import { CreateDummyUserRequestSchema, validateSchema } from "./contracts.mjs";

const admin = createAdminClient();
assertStagingEnvironment();

const DEFAULT_PASSWORD = "Dummy@12345";
const USER_SPECS = [
  {
    role: "farmer",
    phone: "+919900000101",
    full_name: "Dummy Farmer One",
    dashboard_path: "/farmer/dashboard",
    profile_metadata: { village: "Mysuru Rural", district: "Mysuru", preferred_language: "en" },
  },
  {
    role: "agent",
    phone: "+919900000102",
    full_name: "Dummy Agent One",
    dashboard_path: "/agent/dashboard",
    profile_metadata: { village: "Mandya", district: "Mandya", preferred_language: "en" },
  },
  {
    role: "logistics",
    phone: "+919900000103",
    full_name: "Dummy Logistics One",
    dashboard_path: "/logistics/dashboard",
    profile_metadata: { village: "Channapatna", district: "Ramanagara", preferred_language: "en" },
  },
  {
    role: "buyer",
    phone: "+919900000104",
    full_name: "Dummy Buyer One",
    dashboard_path: "/marketplace/dashboard",
    profile_metadata: { village: "Bengaluru", district: "Bengaluru Urban", preferred_language: "en" },
  },
  {
    role: "admin",
    phone: "+919900000105",
    full_name: "Dummy Admin One",
    dashboard_path: "/admin/dashboard",
    profile_metadata: { village: "HQ", district: "Bengaluru Urban", preferred_language: "en" },
  },
];

async function findUserByEmail(email) {
  let page = 1;
  while (page <= 20) {
    const listed = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (listed.error) {
      throw listed.error;
    }
    const users = listed.data?.users ?? [];
    const found = users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (users.length < 100) break;
    page += 1;
  }
  return null;
}

async function bestEffortUpsert(table, payload, onConflict) {
  const query = admin.from(table).upsert(payload, onConflict ? { onConflict } : undefined).select("*").maybeSingle();
  const { data, error } = await query;
  if (error) {
    return { ok: false, error: error.message, data: null };
  }
  return { ok: true, error: null, data };
}

async function ensureAuthUser(spec, password, demoTag) {
  const normalizedPhone = normalizePhone(spec.phone);
  const email = authEmailFromPhone(normalizedPhone);

  let userId = null;
  const profileByPhone = await admin
    .from("profiles")
    .select("id")
    .eq("phone", normalizedPhone)
    .maybeSingle();
  if (profileByPhone.data?.id) {
    userId = profileByPhone.data.id;
  }

  if (!userId) {
    const profileByEmail = await admin
      .from("profiles")
      .select("id")
      .eq("auth_email", email)
      .maybeSingle();
    if (profileByEmail.data?.id) {
      userId = profileByEmail.data.id;
    }
  }

  const metadata = {
    role: spec.role,
    phone: normalizedPhone,
    full_name: spec.full_name,
    auth_email: email,
    demo_tag: demoTag,
    created_by: "staging-provision-dummy-users",
    created_at: new Date().toISOString(),
  };

  if (userId) {
    const updated = await admin.auth.admin.updateUserById(userId, {
      email,
      password,
      phone: normalizedPhone,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (updated.error) {
      throw updated.error;
    }
    return { user_id: userId, email, phone: normalizedPhone, reused: true };
  }

  const created = await admin.auth.admin.createUser({
    email,
    password,
    phone: normalizedPhone,
    email_confirm: true,
    user_metadata: metadata,
  });

  if (created.error) {
    const existing = await findUserByEmail(email);
    if (!existing?.id) {
      throw created.error;
    }
    userId = existing.id;
    const patched = await admin.auth.admin.updateUserById(userId, {
      password,
      phone: normalizedPhone,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (patched.error) {
      throw patched.error;
    }
    return { user_id: userId, email, phone: normalizedPhone, reused: true };
  }

  return { user_id: created.data.user.id, email, phone: normalizedPhone, reused: false };
}

async function alignRelationalRows(spec, user, demoTag, warnings) {
  const profilePayload = {
    id: user.user_id,
    full_name: spec.full_name,
    phone: user.phone,
    auth_email: user.email,
    district: spec.profile_metadata.district ?? null,
    village: spec.profile_metadata.village ?? null,
    preferred_language: spec.profile_metadata.preferred_language ?? "en",
    demo_tag: demoTag,
    updated_at: new Date().toISOString(),
  };
  const profileRes = await bestEffortUpsert("profiles", profilePayload, "id");
  if (!profileRes.ok) {
    throw new Error(`profiles upsert failed for ${spec.role}: ${profileRes.error}`);
  }

  const roleRes = await bestEffortUpsert(
    "user_roles",
    { user_id: user.user_id, role: spec.role, created_at: new Date().toISOString() },
    "user_id",
  );
  if (!roleRes.ok) {
    throw new Error(`user_roles upsert failed for ${spec.role}: ${roleRes.error}`);
  }

  const userProfileRes = await bestEffortUpsert(
    "user_profiles",
    {
      user_id: user.user_id,
      profile_type: spec.role,
      display_name: spec.full_name,
      phone: user.phone,
      is_active: true,
    },
    "user_id,profile_type",
  );
  if (!userProfileRes.ok) {
    warnings.push(`user_profiles upsert skipped for ${spec.role}: ${userProfileRes.error}`);
  }

  const linked = { buyer_id: null, transporter_id: null, admin_user_id: null };
  if (spec.role === "buyer") {
    const buyerRes = await bestEffortUpsert(
      "buyers",
      {
        id: user.user_id,
        user_id: user.user_id,
        name: spec.full_name,
        phone: user.phone,
        district: spec.profile_metadata.district ?? null,
        preferred_crops: ["onion", "tomato"],
        demo_tag: demoTag,
        updated_at: new Date().toISOString(),
      },
      "user_id",
    );
    if (!buyerRes.ok) throw new Error(`buyers upsert failed: ${buyerRes.error}`);
    linked.buyer_id = buyerRes.data?.id ?? null;
  }

  if (spec.role === "logistics") {
    const transporterRes = await bestEffortUpsert(
      "transporters",
      {
        user_id: user.user_id,
        name: spec.full_name,
        phone: user.phone,
        operating_district: spec.profile_metadata.district ?? null,
        operating_village: spec.profile_metadata.village ?? null,
        vehicle_type: "mini_truck",
        vehicle_capacity: 1200,
        registration_number: `DL-${demoTag.slice(-4)}-${user.phone.slice(-4)}`,
        demo_tag: demoTag,
        updated_at: new Date().toISOString(),
      },
      "user_id",
    );
    if (!transporterRes.ok) throw new Error(`transporters upsert failed: ${transporterRes.error}`);
    linked.transporter_id = transporterRes.data?.id ?? null;
  }

  if (spec.role === "admin") {
    const adminRes = await bestEffortUpsert(
      "admin_users",
      {
        user_id: user.user_id,
        name: spec.full_name,
        role: "super_admin",
        phone: user.phone,
        assigned_district: spec.profile_metadata.district ?? null,
        demo_tag: demoTag,
        updated_at: new Date().toISOString(),
      },
      "user_id",
    );
    if (!adminRes.ok) throw new Error(`admin_users upsert failed: ${adminRes.error}`);
    linked.admin_user_id = adminRes.data?.id ?? null;
  }

  return linked;
}

async function main() {
  const demoTag = argValue("--demo-tag") ?? generateDemoTag("dummy");
  const password = argValue("--password") ?? DEFAULT_PASSWORD;
  const outputPath = argValue("--output") ?? `artifacts/staging/demo-users-${demoTag}.json`;
  const dryRun = hasFlag("--dry-run");

  if (!/^dummy_\d{8}_\d{4}$/.test(demoTag)) {
    throw new Error("demo_tag must match dummy_YYYYMMDD_HHMM");
  }

  const warnings = [];
  const users = [];

  for (const rawSpec of USER_SPECS) {
    const candidate = {
      ...rawSpec,
      password,
    };
    const spec = validateSchema(CreateDummyUserRequestSchema, candidate, `CreateDummyUserRequest(${rawSpec.role})`);
    if (dryRun) {
      users.push({
        role: spec.role,
        phone: normalizePhone(spec.phone),
        email: authEmailFromPhone(spec.phone),
        dashboard_path: spec.dashboard_path,
        user_id: null,
        password: spec.password,
        reused: null,
        linked: {},
      });
      continue;
    }

    const authUser = await ensureAuthUser(spec, password, demoTag);
    const linked = await alignRelationalRows(spec, authUser, demoTag, warnings);

    users.push({
      role: spec.role,
      user_id: authUser.user_id,
      phone: authUser.phone,
      email: authUser.email,
      password: spec.password,
      dashboard_path: spec.dashboard_path,
      reused: authUser.reused,
      linked,
    });
  }

  const artifact = {
    kind: "dummy_users_credentials",
    demo_tag: demoTag,
    generated_at: new Date().toISOString(),
    dry_run: dryRun,
    users,
    warnings,
  };

  writeJsonFile(outputPath, artifact);

  console.log(`Provisioning artifact written: ${outputPath}`);
  console.log(`demo_tag=${demoTag}`);
  console.log(`users=${users.length}`);
  if (warnings.length) {
    console.log(`warnings=${warnings.length}`);
    for (const warning of warnings) {
      console.log(`warning: ${warning}`);
    }
  }
}

main().catch((err) => {
  console.error(`provision-dummy-users failed: ${err.message}`);
  process.exit(1);
});
