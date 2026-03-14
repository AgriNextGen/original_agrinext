/**
 * Advisory engine: generates structured agricultural advisories
 * by combining farmer context, crop data, and retrieved knowledge.
 *
 * Usage:
 *   import { generateAdvisory, validateAdvisoryResponse, simplifyForRole } from "../_shared/advisory_engine.ts";
 */
import { generateGeminiText } from "./gemini_client.ts";
import { parseJsonObject, trimText } from "./ai_response.ts";
import type { SupportedResponseLanguage } from "./ai_lang.ts";
import type { FarmerPromptContext } from "./ai_prompts.ts";
import type { RetrievedChunk } from "./knowledge_retrieval.ts";
import {
  scoreConfidence,
  checkHallucination,
  checkUnsafeAdvice,
  applySafeFallback,
  type GuardrailResult,
} from "./knowledge_guardrails.ts";
import { logStructured } from "./request_context.ts";

// ── Types ──────────────────────────────────────────────────────────────

export type AdvisoryType =
  | "crop_guidance"
  | "pest_help"
  | "fertilizer_guidance"
  | "market_info"
  | "weather_caution"
  | "logistics_help"
  | "general";

export type GenerateAdvisoryParams = {
  message: string;
  language: SupportedResponseLanguage;
  platformContext: FarmerPromptContext;
  retrievedChunks: RetrievedChunk[];
  knowledgeContext: string;
  role?: string;
  requestId?: string;
};

export type AdvisoryResult = {
  reply: string;
  advisoryType: AdvisoryType;
  confidence: number;
  guardrailFlags: string[];
  disclaimerApplied: boolean;
  chunkIds: string[];
};

// ── generateAdvisory ───────────────────────────────────────────────────

const ADVISORY_SYSTEM_PROMPT = [
  "You are an agricultural advisory AI for Karnataka, India.",
  "Generate a structured advisory based ONLY on the provided knowledge and context.",
  "RULES:",
  "- Use retrieved knowledge as primary source.",
  "- Supplement with platform context (farmer profile, crops, weather).",
  "- Never invent data, schemes, prices, or dosages not in the sources.",
  "- Keep advice practical and actionable.",
  "- For farmers: use simple language, bullet points, max 120 words.",
  "- For admin: use analytical language with data references, max 250 words.",
  'Return JSON: {"reply":"<advisory text>","advisory_type":"<type>","key_points":["point1","point2"]}',
  'advisory_type values: crop_guidance, pest_help, fertilizer_guidance, market_info, weather_caution, logistics_help, general',
].join("\n");

export async function generateAdvisory(
  params: GenerateAdvisoryParams,
): Promise<AdvisoryResult> {
  const userPrompt = [
    `Farmer question: ${params.message}`,
    `Language: ${params.language === "kn" ? "Kannada" : "English"}`,
    `Role: ${params.role ?? "farmer"}`,
    "",
    "RETRIEVED KNOWLEDGE:",
    params.knowledgeContext || "No relevant knowledge available.",
    "",
    "PLATFORM CONTEXT:",
    JSON.stringify(params.platformContext),
  ].join("\n");

  let reply = "";
  let advisoryType: AdvisoryType = "general";

  try {
    const gemini = await generateGeminiText({
      systemPrompt: ADVISORY_SYSTEM_PROMPT,
      userPrompt,
      temperature: 0.3,
      maxOutputTokens: 512,
      timeoutMs: 10000,
      responseMimeType: "application/json",
    });

    const parsed = parseJsonObject(gemini.text);
    reply = trimText(parsed?.reply ?? gemini.text, 1400);
    const parsedType = String(parsed?.advisory_type ?? "general").toLowerCase();
    const validTypes: AdvisoryType[] = [
      "crop_guidance", "pest_help", "fertilizer_guidance",
      "market_info", "weather_caution", "logistics_help", "general",
    ];
    advisoryType = validTypes.includes(parsedType as AdvisoryType)
      ? (parsedType as AdvisoryType)
      : "general";
  } catch (error) {
    logStructured({
      event: "advisory_generation_failed",
      error: String((error as Error)?.message ?? error),
      request_id: params.requestId,
    });
    reply = params.language === "kn"
      ? "ಕ್ಷಮಿಸಿ, ಸಲಹೆ ತಯಾರಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ."
      : "Sorry, could not generate advisory. Please try again.";
  }

  const validated = validateAdvisoryResponse(
    reply,
    params.retrievedChunks,
    params.language,
  );

  const simplified = simplifyForRole(validated.reply, params.role);

  return {
    reply: simplified,
    advisoryType,
    confidence: validated.confidence,
    guardrailFlags: validated.guardrailFlags,
    disclaimerApplied: validated.disclaimerApplied,
    chunkIds: params.retrievedChunks.map((c) => c.chunkId),
  };
}

// ── validateAdvisoryResponse ───────────────────────────────────────────

export function validateAdvisoryResponse(
  reply: string,
  chunks: RetrievedChunk[],
  language: SupportedResponseLanguage,
): {
  reply: string;
  confidence: number;
  guardrailFlags: string[];
  disclaimerApplied: boolean;
} {
  const avgSimilarity =
    chunks.length > 0
      ? chunks.reduce((s, c) => s + c.similarity, 0) / chunks.length
      : 0;
  const sourceCount = new Set(chunks.map((c) => c.sourceName)).size;

  const confidence = scoreConfidence({
    chunks,
    avgSimilarity,
    sourceCount,
    hasEvidence: chunks.length > 0,
  });

  const hallucinationCheck = checkHallucination(reply, chunks);
  const unsafeCheck = checkUnsafeAdvice(reply);
  const allFlags = [...hallucinationCheck.flags, ...unsafeCheck.flags];

  const safeResult = applySafeFallback(reply, confidence, language, allFlags);

  return {
    reply: safeResult.reply,
    confidence,
    guardrailFlags: allFlags,
    disclaimerApplied: safeResult.disclaimerApplied,
  };
}

// ── simplifyForRole ────────────────────────────────────────────────────

export function simplifyForRole(reply: string, role?: string): string {
  if (role === "admin" || role === "agent") {
    return reply;
  }

  let simplified = reply
    .replace(/\b(?:hectare)\b/gi, "acre")
    .replace(/\b(?:nitrogen|phosphorus|potassium)\s*\([^)]*\)/gi, (match) => match.split("(")[0].trim());

  const words = simplified.split(/\s+/);
  if (words.length > 150) {
    simplified = words.slice(0, 150).join(" ") + "…";
  }

  return simplified;
}
