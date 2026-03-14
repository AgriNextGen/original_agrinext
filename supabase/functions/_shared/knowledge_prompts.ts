/**
 * Grounded prompt templates for knowledge-backed AI responses.
 *
 * These prompts instruct Gemini to use ONLY retrieved knowledge and platform context,
 * with explicit anti-hallucination rules.
 *
 * Usage:
 *   import { buildGroundedSystemPrompt, buildGroundedUserPrompt } from "../_shared/knowledge_prompts.ts";
 */
import type { SupportedResponseLanguage } from "./ai_lang.ts";
import type { FarmerPromptContext } from "./ai_prompts.ts";

// ── Types ──────────────────────────────────────────────────────────────

export type GroundedPromptParams = {
  message: string;
  language: SupportedResponseLanguage;
  platformContext: FarmerPromptContext;
  knowledgeContext: string;
  sourceCount: number;
  role?: string;
};

// ── buildGroundedSystemPrompt ──────────────────────────────────────────

export function buildGroundedSystemPrompt(
  language: SupportedResponseLanguage,
  role?: string,
): string {
  const langInstruction =
    language === "kn"
      ? "Reply in natural Kannada script only (not romanized Kannada)."
      : "Reply in clear Indian English.";

  const roleContext =
    role === "admin"
      ? "You are providing analytical insights to an admin user. Use professional language with data-driven observations."
      : "You are Krishi Mitra, a practical farmer assistant for Karnataka. Use simple, farmer-friendly language.";

  return [
    roleContext,
    "",
    "GROUNDING RULES (you MUST follow these strictly):",
    "1. ONLY use information from the RETRIEVED KNOWLEDGE and PLATFORM CONTEXT sections below.",
    "2. If the retrieved knowledge does not contain relevant information, say so honestly.",
    "3. NEVER invent crop treatments, chemical dosages, government schemes, mandi prices, or yield predictions.",
    "4. NEVER fabricate citations or sources.",
    "5. If exact chemical dosage is needed but not in retrieved knowledge, advise checking the product label or consulting a local agri officer.",
    "6. Do NOT promise guaranteed yields, prices, or outcomes.",
    "7. Clearly indicate when you are uncertain: 'Based on available information...' or 'I recommend confirming with...'",
    "8. Keep responses concise (under 150 words for farmers, up to 300 for admin).",
    "9. End with one practical follow-up question when responding to farmers.",
    "",
    langInstruction,
    'Return JSON: {"reply":"<grounded answer>", "suggestions":["<follow-up>","<follow-up>"], "advisory_type":"<crop_guidance|pest_help|market_info|weather_caution|logistics_help|general>"}',
  ].join("\n");
}

// ── buildGroundedUserPrompt ────────────────────────────────────────────

export function buildGroundedUserPrompt(params: GroundedPromptParams): string {
  const languageLabel = params.language === "kn" ? "Kannada" : "English";

  const sections: string[] = [
    `User message: ${params.message}`,
    `Respond in ${languageLabel}.`,
  ];

  if (params.knowledgeContext) {
    sections.push(
      "",
      `RETRIEVED KNOWLEDGE (${params.sourceCount} source${params.sourceCount !== 1 ? "s" : ""}):`,
      params.knowledgeContext,
    );
  } else {
    sections.push(
      "",
      "RETRIEVED KNOWLEDGE: No relevant knowledge found in the database.",
      "You must indicate this gap honestly in your response.",
    );
  }

  sections.push(
    "",
    "PLATFORM CONTEXT (farmer/crop/weather data from the platform — use only if present):",
    JSON.stringify(params.platformContext),
    "",
    "RESPONSE POLICY:",
    "- Ground your answer in the RETRIEVED KNOWLEDGE above.",
    "- Supplement with PLATFORM CONTEXT where relevant.",
    "- Do NOT add information beyond these two sources.",
    "- If neither source covers the topic, give a safe fallback.",
  );

  return sections.join("\n");
}
