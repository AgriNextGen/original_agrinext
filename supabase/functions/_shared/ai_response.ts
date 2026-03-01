import type { SupportedResponseLanguage } from "./ai_lang.ts";

export function trimText(value: unknown, maxChars = 4000): string {
  const text = String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!text) return "";
  return text.length > maxChars ? `${text.slice(0, maxChars - 1).trimEnd()}…` : text;
}

export function wordCap(text: string, maxWords: number): string {
  const parts = text.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= maxWords) return text.trim();
  return `${parts.slice(0, maxWords).join(" ").trim()}…`;
}

function extractJsonBlock(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);

  return null;
}

export function parseJsonObject(text: string): Record<string, unknown> | null {
  const candidates = [text, extractJsonBlock(text)].filter(Boolean) as string[];
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // Try next candidate.
    }
  }
  return null;
}

export function normalizeSuggestions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => trimText(item, 120))
    .filter(Boolean)
    .slice(0, 3);
}

function defaultAssistantFallback(language: SupportedResponseLanguage): string {
  return language === "kn"
    ? "ಕ್ಷಮಿಸಿ, ಈಗ ಸ್ಪಷ್ಟ ಉತ್ತರ ಸಿಗಲಿಲ್ಲ. ನಿಮ್ಮ ಬೆಳೆ, ಹಳ್ಳಿ ಮತ್ತು ಸಮಸ್ಯೆಯನ್ನು ಒಂದು ಸಾಲಿನಲ್ಲಿ ಹೇಳಿ."
    : "Sorry, I could not form a clear answer yet. Please share your crop, village, and issue in one line.";
}

export function normalizeAssistantOutput(params: {
  rawText: string;
  responseLanguage: SupportedResponseLanguage;
}): { reply: string; suggestions: string[] } {
  const parsed = parseJsonObject(params.rawText);
  const parsedReply = parsed?.reply ?? parsed?.response ?? parsed?.answer;
  const parsedSuggestions = normalizeSuggestions(parsed?.suggestions);

  let reply = trimText(parsedReply ?? params.rawText, 1400);
  if (!reply) {
    reply = defaultAssistantFallback(params.responseLanguage);
  }

  // Keep the voice-style interaction short unless the model ignored the prompt.
  reply = wordCap(reply, 120);

  return {
    reply,
    suggestions: parsedSuggestions,
  };
}

export function normalizeRoleAiResult(rawText: string): string {
  const parsed = parseJsonObject(rawText);
  const candidate = parsed?.result ?? parsed?.reply ?? parsed?.summary ?? rawText;
  return trimText(candidate, 4000) || "No result generated.";
}

export function geminiErrorMessage(body: unknown): string {
  const anyBody = body as Record<string, unknown> | null;
  const errorObj = anyBody?.error as Record<string, unknown> | undefined;
  const message = errorObj?.message;
  return typeof message === "string" && message.trim() ? message : "Provider request failed";
}

