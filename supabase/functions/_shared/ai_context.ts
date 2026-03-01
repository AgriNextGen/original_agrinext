import { getOptionalEnv } from "./env.ts";

type FarmerProfile = {
  full_name: string | null;
  village: string | null;
  taluk: string | null;
  district: string | null;
  pincode: string | null;
  preferred_language: string | null;
  total_land_area: number | null;
  home_market_id: string | null;
};

type CropRow = {
  crop_name: string | null;
  status: string | null;
  growth_stage: string | null;
  health_status: string | null;
  harvest_estimate: string | null;
  estimated_quantity: number | null;
  quantity_unit: string | null;
  variety: string | null;
};

type MarketPriceRow = {
  crop_name: string | null;
  mandi_name: string | null;
  district: string | null;
  modal_price: number | null;
  min_price: number | null;
  max_price: number | null;
  date: string | null;
};

type WeatherData = {
  location?: string | null;
  temp_c?: number | null;
  humidity?: number | null;
  wind_kmh?: number | null;
  description?: string | null;
  forecast_short?: string | null;
};

type WeatherFnResponse = {
  data?: WeatherData | null;
  message?: string;
};

export type FarmerContextBundle = {
  context: {
    profile: FarmerProfile | null;
    crops: CropRow[];
    weather: WeatherData | null;
    marketPrices: MarketPriceRow[];
    missing: string[];
  };
  sources: {
    profile: boolean;
    weather: boolean;
    market: boolean;
    crops: boolean;
    web: boolean;
  };
  personalized: boolean;
};

type BuildFarmerContextArgs = {
  userId: string;
  authToken: string;
  requestId?: string;
  includeProfile?: boolean;
  includeWeather?: boolean;
  includeMarket?: boolean;
  includeCrops?: boolean;
};

const SUPABASE_URL = (Deno.env.get("SUPABASE_URL") ?? "").trim();
const SUPABASE_ANON_KEY = (Deno.env.get("SUPABASE_ANON_KEY") ?? "").trim();
const SUPABASE_SERVICE_ROLE_KEY = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();

function hasSupabaseRuntime(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY);
}

async function fetchRest(path: string, query?: Record<string, string>): Promise<unknown> {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    url.searchParams.set(key, value);
  }
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`REST ${path} failed: ${res.status}`);
  }

  return await res.json();
}

async function fetchProfile(userId: string): Promise<FarmerProfile | null> {
  const data = await fetchRest("profiles", {
    select: "full_name,village,taluk,district,pincode,preferred_language,total_land_area,home_market_id",
    id: `eq.${userId}`,
    limit: "1",
  });
  const row = Array.isArray(data) ? data[0] : null;
  return row && typeof row === "object" ? (row as FarmerProfile) : null;
}

async function fetchCrops(userId: string): Promise<CropRow[]> {
  const data = await fetchRest("crops", {
    select: "crop_name,status,growth_stage,health_status,harvest_estimate,estimated_quantity,quantity_unit,variety",
    farmer_id: `eq.${userId}`,
    order: "updated_at.desc",
    limit: "6",
  });
  return Array.isArray(data) ? (data as CropRow[]) : [];
}

async function fetchMarketPrices(profile: FarmerProfile | null): Promise<MarketPriceRow[]> {
  const district = String(profile?.district ?? "").trim();
  if (!district) return [];

  const data = await fetchRest("market_prices", {
    select: "crop_name,mandi_name,district,modal_price,min_price,max_price,date",
    district: `eq.${district}`,
    order: "date.desc",
    limit: "5",
  });
  return Array.isArray(data) ? (data as MarketPriceRow[]) : [];
}

async function fetchWeather(authToken: string, requestId?: string): Promise<WeatherData | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/get-weather`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${authToken}`,
      ...(requestId ? { "x-request-id": requestId } : {}),
    },
    body: "{}",
  });
  if (!res.ok) return null;
  const body = (await res.json().catch(() => null)) as WeatherFnResponse | null;
  return body?.data ?? null;
}

export async function buildFarmerContext(args: BuildFarmerContextArgs): Promise<FarmerContextBundle> {
  const includeProfile = args.includeProfile !== false;
  const includeWeather = args.includeWeather !== false;
  const includeMarket = args.includeMarket !== false;
  const includeCrops = args.includeCrops !== false;

  const context: FarmerContextBundle["context"] = {
    profile: null,
    crops: [],
    weather: null,
    marketPrices: [],
    missing: [],
  };
  const sources: FarmerContextBundle["sources"] = {
    profile: false,
    weather: false,
    market: false,
    crops: false,
    web: false,
  };

  if (!hasSupabaseRuntime()) {
    context.missing.push("supabase_runtime_config");
    return { context, sources, personalized: false };
  }

  let profile: FarmerProfile | null = null;

  if (includeProfile) {
    try {
      profile = await fetchProfile(args.userId);
      context.profile = profile;
      sources.profile = Boolean(profile);
    } catch {
      context.missing.push("profile_unavailable");
    }
  }

  if (includeCrops) {
    try {
      context.crops = await fetchCrops(args.userId);
      sources.crops = context.crops.length > 0;
    } catch {
      context.missing.push("crops_unavailable");
    }
  }

  if (includeWeather) {
    try {
      context.weather = await fetchWeather(args.authToken, args.requestId);
      sources.weather = Boolean(context.weather);
      if (!context.weather) context.missing.push("weather_unavailable");
    } catch {
      context.missing.push("weather_unavailable");
    }
  }

  if (includeMarket) {
    try {
      context.marketPrices = await fetchMarketPrices(profile);
      sources.market = context.marketPrices.length > 0;
      if (!sources.market) context.missing.push("market_prices_unavailable");
    } catch {
      context.missing.push("market_prices_unavailable");
    }
  }

  if (!context.profile) {
    context.missing.push("profile_not_found");
  } else {
    if (!String(context.profile.district ?? "").trim() && !String(context.profile.pincode ?? "").trim()) {
      context.missing.push("location_not_set");
    }
  }

  if (!context.crops.length) {
    context.missing.push("crops_not_found");
  }

  const personalized = sources.profile || sources.crops || sources.weather || sources.market;
  return { context, sources, personalized };
}

export function resolveElevenLabsVoiceId(params: {
  languageCode?: string;
  voiceRole?: string;
}): string | null {
  const lang = String(params.languageCode ?? "").toLowerCase();
  const role = String(params.voiceRole ?? "").toLowerCase();
  const keys = [
    lang.startsWith("kn") ? "ELEVENLABS_VOICE_ID_KN" : "",
    lang.startsWith("hi") ? "ELEVENLABS_VOICE_ID_HI" : "",
    role ? `ELEVENLABS_VOICE_ID_${role.toUpperCase()}` : "",
    "ELEVENLABS_VOICE_ID",
    "elevenlabs_voice_id",
  ].filter(Boolean);

  for (const key of keys) {
    const value = getOptionalEnv(key);
    if (value) return value;
  }

  return "EXAVITQu4vr4xnSDxMaL";
}

