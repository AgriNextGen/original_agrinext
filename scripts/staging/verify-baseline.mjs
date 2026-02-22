import {
  createAdminClient,
  getSupabaseConfig,
  writeJsonFile,
  argValue,
  fetchWithAuth,
  assertStagingEnvironment,
} from "./common.mjs";

const admin = createAdminClient();
const { url, serviceRoleKey } = getSupabaseConfig();
assertStagingEnvironment();

const publicTables = [
  "profiles",
  "user_roles",
  "user_profiles",
  "farmlands",
  "crops",
  "listings",
  "market_orders",
  "transport_requests",
  "trips",
  "transport_status_events",
  "buyers",
  "transporters",
  "vehicles",
  "agent_farmer_assignments",
  "agent_tasks",
  "agent_visits",
  "agent_voice_notes",
  "admin_users",
  "notifications",
  "support_tickets",
  "files",
  "disputes",
  "job_queue",
  "job_runs",
];

const crossSchemaTables = [
  "secure.kyc_records",
  "secure.payment_events",
  "secure.webhook_events",
  "secure.refund_requests",
  "secure.payout_jobs",
  "audit.audit_logs",
  "audit.security_events",
  "audit.workflow_events",
  "analytics.system_metrics_hourly",
];

const edgeFunctions = [
  "signup-by-phone",
  "login-by-phone",
  "admin-enqueue",
  "job-worker",
  "finance-cron",
  "payment-webhook",
  "storage-sign-upload-v1",
];

async function checkTable(tableName) {
  const [schema, table] = tableName.includes(".") ? tableName.split(".") : ["public", tableName];
  const endpoint = `${url}/rest/v1/${table}?select=*&limit=1`;
  const headers = {
    Accept: "application/json",
    "Accept-Profile": schema,
    "Content-Profile": schema,
  };
  const { response, body } = await fetchWithAuth(endpoint, serviceRoleKey, { method: "GET", headers });
  return {
    schema,
    table,
    ok: response.ok,
    status: response.status,
    error: response.ok ? null : body,
  };
}

async function checkEdgeFunction(name) {
  const endpoint = `${url}/functions/v1/${name}`;
  const response = await fetch(endpoint, { method: "OPTIONS" });
  return {
    function: name,
    ok: response.status >= 200 && response.status < 500,
    status: response.status,
  };
}

async function main() {
  const startedAt = new Date().toISOString();
  const outputPath =
    argValue("--output") ??
    `artifacts/staging/baseline-${startedAt.replaceAll(":", "").replaceAll("-", "").slice(0, 15)}.json`;

  const tableChecks = [];
  for (const table of publicTables) {
    tableChecks.push(await checkTable(table));
  }

  const crossSchemaChecks = [];
  for (const table of crossSchemaTables) {
    crossSchemaChecks.push(await checkTable(table));
  }

  const edgeChecks = [];
  for (const fn of edgeFunctions) {
    edgeChecks.push(await checkEdgeFunction(fn));
  }

  const authAdminCheck = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
  const authAdminOk = !authAdminCheck.error;

  const storageBucketCheck = await admin.storage.listBuckets();
  const storageOk = !storageBucketCheck.error;
  const bucketNames = (storageBucketCheck.data ?? []).map((item) => item.name).sort();

  const report = {
    checked_at: startedAt,
    project_url: url,
    connectivity: {
      rest_api: tableChecks.some((item) => item.ok),
      auth_admin_api: authAdminOk,
      storage_api: storageOk,
    },
    tables: {
      public: tableChecks,
      non_public: crossSchemaChecks,
    },
    edge_functions: edgeChecks,
    storage: {
      ok: storageOk,
      buckets: bucketNames,
      error: storageBucketCheck.error?.message ?? null,
    },
    unknowns: [
      "RLS enabled flags per table (requires SQL catalog access)",
      "Policy definitions and trigger bodies in live DB (requires SQL catalog access)",
      "Actual deployed function source hash/version (requires CLI/MCP or management API)",
    ],
  };

  writeJsonFile(outputPath, report);

  const publicOk = tableChecks.filter((item) => item.ok).length;
  const publicTotal = tableChecks.length;
  const crossOk = crossSchemaChecks.filter((item) => item.ok).length;
  const crossTotal = crossSchemaChecks.length;
  const edgeOk = edgeChecks.filter((item) => item.ok).length;
  const edgeTotal = edgeChecks.length;

  console.log(`Baseline written: ${outputPath}`);
  console.log(`Public table checks: ${publicOk}/${publicTotal}`);
  console.log(`Non-public table checks: ${crossOk}/${crossTotal}`);
  console.log(`Edge function checks: ${edgeOk}/${edgeTotal}`);
  console.log(`Storage buckets visible: ${bucketNames.length}`);
  if (!authAdminOk) {
    throw new Error(`Auth admin check failed: ${authAdminCheck.error?.message ?? "unknown error"}`);
  }
}

main().catch((err) => {
  console.error(`verify-baseline failed: ${err.message}`);
  process.exit(1);
});
