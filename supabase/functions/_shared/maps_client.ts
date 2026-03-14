/**
 * Server-side Google Maps API client for AgriNext Edge Functions.
 *
 * Provides geocoding (with DB cache), directions, and nearby search.
 * All calls use GOOGLE_MAPS_API_KEY from environment — never exposed to frontend.
 *
 * Usage:
 *   import { geocodeAddress, getDirections, searchNearby } from "../_shared/maps_client.ts";
 */
import { getRequiredEnv } from "./env.ts";
import { logStructured } from "./request_context.ts";

// ── Types ──────────────────────────────────────────────────────────────

export type GeocodingResult = {
  lat: number;
  lng: number;
  formatted_address: string;
  place_id: string;
  cached: boolean;
};

export type DirectionsResult = {
  distance_meters: number;
  distance_text: string;
  duration_seconds: number;
  duration_text: string;
  polyline: string;
  steps: DirectionStep[];
};

export type DirectionStep = {
  instruction: string;
  distance_text: string;
  duration_text: string;
};

export type NearbyPlace = {
  name: string;
  place_id: string;
  lat: number;
  lng: number;
  vicinity: string;
  types: string[];
  rating: number | null;
  open_now: boolean | null;
};

export type NearbySearchResult = {
  places: NearbyPlace[];
  total: number;
};

export type LatLng = { lat: number; lng: number };

// ── Config ─────────────────────────────────────────────────────────────

const MAPS_TIMEOUT_MS = 10_000;
const GEOCODING_BASE = "https://maps.googleapis.com/maps/api/geocode/json";
const DIRECTIONS_BASE = "https://maps.googleapis.com/maps/api/directions/json";
const NEARBY_BASE = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";

function getMapsApiKey(): string {
  return getRequiredEnv("GOOGLE_MAPS_API_KEY");
}

// ── Fetch with retry + timeout ─────────────────────────────────────────

async function fetchWithRetry(url: string, requestId?: string): Promise<unknown> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort("timeout"), MAPS_TIMEOUT_MS);

    try {
      const res = await fetch(url, { signal: controller.signal });
      const body = await res.json();

      if (!res.ok) {
        throw new Error(`Maps API HTTP ${res.status}: ${JSON.stringify(body).slice(0, 200)}`);
      }

      return body;
    } catch (error) {
      lastError = error as Error;
      const msg = String(lastError?.message ?? "");

      if (attempt === 0 && (msg.includes("timeout") || msg.includes("5"))) {
        logStructured({
          event: "maps_api_retry",
          attempt: attempt + 1,
          url: url.replace(/key=[^&]+/, "key=***"),
          error: msg,
          request_id: requestId,
        });
        continue;
      }
      break;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError ?? new Error("Maps API request failed");
}

// ── Geocoding Cache helpers ────────────────────────────────────────────

function hashQuery(query: string): string {
  const normalized = query.trim().toLowerCase().replace(/\s+/g, " ");
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `geo_${Math.abs(hash).toString(36)}`;
}

async function getCachedGeocode(
  supabaseUrl: string,
  serviceRoleKey: string,
  queryHash: string,
): Promise<GeocodingResult | null> {
  if (!supabaseUrl || !serviceRoleKey) return null;

  try {
    const url = new URL(`${supabaseUrl}/rest/v1/geocoding_cache`);
    url.searchParams.set("select", "lat,lng,formatted_address,place_id");
    url.searchParams.set("query_hash", `eq.${queryHash}`);
    url.searchParams.set("expires_at", `gt.${new Date().toISOString()}`);
    url.searchParams.set("limit", "1");

    const res = await fetch(url.toString(), {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    if (!res.ok) return null;
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return null;

    const row = rows[0];
    return {
      lat: Number(row.lat),
      lng: Number(row.lng),
      formatted_address: String(row.formatted_address ?? ""),
      place_id: String(row.place_id ?? ""),
      cached: true,
    };
  } catch {
    return null;
  }
}

async function setCachedGeocode(
  supabaseUrl: string,
  serviceRoleKey: string,
  params: {
    queryHash: string;
    queryText: string;
    lat: number;
    lng: number;
    formatted_address: string;
    place_id: string;
    raw_response: unknown;
  },
): Promise<void> {
  if (!supabaseUrl || !serviceRoleKey) return;

  try {
    await fetch(`${supabaseUrl}/rest/v1/geocoding_cache`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        query_hash: params.queryHash,
        query_text: params.queryText,
        lat: params.lat,
        lng: params.lng,
        formatted_address: params.formatted_address,
        place_id: params.place_id,
        raw_response: params.raw_response,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    });
  } catch {
    // Cache write failure is non-critical
  }
}

// ── Geocoding ──────────────────────────────────────────────────────────

export async function geocodeAddress(
  address: string,
  options?: { requestId?: string },
): Promise<GeocodingResult> {
  const trimmed = address.trim();
  if (!trimmed) {
    throw Object.assign(new Error("address is required"), { status: 400, code: "invalid_input" });
  }

  const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? "").trim();
  const serviceRoleKey = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
  const queryHash = hashQuery(trimmed);

  const cached = await getCachedGeocode(supabaseUrl, serviceRoleKey, queryHash);
  if (cached) {
    logStructured({
      event: "geocode_cache_hit",
      query_hash: queryHash,
      request_id: options?.requestId,
    });
    return cached;
  }

  const apiKey = getMapsApiKey();
  const url = `${GEOCODING_BASE}?address=${encodeURIComponent(trimmed)}&key=${encodeURIComponent(apiKey)}`;
  const body = (await fetchWithRetry(url, options?.requestId)) as Record<string, unknown>;

  const status = String(body.status ?? "");
  if (status !== "OK") {
    throw new Error(`Geocoding failed: ${status} — ${JSON.stringify(body.error_message ?? "")}`);
  }

  const results = body.results as Array<Record<string, unknown>>;
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error("Geocoding returned no results");
  }

  const first = results[0];
  const geometry = first.geometry as Record<string, unknown> | undefined;
  const location = geometry?.location as Record<string, unknown> | undefined;

  const result: GeocodingResult = {
    lat: Number(location?.lat ?? 0),
    lng: Number(location?.lng ?? 0),
    formatted_address: String(first.formatted_address ?? trimmed),
    place_id: String(first.place_id ?? ""),
    cached: false,
  };

  await setCachedGeocode(supabaseUrl, serviceRoleKey, {
    queryHash,
    queryText: trimmed,
    ...result,
    raw_response: first,
  });

  return result;
}

// ── Directions ─────────────────────────────────────────────────────────

function formatLatLng(loc: string | LatLng): string {
  if (typeof loc === "string") return loc;
  return `${loc.lat},${loc.lng}`;
}

export async function getDirections(
  origin: string | LatLng,
  destination: string | LatLng,
  options?: { requestId?: string },
): Promise<DirectionsResult> {
  const apiKey = getMapsApiKey();
  const url =
    `${DIRECTIONS_BASE}?origin=${encodeURIComponent(formatLatLng(origin))}` +
    `&destination=${encodeURIComponent(formatLatLng(destination))}` +
    `&key=${encodeURIComponent(apiKey)}`;

  const body = (await fetchWithRetry(url, options?.requestId)) as Record<string, unknown>;

  const status = String(body.status ?? "");
  if (status !== "OK") {
    throw new Error(`Directions failed: ${status}`);
  }

  const routes = body.routes as Array<Record<string, unknown>>;
  if (!Array.isArray(routes) || routes.length === 0) {
    throw new Error("No route found");
  }

  const route = routes[0];
  const legs = route.legs as Array<Record<string, unknown>>;
  if (!Array.isArray(legs) || legs.length === 0) {
    throw new Error("No route legs found");
  }

  const leg = legs[0];
  const distance = leg.distance as Record<string, unknown> | undefined;
  const duration = leg.duration as Record<string, unknown> | undefined;
  const overviewPolyline = route.overview_polyline as Record<string, unknown> | undefined;

  const steps: DirectionStep[] = [];
  const rawSteps = leg.steps as Array<Record<string, unknown>>;
  if (Array.isArray(rawSteps)) {
    for (const s of rawSteps.slice(0, 20)) {
      const stepDist = s.distance as Record<string, unknown> | undefined;
      const stepDur = s.duration as Record<string, unknown> | undefined;
      steps.push({
        instruction: String(s.html_instructions ?? "")
          .replace(/<[^>]*>/g, "")
          .trim(),
        distance_text: String(stepDist?.text ?? ""),
        duration_text: String(stepDur?.text ?? ""),
      });
    }
  }

  return {
    distance_meters: Number(distance?.value ?? 0),
    distance_text: String(distance?.text ?? ""),
    duration_seconds: Number(duration?.value ?? 0),
    duration_text: String(duration?.text ?? ""),
    polyline: String(overviewPolyline?.points ?? ""),
    steps,
  };
}

// ── Nearby Search ──────────────────────────────────────────────────────

export async function searchNearby(params: {
  type: string;
  lat: number;
  lng: number;
  radius?: number;
  requestId?: string;
}): Promise<NearbySearchResult> {
  const apiKey = getMapsApiKey();
  const radius = Math.min(Math.max(params.radius ?? 5000, 100), 50000);

  const url =
    `${NEARBY_BASE}?location=${params.lat},${params.lng}` +
    `&radius=${radius}` +
    `&type=${encodeURIComponent(params.type)}` +
    `&key=${encodeURIComponent(apiKey)}`;

  const body = (await fetchWithRetry(url, params.requestId)) as Record<string, unknown>;

  const status = String(body.status ?? "");
  if (status !== "OK" && status !== "ZERO_RESULTS") {
    throw new Error(`Nearby search failed: ${status}`);
  }

  const rawResults = body.results as Array<Record<string, unknown>>;
  if (!Array.isArray(rawResults)) {
    return { places: [], total: 0 };
  }

  const places: NearbyPlace[] = rawResults.slice(0, 20).map((r) => {
    const geo = r.geometry as Record<string, unknown> | undefined;
    const loc = geo?.location as Record<string, unknown> | undefined;
    const opening = r.opening_hours as Record<string, unknown> | undefined;

    return {
      name: String(r.name ?? ""),
      place_id: String(r.place_id ?? ""),
      lat: Number(loc?.lat ?? 0),
      lng: Number(loc?.lng ?? 0),
      vicinity: String(r.vicinity ?? ""),
      types: Array.isArray(r.types) ? r.types.map(String) : [],
      rating: typeof r.rating === "number" ? r.rating : null,
      open_now: typeof opening?.open_now === "boolean" ? opening.open_now : null,
    };
  });

  return { places, total: places.length };
}
