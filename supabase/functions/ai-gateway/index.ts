import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { corsHeaders } from "../_shared/cors.ts";
import { EnvError } from "../_shared/env.ts";
import { getRequestIdFromHeaders, logStructured, makeResponseWithRequestId } from "../_shared/request_context.ts";
import { buildFarmerContext, resolveElevenLabsVoiceId } from "../_shared/ai_context.ts";
import {
  normalizeUiLanguage,
  resolveResponseLanguage,
  type SupportedResponseLanguage,
  type DetectedInputLanguage,
} from "../_shared/ai_lang.ts";
import { buildFarmerSystemPrompt, buildFarmerUserPrompt, buildRoleAiSystemPrompt, buildRoleAiUserPrompt } from "../_shared/ai_prompts.ts";
import { normalizeAssistantOutput, normalizeRoleAiResult, trimText } from "../_shared/ai_response.ts";
import { generateGeminiText, getGeminiModel } from "../_shared/gemini_client.ts";

type AuthUser = { id: string; email?: string | null; phone?: string | null };

type JsonRecord = Record<string, unknown>;

const SUPABASE_URL = (Deno.env.get("SUPABASE_URL") ?? "").trim();
const SUPABASE_ANON_KEY = (Deno.env.get("SUPABASE_ANON_KEY") ?? "").trim();
const SUPABASE_SERVICE_ROLE_KEY = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
const DEFAULT_RATE_LIMIT = Number(Deno.env.get("AI_GATEWAY_RATE_LIMIT") ?? "120");
const DEFAULT_RATE_WINDOW_SECONDS = Number(Deno.env.get("AI_GATEWAY_RATE_WINDOW_SECONDS") ?? "60");

function jsonHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers({ "Content-Type": "application/json", ...corsHeaders });
  if (extra) {
    new Headers(extra).forEach((value, key) => headers.set(key, value));
  }
  return headers;
}

function respondJson(reqId: string, status: number, body: unknown): Response {
  return makeResponseWithRequestId(JSON.stringify(body), reqId, {
    status,
    headers: jsonHeaders(),
  });
}

function respondError(reqId: string, code: string, message: string, status = 400): Response {
  return respondJson(reqId, status, { error: { code, message, request_id: reqId } });
}

function base64UrlDecode(input: string): string | null {
  let text = input.replace(/-/g, "+").replace(/_/g, "/");
  while (text.length % 4) text += "=";
  try {
    return atob(text);
  } catch {
    return null;
  }
}

function parseJwtSub(token: string): string | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  const decoded = base64UrlDecode(parts[1]);
  if (!decoded) return null;
  try {
    const body = JSON.parse(decoded);
    return typeof body?.sub === "string" ? body.sub : null;
  } catch {
    return null;
  }
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") return null;
  return token.trim();
}

async function authUserFromSupabase(token: string): Promise<AuthUser | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
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
  return {
    id: String(body.id),
    email: typeof body.email === "string" ? body.email : null,
    phone: typeof body.phone === "string" ? body.phone : null,
  };
}

async function requireAuth(req: Request): Promise<{ token: string; user: AuthUser }> {
  const token = extractBearerToken(req);
  if (!token) throw Object.assign(new Error("Unauthorized"), { status: 401, code: "unauthorized" });

  const authUser = await authUserFromSupabase(token);
  if (authUser) return { token, user: authUser };

  const sub = parseJwtSub(token);
  if (!sub) throw Object.assign(new Error("Unauthorized"), { status: 401, code: "unauthorized" });

  return { token, user: { id: sub } };
}

async function checkRateLimit(userId: string, reqId: string): Promise<{ allowed: boolean; reason?: string }> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return { allowed: true, reason: "missing_supabase_runtime" };
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/consume_rate_limit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        p_key: `ai_gateway:${userId}`,
        p_limit: Number.isFinite(DEFAULT_RATE_LIMIT) ? DEFAULT_RATE_LIMIT : 120,
        p_window_seconds: Number.isFinite(DEFAULT_RATE_WINDOW_SECONDS) ? DEFAULT_RATE_WINDOW_SECONDS : 60,
      }),
    });

    if (!res.ok) {
      logStructured({
        request_id: reqId,
        endpoint: "ai-gateway",
        status: "rate_limit_rpc_unavailable",
        rpc_status: res.status,
      });
      return { allowed: true, reason: `rpc_status_${res.status}` };
    }

    const body = await res.json().catch(() => false);
    return { allowed: body === true, reason: body === true ? "ok" : "limit_exceeded" };
  } catch (error) {
    logStructured({
      request_id: reqId,
      endpoint: "ai-gateway",
      status: "rate_limit_rpc_error",
      error: String((error as Error)?.message ?? error),
    });
    return { allowed: true, reason: "rpc_error" };
  }
}

async function readJsonBody(req: Request): Promise<JsonRecord> {
  const body = await req.json().catch(() => ({}));
  return body && typeof body === "object" && !Array.isArray(body) ? (body as JsonRecord) : {};
}

function gatewaySubroute(pathname: string): string {
  const marker = "/ai-gateway";
  const index = pathname.indexOf(marker);
  if (index < 0) return pathname;
  const sub = pathname.slice(index + marker.length);
  return sub ? (sub.startsWith("/") ? sub : `/${sub}`) : "/";
}

function toConversationTurns(value: unknown): Array<{ role: "user" | "assistant"; content: string }> {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      const obj = row as Record<string, unknown>;
      const role = obj?.role === "assistant" ? "assistant" : obj?.role === "user" ? "user" : null;
      const content = trimText(obj?.content, 3000);
      if (!role || !content) return null;
      return { role, content };
    })
    .filter(Boolean) as Array<{ role: "user" | "assistant"; content: string }>;
}

function fallbackFarmerReply(message: string, responseLanguage: SupportedResponseLanguage): { reply: string; suggestions: string[] } {
  const asksWeather = /(weather|rain|temperature|ಹವಾಮಾನ|ಮಳೆ)/i.test(message);
  const asksMarket = /(price|mandi|market|ಬೆಲೆ|ಮಾರುಕಟ್ಟೆ)/i.test(message);
  if (responseLanguage === "kn") {
    if (asksWeather) {
      return {
        reply: "ಈಗ ಲೈವ್ ಹವಾಮಾನ ಮಾಹಿತಿ ತರಲಾಗಲಿಲ್ಲ. ನಿಮ್ಮ ಹಳ್ಳಿ/ತಾಲೂಕು ಹೇಳಿ, ನಾನು ಬೆಳೆ ನಿರ್ಧಾರಕ್ಕೆ ಬೇಕಾದ ಮುನ್ನೆಚ್ಚರಿಕೆಗಳನ್ನು ಚಿಕ್ಕದಾಗಿ ಹೇಳುತ್ತೇನೆ. ನಿಮ್ಮ ಬೆಳೆ ಯಾವುದು?",
        suggestions: ["ಇಂದಿನ ಬೆಳೆ ಕೆಲಸ ಏನು?", "ನೀರಾವರಿ ಸಲಹೆ ನೀಡಿ"],
      };
    }
    if (asksMarket) {
      return {
        reply: "ಈಗ ಮಾರುಕಟ್ಟೆ ಬೆಲೆ ಡೇಟಾ ಪೂರ್ಣವಾಗಿ ಸಿಗಲಿಲ್ಲ. ಬೆಳೆ ಹೆಸರು ಮತ್ತು ನಿಮ್ಮ ಮಾರುಕಟ್ಟೆ ಹೇಳಿ, ಮಾರಾಟಕ್ಕೆ ಹೇಗೆ ತಯಾರಿ ಮಾಡಿಕೊಳ್ಳಬೇಕು ಎಂದು ಹೇಳುತ್ತೇನೆ. ನೀವು ಯಾವ ಬೆಳೆ ಮಾರಲು ಇರುತ್ತೀರಿ?",
        suggestions: ["ಟೊಮಾಟೊ ಮಾರಾಟ ಸಲಹೆ", "ಕನ್ನಡದಲ್ಲಿ ಹೇಳಿ"],
      };
    }
    return {
      reply: "ಕ್ಷಮಿಸಿ, ಈಗ ಸೇವೆ ನಿಧಾನವಾಗಿದೆ. ನಿಮ್ಮ ಬೆಳೆ, ಹಳ್ಳಿ, ಮತ್ತು ಸಮಸ್ಯೆಯನ್ನು ಒಂದು ಸಾಲಿನಲ್ಲಿ ಮತ್ತೆ ಕಳುಹಿಸಿ. ಮೊದಲಿಗೆ ಯಾವ ವಿಷಯ ಬೇಕು: ನೀರಾವರಿ, ಕೀಟ, ಅಥವಾ ಮಾರುಕಟ್ಟೆ?",
      suggestions: ["ನೀರಾವರಿ", "ಕೀಟ ನಿಯಂತ್ರಣ"],
    };
  }

  if (asksWeather) {
    return {
      reply: "I could not fetch live weather right now. Share your village/taluk and crop, and I will give a short farm action plan. Which crop is this for?",
      suggestions: ["Irrigation advice", "Reply in Kannada"],
    };
  }
  if (asksMarket) {
    return {
      reply: "I could not fetch reliable market price data right now. Tell me the crop and mandi, and I will help with sale preparation and negotiation points. Which crop are you selling?",
      suggestions: ["Tomato selling tips", "Reply in Kannada"],
    };
  }
  return {
    reply: "Sorry, the assistant is temporarily slow. Please resend your crop, village, and issue in one line. Do you need help with irrigation, pests, or harvest planning?",
    suggestions: ["Irrigation", "Pest issue"],
  };
}

function defaultSuggestions(language: SupportedResponseLanguage): string[] {
  return language === "kn"
    ? ["ಇಂದಿನ ಕೆಲಸ ಏನು?", "ಇದನ್ನು ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಹೇಳಿ"]
    : ["What should I do today?", "Explain in Kannada"];
}

async function callGeminiRawGenerateContent(reqId: string, body: JsonRecord): Promise<Response> {
  const apiKey = Deno.env.get("gemini_api_key") ?? Deno.env.get("GEMINI_API_KEY") ?? "";
  if (!apiKey.trim()) throw new EnvError("gemini_api_key");

  const model = String(body.model ?? "").trim() || getGeminiModel();
  const payload = { ...body };
  delete payload.model;

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent` +
    `?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  return makeResponseWithRequestId(text, reqId, {
    status: res.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function forwardJsonProxy(reqId: string, params: {
  url: string;
  headers: Record<string, string>;
  body: JsonRecord;
  timeoutMs?: number;
}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort("timeout"), params.timeoutMs ?? 20000);
  try {
    const res = await fetch(params.url, {
      method: "POST",
      headers: params.headers,
      body: JSON.stringify(params.body),
      signal: controller.signal,
    });
    const contentType = res.headers.get("content-type") || "application/json";
    const text = await res.text();
    return makeResponseWithRequestId(text, reqId, {
      status: res.status,
      headers: { ...corsHeaders, "Content-Type": contentType },
    });
  } finally {
    clearTimeout(timer);
  }
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function renderElevenLabsTts(reqId: string, body: JsonRecord): Promise<Response> {
  const apiKey = (Deno.env.get("elevenlabs_api_key") ?? Deno.env.get("ELEVENLABS_API_KEY") ?? "").trim();
  if (!apiKey) throw new EnvError("elevenlabs_api_key");

  const text = trimText(body.text, 1600);
  if (!text) return respondError(reqId, "invalid_request", "text is required", 400);

  const languageCode = String(body.language_code ?? body.language ?? "en-IN");
  const voiceRole = String(body.voice_role ?? "assistant");
  const voiceId = String(body.voice_id ?? resolveElevenLabsVoiceId({ languageCode, voiceRole }) ?? "").trim();
  if (!voiceId) {
    return respondError(reqId, "invalid_config", "No ElevenLabs voice configured", 500);
  }

  const modelId = String(body.model_id ?? "eleven_multilingual_v2");
  const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`;
  const pres = await fetch(endpoint, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      Accept: "audio/mpeg",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: { stability: 0.45, similarity_boost: 0.75, style: 0.2, use_speaker_boost: true },
    }),
  });

  if (!pres.ok) {
    const errorText = await pres.text().catch(() => "");
    return respondError(reqId, "provider_error", `ElevenLabs TTS failed: ${pres.status} ${errorText.slice(0, 180)}`, 502);
  }

  const audio = await pres.arrayBuffer();
  return respondJson(reqId, 200, {
    audio_base64: bufferToBase64(audio),
    mime_type: pres.headers.get("content-type") || "audio/mpeg",
  });
}

async function handleGeminiChatRoute(reqId: string, body: JsonRecord): Promise<Response> {
  if (Array.isArray(body.contents)) {
    return await callGeminiRawGenerateContent(reqId, body);
  }

  const message = trimText(body.message, 3000);
  if (!message) {
    return respondError(reqId, "invalid_request", "message is required", 400);
  }

  const { responseLanguage } = resolveResponseLanguage({
    message,
    uiLanguage: body.ui_language,
    speechLanguage: body.language,
  });

  const gemini = await generateGeminiText({
    systemPrompt: responseLanguage === "kn"
      ? "You are a concise helpful assistant. Reply in Kannada script. Keep it short and practical."
      : "You are a concise helpful assistant. Reply in English. Keep it short and practical.",
    userPrompt: `User message: ${message}\nReturn plain text only.`,
    temperature: 0.4,
    maxOutputTokens: 512,
  });

  return respondJson(reqId, 200, {
    reply: gemini.text.trim(),
    session_id: String(body.session_id ?? crypto.randomUUID()),
    metadata: {
      model: gemini.model,
      request_id: reqId,
      responseLanguage,
    },
  });
}

async function handleFarmerAssistantRoute(params: {
  reqId: string;
  body: JsonRecord;
  userId: string;
  authToken: string;
}): Promise<Response> {
  const message = trimText(params.body.message, 3000);
  if (!message) {
    return respondError(params.reqId, "invalid_request", "message is required", 400);
  }

  const { detectedInputLanguage, responseLanguage } = resolveResponseLanguage({
    message,
    uiLanguage: params.body.ui_language,
    speechLanguage: params.body.language,
  });

  const contextFlags = (params.body.context && typeof params.body.context === "object")
    ? (params.body.context as JsonRecord)
    : {};

  const contextBundle = await buildFarmerContext({
    userId: params.userId,
    authToken: params.authToken,
    requestId: params.reqId,
    includeProfile: contextFlags.include_profile !== false,
    includeWeather: contextFlags.include_weather !== false,
    includeMarket: contextFlags.include_market !== false,
    includeCrops: contextFlags.include_crops !== false,
  });

  const conversation = toConversationTurns(params.body.conversation);

  let reply = "";
  let suggestions: string[] = [];
  let modelName = getGeminiModel();

  try {
    const promptContext = {
      profile: contextBundle.context.profile,
      crops: contextBundle.context.crops,
      weather: contextBundle.context.weather,
      marketPrices: contextBundle.context.marketPrices,
      missing: Array.from(new Set(contextBundle.context.missing)).slice(0, 8),
    };

    const gemini = await generateGeminiText({
      systemPrompt: buildFarmerSystemPrompt(responseLanguage),
      userPrompt: buildFarmerUserPrompt({
        message,
        language: responseLanguage,
        context: promptContext,
      }),
      conversation,
      temperature: 0.35,
      maxOutputTokens: 512,
      timeoutMs: 22000,
      responseMimeType: "application/json",
    });
    modelName = gemini.model;
    const normalized = normalizeAssistantOutput({
      rawText: gemini.text,
      responseLanguage,
    });
    reply = normalized.reply;
    suggestions = normalized.suggestions;
  } catch (error) {
    logStructured({
      request_id: params.reqId,
      endpoint: "ai-gateway",
      route: "/farmer-assistant",
      status: "provider_fallback",
      user_id: params.userId,
      error: String((error as Error)?.message ?? error),
    });
    const fallback = fallbackFarmerReply(message, responseLanguage);
    reply = fallback.reply;
    suggestions = fallback.suggestions;
  }

  if (!suggestions.length) {
    suggestions = defaultSuggestions(responseLanguage);
  }

  const response = {
    reply,
    metadata: {
      personalized: contextBundle.personalized,
      webVerified: false,
      detectedInputLanguage,
      responseLanguage,
      model: modelName,
      sources: contextBundle.sources,
      request_id: params.reqId,
    },
    suggestions,
  };

  return respondJson(params.reqId, 200, response);
}

function summarizePayloadForFallback(body: JsonRecord): string {
  try {
    const json = JSON.stringify(body);
    return json.length > 800 ? `${json.slice(0, 800)}…` : json;
  } catch {
    return "payload unavailable";
  }
}

async function handleRoleAiRoute(params: {
  reqId: string;
  route: "agent-ai" | "transport-ai" | "marketplace-ai";
  body: JsonRecord;
}): Promise<Response> {
  const type = String(params.body.type ?? "general");
  const uiLanguage = normalizeUiLanguage(params.body.ui_language);

  let result = "";
  let modelName = getGeminiModel();

  try {
    const gemini = await generateGeminiText({
      systemPrompt: buildRoleAiSystemPrompt({
        route: params.route,
        responseLanguage: uiLanguage,
      }),
      userPrompt: buildRoleAiUserPrompt({
        type,
        payload: params.body,
        responseLanguage: uiLanguage,
      }),
      temperature: 0.4,
      maxOutputTokens: 768,
      responseMimeType: "application/json",
      timeoutMs: 22000,
    });
    modelName = gemini.model;
    result = normalizeRoleAiResult(gemini.text);
  } catch (error) {
    const routeLabel =
      params.route === "agent-ai"
        ? "Agent AI"
        : params.route === "transport-ai"
          ? "Transport AI"
          : "Marketplace AI";
    result = [
      `${routeLabel} fallback summary (${type})`,
      "Provider response unavailable, so this is a temporary local summary.",
      `Input snapshot: ${summarizePayloadForFallback(params.body)}`,
    ].join("\n");
    logStructured({
      request_id: params.reqId,
      endpoint: "ai-gateway",
      route: `/${params.route}`,
      status: "provider_fallback",
      error: String((error as Error)?.message ?? error),
    });
  }

  return respondJson(params.reqId, 200, {
    result,
    metadata: {
      model: modelName,
      request_id: params.reqId,
      route: params.route,
      type,
    },
  });
}

function mapErrorToResponse(reqId: string, error: unknown): Response {
  if (error instanceof EnvError) {
    return respondError(reqId, "missing_secret", `Required secret ${error.secret} is not set`, 500);
  }
  const status = Number((error as { status?: number })?.status ?? 500);
  const code = String((error as { code?: string })?.code ?? "internal_error");
  const message = String((error as Error)?.message ?? error ?? "Unknown error");
  return respondError(reqId, code, message, Number.isFinite(status) ? status : 500);
}

Deno.serve(async (req: Request) => {
  const reqId = getRequestIdFromHeaders(req.headers);
  const startedAt = Date.now();

  if (req.method === "OPTIONS") {
    return makeResponseWithRequestId(null, reqId, { headers: corsHeaders });
  }

  const pathname = new URL(req.url).pathname.replace(/\/+$/, "");
  const route = gatewaySubroute(pathname);
  let userId: string | null = null;

  try {
    if (req.method !== "POST") {
      return respondError(reqId, "method_not_allowed", "Only POST is supported", 405);
    }

    const { token, user } = await requireAuth(req);
    userId = user.id;

    const rateLimit = await checkRateLimit(user.id, reqId);
    if (!rateLimit.allowed) {
      return respondError(reqId, "rate_limited", "Rate limit exceeded. Please try again shortly.", 429);
    }

    const body = await readJsonBody(req);

    let response: Response;
    if (route === "/gemini/chat") {
      response = await handleGeminiChatRoute(reqId, body);
    } else if (route === "/firecrawl/fetch") {
      const key = (Deno.env.get("firecrawl_api_key") ?? Deno.env.get("FIRECRAWL_API_KEY") ?? "").trim();
      if (!key) throw new EnvError("firecrawl_api_key");
      const targetUrl = (Deno.env.get("FIRECRAWL_API_URL") ?? "https://api.firecrawl.dev/v1/scrape").trim();
      response = await forwardJsonProxy(reqId, {
        url: targetUrl,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body,
      });
    } else if (route === "/elevenlabs/tts") {
      response = await renderElevenLabsTts(reqId, body);
    } else if (route === "/farmer-assistant") {
      response = await handleFarmerAssistantRoute({
        reqId,
        body,
        userId: user.id,
        authToken: token,
      });
    } else if (route === "/agent-ai" || route === "/transport-ai" || route === "/marketplace-ai") {
      response = await handleRoleAiRoute({
        reqId,
        route: route.slice(1) as "agent-ai" | "transport-ai" | "marketplace-ai",
        body,
      });
    } else {
      response = respondError(reqId, "not_found", `Unknown route: ${route}`, 404);
    }

    logStructured({
      request_id: reqId,
      endpoint: "ai-gateway",
      route,
      user_id: userId,
      status_code: response.status,
      latency_ms: Date.now() - startedAt,
    });
    return response;
  } catch (error) {
    logStructured({
      request_id: reqId,
      endpoint: "ai-gateway",
      route,
      user_id: userId,
      status: "error",
      latency_ms: Date.now() - startedAt,
      error: String((error as Error)?.message ?? error),
    });
    return mapErrorToResponse(reqId, error);
  }
});
