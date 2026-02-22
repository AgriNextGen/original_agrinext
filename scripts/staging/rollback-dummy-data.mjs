import {
  createAdminClient,
  argValue,
  hasFlag,
  readJsonFile,
  writeJsonFile,
  assertStagingEnvironment,
} from "./common.mjs";

const admin = createAdminClient();
assertStagingEnvironment();

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

function parseUsersArtifact(pathArg) {
  if (!pathArg) return null;
  const data = readJsonFile(pathArg);
  const users = Array.isArray(data.users) ? data.users : [];
  return {
    path: pathArg,
    demo_tag: data.demo_tag ?? null,
    users,
  };
}

async function listAuthUsersByDemoTag(demoTag) {
  const found = [];
  let page = 1;
  while (page <= 50) {
    const listed = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (listed.error) throw listed.error;
    const users = listed.data?.users ?? [];
    for (const user of users) {
      const userTag = user.user_metadata?.demo_tag ?? user.app_metadata?.demo_tag ?? null;
      if (userTag === demoTag) {
        found.push({
          id: user.id,
          phone: user.phone ?? null,
          email: user.email ?? null,
        });
      }
    }
    if (users.length < 200) break;
    page += 1;
  }
  return found;
}

async function queryProfilesByDemoTag(demoTag) {
  try {
    const res = await admin
      .from("profiles")
      .select("id,phone,auth_email,demo_tag")
      .eq("demo_tag", demoTag);
    if (res.error) throw res.error;
    return res.data ?? [];
  } catch (_err) {
    return [];
  }
}

function makeOperation(label, fn) {
  return { label, fn };
}

async function runOperation(label, action, report) {
  try {
    const result = await action();
    report.operations.push({
      label,
      ...result,
      error: null,
    });
  } catch (err) {
    report.operations.push({
      label,
      matched: 0,
      affected: 0,
      skipped: true,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function countEq(table, column, value) {
  const res = await admin.from(table).select("*", { count: "exact", head: true }).eq(column, value);
  if (res.error) throw res.error;
  return res.count ?? 0;
}

async function deleteEq(table, column, value) {
  const res = await admin.from(table).delete({ count: "exact" }).eq(column, value);
  if (res.error) throw res.error;
  return res.count ?? 0;
}

async function countIn(table, column, values) {
  if (!values.length) return 0;
  const res = await admin.from(table).select("*", { count: "exact", head: true }).in(column, values);
  if (res.error) throw res.error;
  return res.count ?? 0;
}

async function deleteIn(table, column, values) {
  if (!values.length) return 0;
  const res = await admin.from(table).delete({ count: "exact" }).in(column, values);
  if (res.error) throw res.error;
  return res.count ?? 0;
}

async function countIlike(table, column, pattern) {
  const res = await admin.from(table).select("*", { count: "exact", head: true }).ilike(column, pattern);
  if (res.error) throw res.error;
  return res.count ?? 0;
}

async function deleteIlike(table, column, pattern) {
  const res = await admin.from(table).delete({ count: "exact" }).ilike(column, pattern);
  if (res.error) throw res.error;
  return res.count ?? 0;
}

async function main() {
  const usersFile = argValue("--users-file");
  const artifact = parseUsersArtifact(usersFile);

  const demoTag =
    argValue("--demo-tag") ??
    artifact?.demo_tag ??
    null;

  if (!demoTag || !/^dummy_\d{8}_\d{4}$/.test(demoTag)) {
    throw new Error("Missing or invalid --demo-tag (expected dummy_YYYYMMDD_HHMM)");
  }

  const dryRun = hasFlag("--dry-run");
  const outputPath = argValue("--output") ?? `artifacts/staging/rollback-${demoTag}.json`;

  const profileRows = await queryProfilesByDemoTag(demoTag);
  const authTaggedUsers = await listAuthUsersByDemoTag(demoTag);

  const artifactUsers = (artifact?.users ?? [])
    .filter((item) => item.user_id)
    .map((item) => ({
      id: item.user_id,
      phone: item.phone ?? null,
      email: item.email ?? null,
    }));

  const userIds = uniq([
    ...profileRows.map((item) => item.id),
    ...artifactUsers.map((item) => item.id),
    ...authTaggedUsers.map((item) => item.id),
  ]);

  const phones = uniq([
    ...profileRows.map((item) => item.phone),
    ...artifactUsers.map((item) => item.phone),
    ...authTaggedUsers.map((item) => item.phone),
  ]);

  let transporterIds = [];
  try {
    const tr = await admin.from("transporters").select("id").eq("demo_tag", demoTag);
    if (!tr.error) transporterIds = (tr.data ?? []).map((item) => item.id);
  } catch (_err) {
    transporterIds = [];
  }

  const report = {
    kind: "dummy_data_rollback",
    executed_at: new Date().toISOString(),
    demo_tag: demoTag,
    dry_run: dryRun,
    users_file: usersFile ?? null,
    candidates: {
      tagged_profiles: profileRows.length,
      tagged_auth_users: authTaggedUsers.length,
      merged_user_ids: userIds.length,
      merged_phones: phones.length,
      tagged_transporters: transporterIds.length,
    },
    operations: [],
  };

  const operations = [
    makeOperation("transport_status_events by demo_tag", async () => {
      const matched = await countEq("transport_status_events", "demo_tag", demoTag);
      if (dryRun) return { matched, affected: 0, skipped: false };
      const affected = await deleteEq("transport_status_events", "demo_tag", demoTag);
      return { matched, affected, skipped: false };
    }),
    makeOperation("agent_voice_notes by tag marker in note_text", async () => {
      const pattern = `%[${demoTag}]%`;
      const matched = await countIlike("agent_voice_notes", "note_text", pattern);
      if (dryRun) return { matched, affected: 0, skipped: false };
      const affected = await deleteIlike("agent_voice_notes", "note_text", pattern);
      return { matched, affected, skipped: false };
    }),
    makeOperation("agent_visits by demo_tag", async () => {
      const matched = await countEq("agent_visits", "demo_tag", demoTag);
      if (dryRun) return { matched, affected: 0, skipped: false };
      const affected = await deleteEq("agent_visits", "demo_tag", demoTag);
      return { matched, affected, skipped: false };
    }),
    makeOperation("agent_tasks by demo_tag", async () => {
      const matched = await countEq("agent_tasks", "demo_tag", demoTag);
      if (dryRun) return { matched, affected: 0, skipped: false };
      const affected = await deleteEq("agent_tasks", "demo_tag", demoTag);
      return { matched, affected, skipped: false };
    }),
    makeOperation("agent_data by demo_tag", async () => {
      const matched = await countEq("agent_data", "demo_tag", demoTag);
      if (dryRun) return { matched, affected: 0, skipped: false };
      const affected = await deleteEq("agent_data", "demo_tag", demoTag);
      return { matched, affected, skipped: false };
    }),
    makeOperation("notifications by tag marker", async () => {
      const pattern = `%[${demoTag}]%`;
      const matched = await countIlike("notifications", "title", pattern);
      if (dryRun) return { matched, affected: 0, skipped: false };
      const affected = await deleteIlike("notifications", "title", pattern);
      return { matched, affected, skipped: false };
    }),
    makeOperation("support_tickets by tag marker", async () => {
      const pattern = `%[${demoTag}]%`;
      const matched = await countIlike("support_tickets", "message", pattern);
      if (dryRun) return { matched, affected: 0, skipped: false };
      const affected = await deleteIlike("support_tickets", "message", pattern);
      return { matched, affected, skipped: false };
    }),
    makeOperation("market_orders by demo_tag", async () => {
      const matched = await countEq("market_orders", "demo_tag", demoTag);
      if (dryRun) return { matched, affected: 0, skipped: false };
      const affected = await deleteEq("market_orders", "demo_tag", demoTag);
      return { matched, affected, skipped: false };
    }),
    makeOperation("trips by demo_tag", async () => {
      const matched = await countEq("trips", "demo_tag", demoTag);
      if (dryRun) return { matched, affected: 0, skipped: false };
      const affected = await deleteEq("trips", "demo_tag", demoTag);
      return { matched, affected, skipped: false };
    }),
    makeOperation("transport_requests by demo_tag", async () => {
      const matched = await countEq("transport_requests", "demo_tag", demoTag);
      if (dryRun) return { matched, affected: 0, skipped: false };
      const affected = await deleteEq("transport_requests", "demo_tag", demoTag);
      return { matched, affected, skipped: false };
    }),
    makeOperation("listings by demo_tag", async () => {
      const matched = await countEq("listings", "demo_tag", demoTag);
      if (dryRun) return { matched, affected: 0, skipped: false };
      const affected = await deleteEq("listings", "demo_tag", demoTag);
      return { matched, affected, skipped: false };
    }),
    makeOperation("crops by demo_tag", async () => {
      const matched = await countEq("crops", "demo_tag", demoTag);
      if (dryRun) return { matched, affected: 0, skipped: false };
      const affected = await deleteEq("crops", "demo_tag", demoTag);
      return { matched, affected, skipped: false };
    }),
    makeOperation("farmlands by demo_tag", async () => {
      const matched = await countEq("farmlands", "demo_tag", demoTag);
      if (dryRun) return { matched, affected: 0, skipped: false };
      const affected = await deleteEq("farmlands", "demo_tag", demoTag);
      return { matched, affected, skipped: false };
    }),
    makeOperation("agent_farmer_assignments by demo_tag", async () => {
      const matched = await countEq("agent_farmer_assignments", "demo_tag", demoTag);
      if (dryRun) return { matched, affected: 0, skipped: false };
      const affected = await deleteEq("agent_farmer_assignments", "demo_tag", demoTag);
      return { matched, affected, skipped: false };
    }),
    makeOperation("vehicles by transporter_id", async () => {
      const matched = await countIn("vehicles", "transporter_id", transporterIds);
      if (dryRun) return { matched, affected: 0, skipped: false };
      const affected = await deleteIn("vehicles", "transporter_id", transporterIds);
      return { matched, affected, skipped: false };
    }),
    makeOperation("buyers by demo_tag", async () => {
      const matched = await countEq("buyers", "demo_tag", demoTag);
      if (dryRun) return { matched, affected: 0, skipped: false };
      const affected = await deleteEq("buyers", "demo_tag", demoTag);
      return { matched, affected, skipped: false };
    }),
    makeOperation("transporters by demo_tag", async () => {
      const matched = await countEq("transporters", "demo_tag", demoTag);
      if (dryRun) return { matched, affected: 0, skipped: false };
      const affected = await deleteEq("transporters", "demo_tag", demoTag);
      return { matched, affected, skipped: false };
    }),
    makeOperation("admin_users by demo_tag", async () => {
      const matched = await countEq("admin_users", "demo_tag", demoTag);
      if (dryRun) return { matched, affected: 0, skipped: false };
      const affected = await deleteEq("admin_users", "demo_tag", demoTag);
      return { matched, affected, skipped: false };
    }),
    makeOperation("login_attempts by phone", async () => {
      const matched = await countIn("login_attempts", "phone", phones);
      if (dryRun) return { matched, affected: 0, skipped: false };
      const affected = await deleteIn("login_attempts", "phone", phones);
      return { matched, affected, skipped: false };
    }),
    makeOperation("user_profiles by user_id", async () => {
      const matched = await countIn("user_profiles", "user_id", userIds);
      if (dryRun) return { matched, affected: 0, skipped: false };
      const affected = await deleteIn("user_profiles", "user_id", userIds);
      return { matched, affected, skipped: false };
    }),
    makeOperation("user_roles by user_id", async () => {
      const matched = await countIn("user_roles", "user_id", userIds);
      if (dryRun) return { matched, affected: 0, skipped: false };
      const affected = await deleteIn("user_roles", "user_id", userIds);
      return { matched, affected, skipped: false };
    }),
    makeOperation("profiles by demo_tag", async () => {
      const matched = await countEq("profiles", "demo_tag", demoTag);
      if (dryRun) return { matched, affected: 0, skipped: false };
      const affected = await deleteEq("profiles", "demo_tag", demoTag);
      return { matched, affected, skipped: false };
    }),
  ];

  for (const operation of operations) {
    await runOperation(operation.label, operation.fn, report);
  }

  await runOperation(
    "auth.users delete by merged user IDs",
    async () => {
      const matched = userIds.length;
      if (dryRun) return { matched, affected: 0, skipped: false };
      let affected = 0;
      const errors = [];
      for (const userId of userIds) {
        const deleted = await admin.auth.admin.deleteUser(userId, false);
        if (deleted.error) {
          errors.push({ user_id: userId, error: deleted.error.message });
        } else {
          affected += 1;
        }
      }
      return {
        matched,
        affected,
        skipped: false,
        delete_errors: errors,
      };
    },
    report,
  );

  const matchedTotal = report.operations.reduce((sum, op) => sum + (op.matched ?? 0), 0);
  const affectedTotal = report.operations.reduce((sum, op) => sum + (op.affected ?? 0), 0);
  const skippedTotal = report.operations.filter((op) => op.skipped).length;
  report.summary = {
    matched_rows: matchedTotal,
    affected_rows: affectedTotal,
    skipped_operations: skippedTotal,
    operation_count: report.operations.length,
  };

  writeJsonFile(outputPath, report);
  console.log(`Rollback report written: ${outputPath}`);
  console.log(`demo_tag=${demoTag}`);
  console.log(`dry_run=${dryRun}`);
  console.log(`operations=${report.operations.length}`);
  console.log(`matched_rows=${matchedTotal}`);
  console.log(`affected_rows=${affectedTotal}`);
  if (skippedTotal > 0) {
    console.log(`skipped_operations=${skippedTotal}`);
  }
}

main().catch((err) => {
  console.error(`rollback-dummy-data failed: ${err.message}`);
  process.exit(1);
});
