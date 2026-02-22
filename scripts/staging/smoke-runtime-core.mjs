import {
  argValue,
  requireEnv,
  readJsonFile,
  writeJsonFile,
} from "./common.mjs";

function assertStageLikeUrl(url) {
  const host = new URL(url).hostname.toLowerCase();
  const ref = host.split(".")[0] ?? "";
  const allowedRefs = ["rmtkkzfzdmpjlqexrbme"];
  const allowUnsafe = process.env.ALLOW_NON_STAGING === "true";
  if (!allowUnsafe && !allowedRefs.includes(ref) && !/(staging|stage|dev|test|sandbox)/i.test(host)) {
    throw new Error(`Refusing to run on non-staging host: ${host}`);
  }
}

const url = requireEnv("SUPABASE_URL", "VITE_SUPABASE_URL").replace(/^"|"$/g, "");
const anonKey = requireEnv("SUPABASE_ANON_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY").replace(/^"|"$/g, "");
assertStageLikeUrl(url);

const ROLE_RPC = {
  farmer: { name: "farmer_dashboard_v1", payload: {} },
  agent: { name: "agent_dashboard_v1", payload: {} },
  logistics: { name: "logistics_dashboard_v1", payload: {} },
  buyer: { name: "buyer_dashboard_v1", payload: {} },
  admin: { name: "admin_dashboard_v1", payload: { p_days: 1 } },
};

async function loginByPhone(phone, password) {
  const response = await fetch(`${url}/functions/v1/login-by-phone`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password }),
  });
  const body = await response.json().catch(() => null);
  return { response, body };
}

async function callRpc(name, payload, accessToken) {
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload ?? {}),
  });
  const body = await response.json().catch(() => null);
  return { response, body };
}

async function callDistrictNeighbors(accessToken, district) {
  const endpoint = new URL(`${url}/rest/v1/district_neighbors`);
  endpoint.searchParams.set("select", "neighbor_district");
  endpoint.searchParams.set("district", `eq.${district}`);
  endpoint.searchParams.set("limit", "5");
  const response = await fetch(endpoint.toString(), {
    method: "GET",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const body = await response.json().catch(() => null);
  return { response, body };
}

async function callBuyerOrders(accessToken) {
  return callRpc("list_orders_compact_v1", { p_limit: 24, p_cursor: null }, accessToken);
}

async function callWeather(accessToken) {
  const response = await fetch(`${url}/functions/v1/get-weather`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({}),
  });
  const body = await response.json().catch(() => null);
  return { response, body };
}

async function main() {
  const usersFile = argValue("--users-file");
  if (!usersFile) throw new Error("Missing required --users-file");

  const defaultPassword = argValue("--password") ?? "Dummy@12345";
  const usersArtifact = readJsonFile(usersFile);
  const users = Array.isArray(usersArtifact?.users) ? usersArtifact.users : [];
  const roleUsers = ["farmer", "buyer", "agent", "logistics", "admin"]
    .map((role) => ({ role, user: users.find((u) => u.role === role) }))
    .filter((x) => x.user);

  if (roleUsers.length < 4) {
    throw new Error(`Expected staged users in ${usersFile}; found ${roleUsers.length}`);
  }

  const checks = [];
  const tokensByRole = {};

  for (const { role, user } of roleUsers) {
    const login = await loginByPhone(user.phone, user.password ?? defaultPassword);
    const accessToken = login.body?.access_token ?? null;
    tokensByRole[role] = accessToken;

    checks.push({
      name: `${role}:login-by-phone`,
      ok: login.response.ok,
      status: login.response.status,
      note: login.response.ok ? null : (login.body?.message ?? login.body?.error ?? "login_failed"),
    });

    if (!login.response.ok || !accessToken) {
      continue;
    }

    const rpcDef = ROLE_RPC[role];
    if (rpcDef) {
      const rpc = await callRpc(rpcDef.name, rpcDef.payload, accessToken);
      checks.push({
        name: `${role}:${rpcDef.name}`,
        ok: rpc.response.ok,
        status: rpc.response.status,
        note: rpc.response.ok ? null : (rpc.body?.message ?? rpc.body?.hint ?? rpc.body?.error ?? "rpc_failed"),
      });
    }
  }

  if (tokensByRole.farmer) {
    const farmerUser = users.find((u) => u.role === "farmer");
    const district = farmerUser?.profile_metadata?.district || "Mysuru";
    const neighbors = await callDistrictNeighbors(tokensByRole.farmer, district);
    checks.push({
      name: `farmer:district_neighbors`,
      ok: neighbors.response.ok,
      status: neighbors.response.status,
      note: neighbors.response.ok ? `rows=${Array.isArray(neighbors.body) ? neighbors.body.length : 0}` : (neighbors.body?.message ?? neighbors.body?.error ?? "district_neighbors_failed"),
    });

    const weather = await callWeather(tokensByRole.farmer);
    const weatherOk = weather.response.ok && (weather.body?.data || weather.body?.message);
    checks.push({
      name: "farmer:get-weather",
      ok: Boolean(weatherOk),
      status: weather.response.status,
      note: weather.response.ok
        ? (weather.body?.data ? `cached=${Boolean(weather.body?.cached)}` : (weather.body?.message ?? "no_data"))
        : (weather.body?.message ?? weather.body?.error ?? "weather_failed"),
    });
  }

  if (tokensByRole.buyer) {
    const orders = await callBuyerOrders(tokensByRole.buyer);
    const payloadOk = orders.response.ok && Array.isArray(orders.body?.items) && Object.prototype.hasOwnProperty.call(orders.body, "next_cursor");
    checks.push({
      name: "buyer:list_orders_compact_v1",
      ok: Boolean(payloadOk),
      status: orders.response.status,
      note: orders.response.ok
        ? `items=${Array.isArray(orders.body?.items) ? orders.body.items.length : "?"}`
        : (orders.body?.message ?? orders.body?.hint ?? orders.body?.error ?? "buyer_orders_failed"),
    });
  }

  const failed = checks.filter((c) => !c.ok);
  const artifact = {
    kind: "staging_smoke_runtime_core",
    executed_at: new Date().toISOString(),
    checks,
    summary: {
      total: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
    },
  };

  const outputPath = argValue("--output") ?? "artifacts/staging/smoke-runtime-core.json";
  writeJsonFile(outputPath, artifact);

  if (failed.length > 0) {
    throw new Error(`Core runtime smoke failed (${failed.length} checks)`);
  }

  console.log(`Smoke runtime core artifact written: ${outputPath}`);
}

main().catch((err) => {
  console.error(`smoke-runtime-core failed: ${err.message}`);
  process.exit(1);
});
