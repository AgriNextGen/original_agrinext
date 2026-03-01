export type SupportedResponseLanguage = "en" | "kn";
export type DetectedInputLanguage = "en" | "kn" | "mixed" | "unknown";

const KANNADA_RE = /[\u0C80-\u0CFF]/u;
const LATIN_RE = /[A-Za-z]/;

function normalize(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export function normalizeUiLanguage(value: unknown): SupportedResponseLanguage {
  const raw = normalize(value);
  return raw.startsWith("kn") ? "kn" : "en";
}

export function normalizeSpeechLanguage(value: unknown): string {
  const raw = normalize(value);
  if (raw.startsWith("kn")) return "kn";
  if (raw.startsWith("hi")) return "hi";
  if (raw.startsWith("en")) return "en";
  return "";
}

export function detectScriptLanguage(input: string): DetectedInputLanguage {
  const text = input.trim();
  if (!text) return "unknown";
  const hasKn = KANNADA_RE.test(text);
  const hasLatin = LATIN_RE.test(text);
  if (hasKn && hasLatin) return "mixed";
  if (hasKn) return "kn";
  if (hasLatin) return "en";
  return "unknown";
}

function detectExplicitLanguageRequest(input: string): SupportedResponseLanguage | null {
  const text = normalize(input);
  if (!text) return null;

  if (
    text.includes("in kannada") ||
    text.includes("kannada nalli") ||
    text.includes("ಕನ್ನಡ") ||
    text.includes("ಕನ್ನಡದಲ್ಲಿ")
  ) {
    return "kn";
  }

  if (text.includes("in english") || text.includes("english")) {
    return "en";
  }

  return null;
}

export function resolveResponseLanguage(params: {
  message: string;
  uiLanguage?: unknown;
  speechLanguage?: unknown;
}): { detectedInputLanguage: DetectedInputLanguage; responseLanguage: SupportedResponseLanguage } {
  const explicit = detectExplicitLanguageRequest(params.message);
  if (explicit) {
    return {
      detectedInputLanguage: detectScriptLanguage(params.message),
      responseLanguage: explicit,
    };
  }

  const detected = detectScriptLanguage(params.message);
  if (detected === "kn") {
    return { detectedInputLanguage: detected, responseLanguage: "kn" };
  }
  if (detected === "en") {
    return { detectedInputLanguage: detected, responseLanguage: "en" };
  }
  if (detected === "mixed") {
    if (normalizeSpeechLanguage(params.speechLanguage) === "kn") {
      return { detectedInputLanguage: detected, responseLanguage: "kn" };
    }
    return { detectedInputLanguage: detected, responseLanguage: normalizeUiLanguage(params.uiLanguage) };
  }

  const speech = normalizeSpeechLanguage(params.speechLanguage);
  if (speech === "kn") {
    return { detectedInputLanguage: "unknown", responseLanguage: "kn" };
  }

  return { detectedInputLanguage: "unknown", responseLanguage: normalizeUiLanguage(params.uiLanguage) };
}

