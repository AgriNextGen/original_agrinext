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

function resolveUser(usersArtifact, roleHint, phoneHint) {
  const users = Array.isArray(usersArtifact?.users) ? usersArtifact.users : [];
  if (phoneHint) {
    const phone = normalizePhone(phoneHint);
    return users.find((u) => normalizePhone(u.phone) === phone) ?? null;
  }
  return users.find((u) => u.role === (roleHint || "farmer")) ?? null;
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

async function invokeWeather(accessToken) {
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

function validateWeatherBody(body) {
  if (!body || typeof body !== "object") return { ok: false, reason: "non_object_body" };
  if (typeof body.cached !== "boolean") return { ok: false, reason: "missing_cached" };
  if (!body.data) {
    return { ok: false, reason: `no_data:${body.message ?? "unknown"}` };
  }

  const data = body.data;
  const required = ["temp_c", "humidity", "wind_kmh", "description", "icon", "forecast_short", "fetched_at", "location"];
  for (const key of required) {
    if (!(key in data)) return { ok: false, reason: `missing_data_field:${key}` };
  }
  return { ok: true, reason: null };
}

async function main() {
  const usersFile = argValue("--users-file");
  if (!usersFile) {
    throw new Error("Missing required --users-file");
  }

  const usersArtifact = readJsonFile(usersFile);
  const password = argValue("--password") ?? "Dummy@12345";
  const role = argValue("--role") ?? "farmer";
  const user = resolveUser(usersArtifact, role, argValue("--phone"));
  if (!user) {
    throw new Error(`Unable to resolve user from ${usersFile}`);
  }

  const login = await loginByPhone(user.phone, user.password ?? password);
  const accessToken = login.body?.access_token;
  let weather = { response: { status: null, ok: false }, body: null };
  if (login.response.ok && accessToken) {
    weather = await invokeWeather(accessToken);
  }

  const weatherValidation = weather.response.ok ? validateWeatherBody(weather.body) : { ok: false, reason: "weather_http_error" };
  const artifact = {
    kind: "staging_smoke_weather",
    executed_at: new Date().toISOString(),
    user: {
      role: user.role,
      phone: user.phone,
    },
    login: {
      ok: login.response.ok,
      status: login.response.status,
    },
    weather: {
      ok: weather.response.ok && weatherValidation.ok,
      status: weather.response.status,
      validation_reason: weatherValidation.reason,
      cached: weather.body?.cached ?? null,
      stale: weather.body?.stale ?? null,
      message: weather.body?.message ?? null,
      location: weather.body?.data?.location ?? null,
      fetched_at: weather.body?.data?.fetched_at ?? null,
    },
  };

  const outputPath = argValue("--output") ?? `artifacts/staging/smoke-weather-${user.role}.json`;
  writeJsonFile(outputPath, artifact);

  if (!artifact.login.ok) {
    throw new Error(`Login failed with status ${artifact.login.status}`);
  }
  if (!artifact.weather.ok) {
    throw new Error(`Weather smoke failed (${artifact.weather.status}): ${artifact.weather.validation_reason}`);
  }

  console.log(`Smoke weather artifact written: ${outputPath}`);
}

main().catch((err) => {
  console.error(`smoke-weather failed: ${err.message}`);
  process.exit(1);
});
