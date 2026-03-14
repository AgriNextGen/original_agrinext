/**
 * Hallucination prevention guardrails for knowledge-grounded responses.
 *
 * Usage:
 *   import { scoreConfidence, checkHallucination, checkUnsafeAdvice, applySafeFallback } from "../_shared/knowledge_guardrails.ts";
 */
import type { RetrievedChunk } from "./knowledge_retrieval.ts";
import type { SupportedResponseLanguage } from "./ai_lang.ts";

// ── Types ──────────────────────────────────────────────────────────────

export type ConfidenceParams = {
  chunks: RetrievedChunk[];
  avgSimilarity: number;
  sourceCount: number;
  hasEvidence: boolean;
};

export type GuardrailResult = {
  passed: boolean;
  flags: string[];
  details?: string;
};

export type SafeResponse = {
  reply: string;
  disclaimerApplied: boolean;
  originalReply?: string;
};

// ── Thresholds ─────────────────────────────────────────────────────────

export const GUARDRAIL_THRESHOLDS = {
  minConfidence: 0.4,
  highConfidence: 0.75,
  minSimilarity: 0.7,
  minChunksForStrong: 2,
  maxClaimsWithoutEvidence: 1,
} as const;

// ── scoreConfidence ────────────────────────────────────────────────────

export function scoreConfidence(params: ConfidenceParams): number {
  let score = 0;

  const similarityWeight = Math.min(params.avgSimilarity, 1.0) * 0.35;
  score += similarityWeight;

  const trustSum = params.chunks.reduce((s, c) => s + c.trustLevel, 0);
  const avgTrust = params.chunks.length > 0 ? trustSum / params.chunks.length : 0;
  score += (avgTrust / 5) * 0.25;

  const chunkCountScore = Math.min(params.chunks.length / 3, 1.0) * 0.2;
  score += chunkCountScore;

  score += params.sourceCount > 1 ? 0.1 : params.sourceCount === 1 ? 0.05 : 0;

  score += params.hasEvidence ? 0.1 : 0;

  return Math.min(Math.max(score, 0), 1);
}

// ── checkHallucination ─────────────────────────────────────────────────

const FACTUAL_CLAIM_PATTERNS = [
  /\b\d+(?:\.\d+)?\s*(?:kg|quintal|ton|acre|hectare|rupee|rs|₹)\b/i,
  /\b(?:government|scheme|subsidy|yojana|policy)\s+(?:provides?|offers?|gives?)\b/i,
  /\b(?:guaranteed|assured|confirmed|certain)\s+(?:yield|price|income|return)\b/i,
  /\b(?:apply|spray|use)\s+\d+\s*(?:ml|gm|g|kg|litre|l)\b/i,
];

export function checkHallucination(
  response: string,
  retrievedChunks: RetrievedChunk[],
): GuardrailResult {
  const flags: string[] = [];
  const chunkTexts = retrievedChunks.map((c) => c.content.toLowerCase());

  for (const pattern of FACTUAL_CLAIM_PATTERNS) {
    const matches = response.match(pattern);
    if (!matches) continue;

    for (const match of matches) {
      const matchLower = match.toLowerCase();
      const supported = chunkTexts.some((text) => text.includes(matchLower));
      if (!supported) {
        flags.push(`unsupported_claim: "${match}"`);
      }
    }
  }

  const passed = flags.length <= GUARDRAIL_THRESHOLDS.maxClaimsWithoutEvidence;
  return {
    passed,
    flags,
    details: flags.length > 0
      ? `${flags.length} potentially unsupported factual claims detected`
      : undefined,
  };
}

// ── checkUnsafeAdvice ──────────────────────────────────────────────────

const UNSAFE_PATTERNS = [
  { pattern: /\bguaranteed?\s+(?:yield|harvest|income|profit|return)\b/i, flag: "guaranteed_outcome" },
  { pattern: /\bguaranteed?\s+(?:price|rate|msp)\b/i, flag: "guaranteed_price" },
  { pattern: /\b(?:definitely|certainly|absolutely)\s+(?:will|shall)\s+(?:cure|fix|solve|eliminate)\b/i, flag: "absolute_promise" },
  { pattern: /\b(?:mix|combine|spray)\s+(?:all|any)\s+(?:pesticide|chemical|insecticide)\b/i, flag: "dangerous_chemical_mixing" },
  { pattern: /\b(?:no\s+need|skip|ignore)\s+(?:safety|precaution|protective|ppe)\b/i, flag: "safety_dismissal" },
  { pattern: /\b(?:drink|consume|eat)\s+(?:pesticide|chemical|fertilizer)\b/i, flag: "toxic_ingestion" },
];

export function checkUnsafeAdvice(response: string): GuardrailResult {
  const flags: string[] = [];

  for (const { pattern, flag } of UNSAFE_PATTERNS) {
    if (pattern.test(response)) {
      flags.push(flag);
    }
  }

  return {
    passed: flags.length === 0,
    flags,
    details: flags.length > 0
      ? `Unsafe advice detected: ${flags.join(", ")}`
      : undefined,
  };
}

// ── applySafeFallback ──────────────────────────────────────────────────

const DISCLAIMERS: Record<SupportedResponseLanguage, string> = {
  en: "\n\n⚠️ Note: I am not fully confident based on the available information. Please consult a local agricultural officer or field agent for confirmation.",
  kn: "\n\n⚠️ ಗಮನಿಸಿ: ಲಭ್ಯವಿರುವ ಮಾಹಿತಿಯ ಆಧಾರದ ಮೇಲೆ ನನಗೆ ಪೂರ್ಣ ವಿಶ್ವಾಸವಿಲ್ಲ. ದಯವಿಟ್ಟು ಸ್ಥಳೀಯ ಕೃಷಿ ಅಧಿಕಾರಿ ಅಥವಾ ಕ್ಷೇತ್ರ ಏಜೆಂಟ್ ಅವರನ್ನು ಸಂಪರ್ಕಿಸಿ.",
};

const LOW_CONFIDENCE_REPLIES: Record<SupportedResponseLanguage, string> = {
  en: "I don't have enough verified information to answer this confidently. Please consult a local agricultural officer or your field agent for accurate guidance on this topic.",
  kn: "ಈ ವಿಷಯದ ಬಗ್ಗೆ ನನ್ನ ಬಳಿ ಸಾಕಷ್ಟು ಪರಿಶೀಲಿತ ಮಾಹಿತಿ ಇಲ್ಲ. ದಯವಿಟ್ಟು ನಿಖರ ಮಾರ್ಗದರ್ಶನಕ್ಕಾಗಿ ಸ್ಥಳೀಯ ಕೃಷಿ ಅಧಿಕಾರಿ ಅಥವಾ ನಿಮ್ಮ ಕ್ಷೇತ್ರ ಏಜೆಂಟ್ ಅವರನ್ನು ಸಂಪರ್ಕಿಸಿ.",
};

export function applySafeFallback(
  reply: string,
  confidence: number,
  language: SupportedResponseLanguage,
  guardrailFlags: string[] = [],
): SafeResponse {
  if (guardrailFlags.some((f) => f.startsWith("dangerous_") || f === "toxic_ingestion" || f === "safety_dismissal")) {
    return {
      reply: LOW_CONFIDENCE_REPLIES[language],
      disclaimerApplied: true,
      originalReply: reply,
    };
  }

  if (confidence < GUARDRAIL_THRESHOLDS.minConfidence) {
    return {
      reply: LOW_CONFIDENCE_REPLIES[language],
      disclaimerApplied: true,
      originalReply: reply,
    };
  }

  if (confidence < GUARDRAIL_THRESHOLDS.highConfidence || guardrailFlags.length > 0) {
    return {
      reply: reply + DISCLAIMERS[language],
      disclaimerApplied: true,
      originalReply: reply,
    };
  }

  return { reply, disclaimerApplied: false };
}
