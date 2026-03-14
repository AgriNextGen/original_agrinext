/**
 * Chat-specific AI capabilities: intent detection, conversation summarization,
 * and orchestrated chat response generation.
 *
 * Reuses existing gemini_client.ts, ai_context.ts, ai_prompts.ts, ai_response.ts.
 *
 * Usage:
 *   import { detectIntent, summarizeConversation, generateChatResponse } from "../_shared/ai_chat.ts";
 */
import { generateGeminiText, getGeminiModel } from "./gemini_client.ts";
import { buildFarmerContext, type FarmerContextBundle } from "./ai_context.ts";
import { buildFarmerSystemPrompt, buildFarmerUserPrompt } from "./ai_prompts.ts";
import { normalizeAssistantOutput, parseJsonObject, trimText } from "./ai_response.ts";
import { resolveResponseLanguage, type SupportedResponseLanguage } from "./ai_lang.ts";
import { logStructured } from "./request_context.ts";
import { searchKnowledge, assembleGroundingContext, applyGroundingPolicy, type RetrievedChunk } from "./knowledge_retrieval.ts";
import { buildGroundedSystemPrompt, buildGroundedUserPrompt } from "./knowledge_prompts.ts";
import { scoreConfidence, checkHallucination, checkUnsafeAdvice, applySafeFallback } from "./knowledge_guardrails.ts";

// ── Types ──────────────────────────────────────────────────────────────

export type ChatIntent =
  | "crop_advice"
  | "weather_query"
  | "market_price"
  | "transport"
  | "pest_disease"
  | "irrigation"
  | "general";

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type ChatResponseResult = {
  reply: string;
  suggestions: string[];
  intent: ChatIntent;
  sessionId: string;
  model: string;
  contextBundle: FarmerContextBundle | null;
  responseLanguage: SupportedResponseLanguage;
  latencyMs: number;
};

export type GenerateChatResponseParams = {
  userId: string;
  authToken: string;
  message: string;
  sessionId?: string;
  contextType?: string;
  conversation?: ChatMessage[];
  uiLanguage?: unknown;
  speechLanguage?: unknown;
  requestId?: string;
};

// ── Intent Detection ───────────────────────────────────────────────────

const INTENT_SYSTEM_PROMPT = [
  "You are an intent classifier for an agricultural assistant.",
  "Classify the user message into exactly ONE intent category.",
  "Categories: crop_advice, weather_query, market_price, transport, pest_disease, irrigation, general.",
  'Return JSON only: {"intent":"<category>"}',
].join(" ");

export async function detectIntent(message: string): Promise<ChatIntent> {
  const trimmed = trimText(message, 500);
  if (!trimmed) return "general";

  try {
    const result = await generateGeminiText({
      systemPrompt: INTENT_SYSTEM_PROMPT,
      userPrompt: `Classify this message: "${trimmed}"`,
      temperature: 0.1,
      maxOutputTokens: 64,
      timeoutMs: 10000,
      responseMimeType: "application/json",
    });

    const parsed = parseJsonObject(result.text);
    const intent = String(parsed?.intent ?? "general").toLowerCase();

    const validIntents: ChatIntent[] = [
      "crop_advice", "weather_query", "market_price",
      "transport", "pest_disease", "irrigation", "general",
    ];
    return validIntents.includes(intent as ChatIntent)
      ? (intent as ChatIntent)
      : "general";
  } catch (error) {
    logStructured({
      event: "detect_intent_fallback",
      error: String((error as Error)?.message ?? error),
    });
    return inferIntentLocally(trimmed);
  }
}

function inferIntentLocally(message: string): ChatIntent {
  const lower = message.toLowerCase();
  if (/(weather|rain|temperature|ಹವಾಮಾನ|ಮಳೆ|ಉಷ್ಣಾಂಶ)/i.test(lower)) return "weather_query";
  if (/(price|mandi|market|ಬೆಲೆ|ಮಾರುಕಟ್ಟೆ|ಮಂಡಿ)/i.test(lower)) return "market_price";
  if (/(transport|truck|vehicle|pickup|ಸಾರಿಗೆ|ಟ್ರಕ್)/i.test(lower)) return "transport";
  if (/(pest|disease|insect|fungus|ಕೀಟ|ರೋಗ|ಹುಳ)/i.test(lower)) return "pest_disease";
  if (/(irrigat|water|drip|sprinkler|ನೀರಾವರಿ|ನೀರು)/i.test(lower)) return "irrigation";
  if (/(crop|seed|harvest|sow|plant|ಬೆಳೆ|ಬಿತ್ತನೆ|ಕೊಯ್ಲು)/i.test(lower)) return "crop_advice";
  return "general";
}

// ── Conversation Summarization ─────────────────────────────────────────

const SUMMARIZE_SYSTEM_PROMPT = [
  "You summarize agricultural chat conversations into a short title (max 8 words).",
  "Focus on the main topic discussed: crop name, issue, or request type.",
  'Return JSON only: {"title":"<short title>","summary":"<1-2 sentence summary>"}',
].join(" ");

export async function summarizeConversation(
  messages: ChatMessage[],
): Promise<{ title: string; summary: string }> {
  if (!messages.length) {
    return { title: "Empty conversation", summary: "No messages to summarize." };
  }

  const transcript = messages
    .slice(-20)
    .map((m) => `${m.role}: ${trimText(m.content, 200)}`)
    .join("\n");

  try {
    const result = await generateGeminiText({
      systemPrompt: SUMMARIZE_SYSTEM_PROMPT,
      userPrompt: `Summarize this conversation:\n${transcript}`,
      temperature: 0.2,
      maxOutputTokens: 128,
      timeoutMs: 10000,
      responseMimeType: "application/json",
    });

    const parsed = parseJsonObject(result.text);
    return {
      title: trimText(parsed?.title ?? "Chat session", 80),
      summary: trimText(parsed?.summary ?? "Conversation summary unavailable.", 300),
    };
  } catch {
    const firstUserMsg = messages.find((m) => m.role === "user");
    return {
      title: trimText(firstUserMsg?.content, 60) || "Chat session",
      summary: `Conversation with ${messages.length} messages.`,
    };
  }
}

// ── Orchestrated Chat Response ─────────────────────────────────────────

export async function generateChatResponse(
  params: GenerateChatResponseParams,
): Promise<ChatResponseResult> {
  const startedAt = Date.now();
  const message = trimText(params.message, 3000);
  if (!message) {
    throw Object.assign(new Error("message is required"), { status: 400, code: "invalid_request" });
  }

  const { responseLanguage } = resolveResponseLanguage({
    message,
    uiLanguage: params.uiLanguage,
    speechLanguage: params.speechLanguage,
  });

  const sessionId = params.sessionId || crypto.randomUUID();
  const conversation = (params.conversation ?? [])
    .filter((m): m is ChatMessage & { role: "user" | "assistant" } =>
      m.role === "user" || m.role === "assistant"
    )
    .slice(-8)
    .map((m) => ({ role: m.role, content: trimText(m.content, 3000) }));

  let contextBundle: FarmerContextBundle | null = null;
  let intent: ChatIntent = "general";

  const [intentResult, contextResult] = await Promise.allSettled([
    detectIntent(message),
    buildFarmerContext({
      userId: params.userId,
      authToken: params.authToken,
      requestId: params.requestId,
    }),
  ]);

  if (intentResult.status === "fulfilled") {
    intent = intentResult.value;
  }
  if (contextResult.status === "fulfilled") {
    contextBundle = contextResult.value;
  }

  let reply = "";
  let suggestions: string[] = [];
  let modelName = getGeminiModel();

  try {
    const promptContext = contextBundle
      ? {
          profile: contextBundle.context.profile,
          crops: contextBundle.context.crops,
          weather: contextBundle.context.weather,
          marketPrices: contextBundle.context.marketPrices,
          missing: Array.from(new Set(contextBundle.context.missing)).slice(0, 8),
        }
      : { missing: ["context_unavailable"] };

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
      timeoutMs: 10000,
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
      event: "generate_chat_response_fallback",
      user_id: params.userId,
      request_id: params.requestId,
      error: String((error as Error)?.message ?? error),
    });
    reply = responseLanguage === "kn"
      ? "ಕ್ಷಮಿಸಿ, ಈಗ ಸೇವೆ ನಿಧಾನವಾಗಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ."
      : "Sorry, the service is temporarily slow. Please try again.";
    suggestions = responseLanguage === "kn"
      ? ["ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ"]
      : ["Try again"];
  }

  return {
    reply,
    suggestions,
    intent,
    sessionId,
    model: modelName,
    contextBundle,
    responseLanguage,
    latencyMs: Date.now() - startedAt,
  };
}

// ── Grounded Chat Response (Phase 3) ───────────────────────────────────

export type GroundingMetadata = {
  retrievedChunkIds: string[];
  groundingConfidence: number;
  guardrailFlags: string[];
  advisoryType: string;
  sourceCount: number;
  disclaimerApplied: boolean;
};

export type GroundedChatResponseResult = ChatResponseResult & {
  grounding: GroundingMetadata;
};

export type GenerateGroundedChatResponseParams = GenerateChatResponseParams & {
  role?: string;
};

export async function generateGroundedChatResponse(
  params: GenerateGroundedChatResponseParams,
): Promise<GroundedChatResponseResult> {
  const startedAt = Date.now();
  const message = trimText(params.message, 3000);
  if (!message) {
    throw Object.assign(new Error("message is required"), { status: 400, code: "invalid_request" });
  }

  const { responseLanguage } = resolveResponseLanguage({
    message,
    uiLanguage: params.uiLanguage,
    speechLanguage: params.speechLanguage,
  });

  const sessionId = params.sessionId || crypto.randomUUID();
  const conversation = (params.conversation ?? [])
    .filter((m): m is ChatMessage & { role: "user" | "assistant" } =>
      m.role === "user" || m.role === "assistant"
    )
    .slice(-8)
    .map((m) => ({ role: m.role, content: trimText(m.content, 3000) }));

  let contextBundle: FarmerContextBundle | null = null;
  let intent: ChatIntent = "general";
  let retrievedChunks: RetrievedChunk[] = [];

  const [intentResult, contextResult, knowledgeResult] = await Promise.allSettled([
    detectIntent(message),
    buildFarmerContext({
      userId: params.userId,
      authToken: params.authToken,
      requestId: params.requestId,
    }),
    searchKnowledge(message, {
      language: responseLanguage === "kn" ? "kn" : undefined,
      requestId: params.requestId,
    }),
  ]);

  if (intentResult.status === "fulfilled") intent = intentResult.value;
  if (contextResult.status === "fulfilled") contextBundle = contextResult.value;
  if (knowledgeResult.status === "fulfilled") retrievedChunks = knowledgeResult.value;

  const filteredChunks = applyGroundingPolicy(retrievedChunks, intent, params.role);
  const groundingContext = assembleGroundingContext(filteredChunks, 2000);

  let reply = "";
  let suggestions: string[] = [];
  let modelName = getGeminiModel();
  let advisoryType = "general";

  try {
    const promptContext = contextBundle
      ? {
          profile: contextBundle.context.profile,
          crops: contextBundle.context.crops,
          weather: contextBundle.context.weather,
          marketPrices: contextBundle.context.marketPrices,
          missing: Array.from(new Set(contextBundle.context.missing)).slice(0, 8),
        }
      : { missing: ["context_unavailable"] };

    const gemini = await generateGeminiText({
      systemPrompt: buildGroundedSystemPrompt(responseLanguage, params.role),
      userPrompt: buildGroundedUserPrompt({
        message,
        language: responseLanguage,
        platformContext: promptContext,
        knowledgeContext: groundingContext.text,
        sourceCount: groundingContext.sourceCount,
        role: params.role,
      }),
      conversation,
      temperature: 0.3,
      maxOutputTokens: 512,
      timeoutMs: 12000,
      responseMimeType: "application/json",
    });
    modelName = gemini.model;

    const parsed = parseJsonObject(gemini.text);
    const normalized = normalizeAssistantOutput({ rawText: gemini.text, responseLanguage });
    reply = normalized.reply;
    suggestions = normalized.suggestions;
    advisoryType = String(parsed?.advisory_type ?? "general");
  } catch (error) {
    logStructured({
      event: "grounded_chat_response_fallback",
      user_id: params.userId,
      request_id: params.requestId,
      error: String((error as Error)?.message ?? error),
    });
    reply = responseLanguage === "kn"
      ? "ಕ್ಷಮಿಸಿ, ಈಗ ಸೇವೆ ನಿಧಾನವಾಗಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ."
      : "Sorry, the service is temporarily slow. Please try again.";
    suggestions = responseLanguage === "kn" ? ["ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ"] : ["Try again"];
  }

  const confidence = scoreConfidence({
    chunks: filteredChunks,
    avgSimilarity: groundingContext.avgSimilarity,
    sourceCount: groundingContext.sourceCount,
    hasEvidence: filteredChunks.length > 0,
  });

  const hallucinationCheck = checkHallucination(reply, filteredChunks);
  const unsafeCheck = checkUnsafeAdvice(reply);
  const allFlags = [...hallucinationCheck.flags, ...unsafeCheck.flags];

  const safeResult = applySafeFallback(reply, confidence, responseLanguage, allFlags);
  reply = safeResult.reply;

  return {
    reply,
    suggestions,
    intent,
    sessionId,
    model: modelName,
    contextBundle,
    responseLanguage,
    latencyMs: Date.now() - startedAt,
    grounding: {
      retrievedChunkIds: groundingContext.chunkIds,
      groundingConfidence: confidence,
      guardrailFlags: allFlags,
      advisoryType,
      sourceCount: groundingContext.sourceCount,
      disclaimerApplied: safeResult.disclaimerApplied,
    },
  };
}
