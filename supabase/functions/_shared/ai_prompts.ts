import type { SupportedResponseLanguage } from "./ai_lang.ts";

type FarmerProfileContext = {
  full_name?: string | null;
  village?: string | null;
  taluk?: string | null;
  district?: string | null;
  pincode?: string | null;
  preferred_language?: string | null;
  total_land_area?: number | null;
};

type FarmerCropContext = {
  crop_name?: string | null;
  status?: string | null;
  growth_stage?: string | null;
  health_status?: string | null;
  harvest_estimate?: string | null;
  estimated_quantity?: number | null;
  quantity_unit?: string | null;
  variety?: string | null;
};

type FarmerWeatherContext = {
  location?: string | null;
  temp_c?: number | null;
  humidity?: number | null;
  wind_kmh?: number | null;
  description?: string | null;
  forecast_short?: string | null;
};

type FarmerMarketPriceContext = {
  crop_name?: string | null;
  mandi_name?: string | null;
  district?: string | null;
  modal_price?: number | null;
  min_price?: number | null;
  max_price?: number | null;
  date?: string | null;
};

export type FarmerPromptContext = {
  profile?: FarmerProfileContext | null;
  crops?: FarmerCropContext[];
  weather?: FarmerWeatherContext | null;
  marketPrices?: FarmerMarketPriceContext[];
  missing?: string[];
};

export function buildFarmerSystemPrompt(language: SupportedResponseLanguage): string {
  const langInstruction =
    language === "kn"
      ? "Reply in natural Kannada script only (not romanized Kannada)."
      : "Reply in clear Indian English.";

  return [
    "You are Krishi Mitra, a practical farmer assistant for Karnataka.",
    "Focus on daily farming decisions: crop care, irrigation timing, pest basics, harvest readiness, market preparation, and transport readiness.",
    "Be concise and interactive: answer in short chat style (usually under 120 words) and end with one useful follow-up question.",
    "If key details are missing (crop, stage, village, symptoms, rainfall), ask for them.",
    "Never fabricate live weather, mandi prices, or government updates.",
    "If exact chemical dosage is requested and not verified from label/source, avoid precise dosage and advise checking product label/local agri officer.",
    langInstruction,
    "When possible, use bullet points for steps. Keep tone respectful and practical.",
    'If returning structured output, use JSON with keys: "reply" and optional "suggestions" (array of short follow-up prompts).',
  ].join(" ");
}

export function buildFarmerUserPrompt(params: {
  message: string;
  language: SupportedResponseLanguage;
  context: FarmerPromptContext;
}): string {
  const responseLanguageLabel = params.language === "kn" ? "Kannada" : "English";

  return [
    `User message: ${params.message}`,
    `Respond in ${responseLanguageLabel}.`,
    "Grounding context (use only if present, do not invent missing fields):",
    JSON.stringify(params.context),
    "Return JSON: {\"reply\":\"short answer + one follow-up question\", \"suggestions\":[\"short prompt\",\"short prompt\"] }",
  ].join("\n");
}

export function buildRoleAiSystemPrompt(params: {
  route: "agent-ai" | "transport-ai" | "marketplace-ai";
  responseLanguage: SupportedResponseLanguage;
}): string {
  const routeRole =
    params.route === "agent-ai"
      ? "field operations assistant for agriculture extension agents"
      : params.route === "transport-ai"
        ? "logistics planner for agri pickups and transport"
        : "marketplace analyst for agricultural buyers and sellers";

  const language = params.responseLanguage === "kn" ? "Kannada script" : "English";

  return [
    `You are an AI ${routeRole}.`,
    "Provide concise, practical recommendations with short sections and bullet points.",
    "Do not hallucinate unavailable operational data.",
    `Respond in ${language}.`,
    'If possible, return JSON with a "result" string field.',
  ].join(" ");
}

export function buildRoleAiUserPrompt(params: {
  type: string;
  payload: Record<string, unknown>;
  responseLanguage: SupportedResponseLanguage;
}): string {
  const languageLabel = params.responseLanguage === "kn" ? "Kannada" : "English";
  return [
    `Task type: ${params.type}`,
    `Reply language: ${languageLabel}`,
    "Input payload:",
    JSON.stringify(params.payload),
    "Return a concise output. If using JSON, shape should be {\"result\":\"...\"}.",
  ].join("\n");
}

