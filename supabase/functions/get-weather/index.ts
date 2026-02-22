import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  getRequestIdFromHeaders,
  makeResponseWithRequestId,
  logStructured,
} from "../_shared/request_context.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GEMINI_API_KEY = Deno.env.get("gemini_api_key") ?? Deno.env.get("GEMINI_API_KEY") ?? "";
const WEATHER_SUMMARY_PROVIDER = (Deno.env.get("WEATHER_SUMMARY_PROVIDER") ?? "rule").toLowerCase();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FRESH_TTL_MINUTES = 30;
const STALE_TTL_MINUTES = 120;

type WeatherIcon = "sun" | "cloud" | "rain" | "drizzle" | "snow" | "thunderstorm";

type WeatherData = {
  temp_c: number;
  humidity: number;
  wind_kmh: number;
  description: string;
  icon: WeatherIcon;
  forecast_short: string;
  fetched_at: string;
  location: string;
};

type WeatherResponseBody = {
  data?: WeatherData | null;
  cached: boolean;
  stale?: boolean;
  cache_age_minutes?: number;
  message?: string;
};

type ProfileRow = {
  id: string;
  village: string | null;
  district: string | null;
  pincode: string | null;
  location: string | null;
};

type GeocodeResult = {
  name?: string;
  latitude?: number;
  longitude?: number;
  country?: string;
  admin1?: string;
  admin2?: string;
};

type CacheEnvelope = {
  version: number;
  provider: string;
  summary_provider?: string;
  payload: WeatherData;
};

function jsonHeaders() {
  return { ...corsHeaders, "Content-Type": "application/json" };
}

function errorBody(message: string): WeatherResponseBody {
  return { cached: false, data: null, message };
}

function toNumber(value: unknown, fallback = 0): number {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function clampInt(value: number) {
  return Math.round(Number.isFinite(value) ? value : 0);
}

function normalizeLocationToken(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

function locationKeyFromQuery(query: string) {
  const normalized = normalizeLocationToken(query);
  return normalized || "unknown";
}

function parseBearer(req: Request): string | null {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") return null;
  return token.trim();
}

async function authUserFromToken(token: string): Promise<{ id: string } | null> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
    },
  });
  if (!res.ok) return null;
  const body = await res.json().catch(() => null);
  if (!body?.id) return null;
  return { id: String(body.id) };
}

function buildLocationCandidates(profile: ProfileRow): Array<{ query: string; label: string }> {
  const out: Array<{ query: string; label: string }> = [];
  const seen = new Set<string>();

  const push = (query: string | null | undefined, label: string) => {
    const trimmed = String(query ?? "").trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ query: trimmed, label });
  };

  const village = profile.village?.trim();
  const district = profile.district?.trim();
  const pincode = profile.pincode?.trim();
  const location = profile.location?.trim();

  if (pincode) {
    push(`${pincode}, India`, "pincode");
    if (district) push(`${pincode}, ${district}, Karnataka, India`, "pincode+district");
  }
  if (village && district) push(`${village}, ${district}, Karnataka, India`, "village+district");
  if (district) push(`${district}, Karnataka, India`, "district");
  if (location) {
    const locWithCountry = /india/i.test(location) ? location : `${location}, India`;
    push(locWithCountry, "location");
  }

  return out;
}

async function geocodeSearch(query: string, withCountryFilter: boolean): Promise<GeocodeResult | null> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", query);
  url.searchParams.set("count", "3");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");
  if (withCountryFilter) {
    url.searchParams.set("countryCode", "IN");
  }

  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) return null;
  const body = await res.json().catch(() => null);
  const results = Array.isArray(body?.results) ? body.results as GeocodeResult[] : [];
  return results.find((row) => Number.isFinite(row.latitude) && Number.isFinite(row.longitude)) ?? null;
}

async function geocode(query: string): Promise<GeocodeResult | null> {
  const variants = Array.from(new Set([
    query.trim(),
    query.split(",")[0]?.trim() ?? "",
  ].filter(Boolean)));

  for (const variant of variants) {
    const strict = await geocodeSearch(variant, true);
    if (strict) return strict;
    const relaxed = await geocodeSearch(variant, false);
    if (relaxed) return relaxed;
  }

  return null;
}

function wmoToWeather(code: number): { icon: WeatherIcon; description: string } {
  if (code === 0) return { icon: "sun", description: "Clear sky" };
  if ([1, 2].includes(code)) return { icon: "cloud", description: "Partly cloudy" };
  if ([3, 45, 48].includes(code)) return { icon: "cloud", description: "Cloudy" };
  if ([51, 53, 55, 56, 57].includes(code)) return { icon: "drizzle", description: "Light drizzle" };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { icon: "rain", description: "Rain" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { icon: "snow", description: "Snow" };
  if ([95, 96, 99].includes(code)) return { icon: "thunderstorm", description: "Thunderstorm" };
  return { icon: "cloud", description: "Variable weather" };
}

function buildRuleSummary(params: {
  description: string;
  tempC: number;
  maxTemp: number | null;
  minTemp: number | null;
  rainChance: number | null;
  windKmh: number;
}): string {
  const parts: string[] = [];
  parts.push(params.description);

  if (params.maxTemp != null && params.minTemp != null) {
    parts.push(`High ${clampInt(params.maxTemp)}C / Low ${clampInt(params.minTemp)}C`);
  } else {
    parts.push(`Around ${clampInt(params.tempC)}C`);
  }

  if (params.rainChance != null) {
    parts.push(`Rain chance ${clampInt(params.rainChance)}%`);
  }

  if (params.windKmh > 20) {
    parts.push(`Breezy (${clampInt(params.windKmh)} km/h)`);
  }

  return parts.join(". ");
}

async function maybeGeminiSummary(input: {
  location: string;
  description: string;
  tempC: number;
  humidity: number;
  windKmh: number;
  maxTemp: number | null;
  minTemp: number | null;
  rainChance: number | null;
}): Promise<string | null> {
  if (WEATHER_SUMMARY_PROVIDER !== "gemini") return null;
  if (!GEMINI_API_KEY) return null;

  const prompt =
    `Create one short farmer-friendly weather note (max 22 words) for ${input.location}. ` +
    `Current: ${input.description}, ${clampInt(input.tempC)}C, humidity ${clampInt(input.humidity)}%, wind ${clampInt(input.windKmh)} km/h.` +
    ` Day range: ${input.minTemp == null ? "NA" : clampInt(input.minTemp)}-${input.maxTemp == null ? "NA" : clampInt(input.maxTemp)}C.` +
    ` Rain chance: ${input.rainChance == null ? "NA" : clampInt(input.rainChance)}%.` +
    ` Return plain text only.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 60 },
        }),
      },
    );
    if (!res.ok) return null;
    const body = await res.json().catch(() => null);
    const text = body?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part?.text ?? "")
      .join(" ")
      .trim();
    return text ? String(text).slice(0, 220) : null;
  } catch {
    return null;
  }
}

function formatResolvedLocation(geo: GeocodeResult, fallback: string): string {
  const parts = [geo.name, geo.admin2, geo.admin1, geo.country]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean);
  return parts.length > 0 ? Array.from(new Set(parts)).join(", ") : fallback;
}

function minutesBetween(fromIso: string, to = new Date()) {
  const from = new Date(fromIso);
  if (Number.isNaN(from.getTime())) return null;
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 60000));
}

async function readCache(admin: ReturnType<typeof createClient>, cacheKey: string) {
  const { data, error } = await admin
    .from("web_cache")
    .select("cache_key,data,fetched_at")
    .eq("cache_key", cacheKey)
    .maybeSingle();
  if (error || !data) return null;

  const envelope = data.data as CacheEnvelope | null;
  if (!envelope || typeof envelope !== "object") return null;
  if (!envelope.payload || typeof envelope.payload !== "object") return null;

  return {
    payload: envelope.payload as WeatherData,
    fetched_at: data.fetched_at,
    provider: envelope.provider ?? "unknown",
    summary_provider: envelope.summary_provider ?? "rule",
  };
}

async function writeCache(
  admin: ReturnType<typeof createClient>,
  cacheKey: string,
  locationKey: string,
  payload: WeatherData,
  summaryProvider: string,
) {
  const fetchedAt = payload.fetched_at || new Date().toISOString();
  const envelope: CacheEnvelope = {
    version: 1,
    provider: "open-meteo",
    summary_provider: summaryProvider,
    payload,
  };
  await admin.from("web_cache").upsert(
    {
      cache_key: cacheKey,
      topic: "weather",
      location_key: locationKey,
      crop_key: null,
      data: envelope,
      fetched_at: fetchedAt,
    },
    { onConflict: "cache_key" },
  );
}

async function fetchOpenMeteoWeather(geo: GeocodeResult, fallbackLocation: string) {
  const lat = geo.latitude;
  const lon = geo.longitude;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error("Invalid geocode coordinates");
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code");
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_probability_max");
  url.searchParams.set("forecast_days", "1");
  url.searchParams.set("timezone", "auto");

  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) {
    throw new Error(`Open-Meteo weather error ${res.status}`);
  }
  const body = await res.json();

  const current = body?.current ?? {};
  const daily = body?.daily ?? {};
  const weatherCode = toNumber(current?.weather_code, 0);
  const mapped = wmoToWeather(weatherCode);

  const tempC = toNumber(current?.temperature_2m, 0);
  const humidity = toNumber(current?.relative_humidity_2m, 0);
  const windKmh = toNumber(current?.wind_speed_10m, 0);
  const maxTemp = Array.isArray(daily?.temperature_2m_max) ? toNumber(daily.temperature_2m_max[0], NaN) : NaN;
  const minTemp = Array.isArray(daily?.temperature_2m_min) ? toNumber(daily.temperature_2m_min[0], NaN) : NaN;
  const rainChance = Array.isArray(daily?.precipitation_probability_max)
    ? toNumber(daily.precipitation_probability_max[0], NaN)
    : NaN;

  const location = formatResolvedLocation(geo, fallbackLocation);
  const ruleSummary = buildRuleSummary({
    description: mapped.description,
    tempC,
    maxTemp: Number.isFinite(maxTemp) ? maxTemp : null,
    minTemp: Number.isFinite(minTemp) ? minTemp : null,
    rainChance: Number.isFinite(rainChance) ? rainChance : null,
    windKmh,
  });
  const geminiSummary = await maybeGeminiSummary({
    location,
    description: mapped.description,
    tempC,
    humidity,
    windKmh,
    maxTemp: Number.isFinite(maxTemp) ? maxTemp : null,
    minTemp: Number.isFinite(minTemp) ? minTemp : null,
    rainChance: Number.isFinite(rainChance) ? rainChance : null,
  });

  const nowIso = new Date().toISOString();
  const payload: WeatherData = {
    temp_c: clampInt(tempC),
    humidity: clampInt(humidity),
    wind_kmh: clampInt(windKmh),
    description: mapped.description,
    icon: mapped.icon,
    forecast_short: geminiSummary || ruleSummary,
    fetched_at: nowIso,
    location,
  };

  return {
    payload,
    summaryProvider: geminiSummary ? "gemini" : "rule",
  };
}

function respond(reqId: string, status: number, body: WeatherResponseBody) {
  return makeResponseWithRequestId(JSON.stringify(body), reqId, {
    status,
    headers: jsonHeaders(),
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const reqId = getRequestIdFromHeaders(req.headers);
  const startedAt = Date.now();

  if (req.method !== "POST") {
    return respond(reqId, 405, errorBody("Method not allowed"));
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return respond(reqId, 500, errorBody("Missing Supabase runtime configuration"));
  }

  const token = parseBearer(req);
  if (!token) {
    return respond(reqId, 401, errorBody("Unauthorized"));
  }

  const user = await authUserFromToken(token);
  if (!user) {
    return respond(reqId, 401, errorBody("Unauthorized"));
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id,village,district,pincode,location")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      logStructured({
        request_id: reqId,
        endpoint: "get-weather",
        status: "profile_error",
        user_id: user.id,
        error: profileError.message,
      });
      return respond(reqId, 500, errorBody("Unable to read profile"));
    }

    const safeProfile = profile as ProfileRow | null;
    if (!safeProfile) {
      return respond(reqId, 200, {
        cached: false,
        data: null,
        message: "Weather unavailable: profile not found",
      });
    }

    const candidates = buildLocationCandidates(safeProfile);
    if (candidates.length === 0) {
      return respond(reqId, 200, {
        cached: false,
        data: null,
        message: "Weather unavailable: set district or pincode",
      });
    }

    const primary = candidates[0];
    const locationKey = locationKeyFromQuery(primary.query);
    const cacheKey = `weather:${locationKey}`;
    const cached = await readCache(admin, cacheKey);
    const cachedAgeMinutes = cached ? minutesBetween(cached.fetched_at) : null;

    if (cached && cachedAgeMinutes != null && cachedAgeMinutes <= FRESH_TTL_MINUTES) {
      logStructured({
        request_id: reqId,
        endpoint: "get-weather",
        status: "cache_hit",
        user_id: user.id,
        cache_key: cacheKey,
        age_minutes: cachedAgeMinutes,
      });
      return respond(reqId, 200, {
        data: cached.payload,
        cached: true,
        stale: false,
        cache_age_minutes: cachedAgeMinutes,
      });
    }

    let geo: GeocodeResult | null = null;
    let geoCandidate: { query: string; label: string } | null = null;
    for (const candidate of candidates) {
      geo = await geocode(candidate.query);
      if (geo) {
        geoCandidate = candidate;
        break;
      }
    }

    if (!geo || !geoCandidate) {
      if (cached && cachedAgeMinutes != null && cachedAgeMinutes <= STALE_TTL_MINUTES) {
        return respond(reqId, 200, {
          data: cached.payload,
          cached: true,
          stale: true,
          cache_age_minutes: cachedAgeMinutes,
          message: "Serving cached weather; location lookup failed",
        });
      }
      return respond(reqId, 200, {
        cached: false,
        data: null,
        message: "Weather unavailable: location could not be resolved",
      });
    }

    try {
      const fetched = await fetchOpenMeteoWeather(geo, geoCandidate.query);
      await writeCache(admin, cacheKey, locationKey, fetched.payload, fetched.summaryProvider);

      const durationMs = Date.now() - startedAt;
      logStructured({
        request_id: reqId,
        endpoint: "get-weather",
        status: "success",
        user_id: user.id,
        cache: false,
        provider: "open-meteo",
        summary_provider: fetched.summaryProvider,
        duration_ms: durationMs,
        location_source: geoCandidate.label,
      });

      return respond(reqId, 200, {
        data: fetched.payload,
        cached: false,
        stale: false,
      });
    } catch (upstreamErr) {
      const durationMs = Date.now() - startedAt;
      if (cached && cachedAgeMinutes != null && cachedAgeMinutes <= STALE_TTL_MINUTES) {
        logStructured({
          request_id: reqId,
          endpoint: "get-weather",
          status: "stale_cache_fallback",
          user_id: user.id,
          error: upstreamErr instanceof Error ? upstreamErr.message : String(upstreamErr),
          age_minutes: cachedAgeMinutes,
          duration_ms: durationMs,
        });
        return respond(reqId, 200, {
          data: cached.payload,
          cached: true,
          stale: true,
          cache_age_minutes: cachedAgeMinutes,
          message: "Serving cached weather while provider is unavailable",
        });
      }

      logStructured({
        request_id: reqId,
        endpoint: "get-weather",
        status: "upstream_error",
        user_id: user.id,
        error: upstreamErr instanceof Error ? upstreamErr.message : String(upstreamErr),
        duration_ms: durationMs,
      });

      return respond(reqId, 502, errorBody("Weather provider unavailable"));
    }
  } catch (err) {
    logStructured({
      request_id: reqId,
      endpoint: "get-weather",
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    });
    return respond(reqId, 500, errorBody("Internal error"));
  }
});
