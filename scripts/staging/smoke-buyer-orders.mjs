import {
  argValue,
  normalizePhone,
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

function resolveBuyer(usersArtifact, phoneHint) {
  const users = Array.isArray(usersArtifact?.users) ? usersArtifact.users : [];
  if (phoneHint) {
    const phone = normalizePhone(phoneHint);
    return users.find((u) => normalizePhone(u.phone) === phone) ?? null;
  }
  return users.find((u) => u.role === "buyer") ?? null;
}

async function loginByPhone(phone, password) {
  const response = await fetch(`${url}/functions/v1/login-by-phone`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password }),
  });
  const body = await response.json().catch(() => null);
  return { response, body };
}

async function callOrders(accessToken) {
  const response = await fetch(`${url}/rest/v1/rpc/list_orders_compact_v1`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ p_limit: 24, p_cursor: null }),
  });
  const body = await response.json().catch(() => null);
  return { response, body };
}

function validateOrdersPayload(body) {
  if (!body || typeof body !== "object") return { ok: false, reason: "non_object_body" };
  if (!Array.isArray(body.items)) return { ok: false, reason: "missing_items_array" };
  if (!Object.prototype.hasOwnProperty.call(body, "next_cursor")) return { ok: false, reason: "missing_next_cursor" };
  return { ok: true, reason: null };
}

async function main() {
  const usersFile = argValue("--users-file");
  if (!usersFile) throw new Error("Missing required --users-file");

  const password = argValue("--password") ?? "Dummy@12345";
  const usersArtifact = readJsonFile(usersFile);
  const buyer = resolveBuyer(usersArtifact, argValue("--phone"));
  if (!buyer) throw new Error(`Buyer user not found in ${usersFile}`);

  const login = await loginByPhone(buyer.phone, buyer.password ?? password);
  const accessToken = login.body?.access_token;

  let orders = { response: { status: null, ok: false }, body: null };
  if (login.response.ok && accessToken) {
    orders = await callOrders(accessToken);
  }

  const validation = orders.response.ok ? validateOrdersPayload(orders.body) : { ok: false, reason: "orders_http_error" };
  const artifact = {
    kind: "staging_smoke_buyer_orders",
    executed_at: new Date().toISOString(),
    user: { role: "buyer", phone: buyer.phone },
    login: { ok: login.response.ok, status: login.response.status },
    rpc: {
      name: "list_orders_compact_v1",
      ok: orders.response.ok && validation.ok,
      status: orders.response.status,
      validation_reason: validation.reason,
      items_count: Array.isArray(orders.body?.items) ? orders.body.items.length : null,
      next_cursor_present: orders.body?.next_cursor != null,
      error: orders.body?.message ?? orders.body?.hint ?? orders.body?.error ?? null,
    },
  };

  const outputPath = argValue("--output") ?? "artifacts/staging/smoke-buyer-orders.json";
  writeJsonFile(outputPath, artifact);

  if (!artifact.login.ok) {
    throw new Error(`Login failed with status ${artifact.login.status}`);
  }
  if (!artifact.rpc.ok) {
    throw new Error(`Buyer orders RPC failed (${artifact.rpc.status}): ${artifact.rpc.validation_reason || artifact.rpc.error}`);
  }

  console.log(`Smoke buyer orders artifact written: ${outputPath}`);
}

main().catch((err) => {
  console.error(`smoke-buyer-orders failed: ${err.message}`);
  process.exit(1);
});
