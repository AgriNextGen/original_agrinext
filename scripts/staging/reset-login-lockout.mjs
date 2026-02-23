import {
  createAdminClient,
  argValue,
  hasFlag,
  readJsonFile,
  writeJsonFile,
  normalizePhone,
  assertStagingEnvironment,
} from "./common.mjs";

const admin = createAdminClient();
assertStagingEnvironment();

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function parsePhones() {
  const single = argValue("--phone");
  const many = argValue("--phones");
  const usersFile = argValue("--users-file");

  const phones = [];

  if (single) {
    phones.push(normalizePhone(single));
  }

  if (many) {
    for (const raw of many.split(",")) {
      const value = raw.trim();
      if (!value) continue;
      phones.push(normalizePhone(value));
    }
  }

  if (usersFile) {
    const artifact = readJsonFile(usersFile);
    for (const item of artifact?.users ?? []) {
      if (item?.phone) phones.push(normalizePhone(item.phone));
    }
  }

  return unique(phones);
}

async function main() {
  const phones = parsePhones();
  const forceUnlock = hasFlag("--force-unlock");
  const outputPath = argValue("--output") ?? `artifacts/staging/reset-login-lockout-${Date.now()}.json`;

  if (!phones.length) {
    throw new Error("Provide --phone, --phones, or --users-file");
  }

  const results = [];

  for (const phone of phones) {
    const { data: profiles, error } = await admin
      .from("profiles")
      .select("id, phone, account_status, blocked_until, failed_login_count_window, failed_login_window_started_at")
      .eq("phone", phone)
      .order("created_at", { ascending: false });

    if (error) {
      results.push({ phone, ok: false, error: error.message });
      continue;
    }

    if (!profiles?.length) {
      results.push({ phone, ok: false, error: "No profile found" });
      continue;
    }

    for (const profile of profiles) {
      const nextStatus = profile.account_status === "restricted"
        ? "active"
        : forceUnlock && profile.account_status === "locked"
        ? "active"
        : profile.account_status;

      const updatePayload = {
        blocked_until: null,
        failed_login_count_window: 0,
        failed_login_window_started_at: null,
        last_failed_login_at: null,
        account_status: nextStatus,
      };

      const { error: updateError } = await admin
        .from("profiles")
        .update(updatePayload)
        .eq("id", profile.id);

      if (updateError) {
        results.push({
          phone,
          profile_id: profile.id,
          ok: false,
          error: updateError.message,
        });
        continue;
      }

      results.push({
        phone,
        profile_id: profile.id,
        ok: true,
        previous_account_status: profile.account_status,
        new_account_status: nextStatus,
        force_unlocked: forceUnlock && profile.account_status === "locked",
      });
    }
  }

  const artifact = {
    kind: "reset_login_lockout",
    executed_at: new Date().toISOString(),
    force_unlock: forceUnlock,
    results,
  };

  writeJsonFile(outputPath, artifact);
  console.log(`Reset artifact written: ${outputPath}`);
  const successCount = results.filter((item) => item.ok).length;
  console.log(`updated=${successCount}`);
}

main().catch((err) => {
  console.error(`reset-login-lockout failed: ${err.message}`);
  process.exit(1);
});
