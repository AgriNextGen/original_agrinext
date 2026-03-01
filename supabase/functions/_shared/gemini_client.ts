import { EnvError } from "./env.ts";
import { geminiErrorMessage } from "./ai_response.ts";

export type GeminiConversationTurn = {
  role: "user" | "assistant";
  content: string;
};

export type GeminiGenerateTextParams = {
  systemPrompt: string;
  userPrompt: string;
  conversation?: GeminiConversationTurn[];
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  responseMimeType?: string;
  responseSchema?: unknown;
};

export type GeminiGenerateTextResult = {
  text: string;
  model: string;
  raw: unknown;
};

function getGeminiApiKey(): string {
  const key = Deno.env.get("gemini_api_key") ?? Deno.env.get("GEMINI_API_KEY") ?? "";
  if (!key.trim()) {
    throw new EnvError("gemini_api_key");
  }
  return key.trim();
}

export function getGeminiModel(): string {
  const model = Deno.env.get("GEMINI_MODEL") ?? "";
  return model.trim() || "gemini-2.0-flash";
}

function toGeminiRole(role: GeminiConversationTurn["role"]): "user" | "model" {
  return role === "assistant" ? "model" : "user";
}

function extractTextFromGeminiResponse(body: unknown): string {
  const candidates = (body as Record<string, unknown> | null)?.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return "";

  for (const candidate of candidates) {
    const content = (candidate as Record<string, unknown>)?.content as Record<string, unknown> | undefined;
    const parts = content?.parts;
    if (!Array.isArray(parts)) continue;
    const text = parts
      .map((part) => {
        const value = (part as Record<string, unknown>)?.text;
        return typeof value === "string" ? value : "";
      })
      .join("\n")
      .trim();
    if (text) return text;
  }

  return "";
}

export async function generateGeminiText(params: GeminiGenerateTextParams): Promise<GeminiGenerateTextResult> {
  const apiKey = getGeminiApiKey();
  const model = getGeminiModel();
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent` +
    `?key=${encodeURIComponent(apiKey)}`;

  const conversation = Array.isArray(params.conversation) ? params.conversation.slice(-8) : [];
  const contents = [
    ...conversation
      .map((turn) => ({
        role: toGeminiRole(turn.role),
        parts: [{ text: String(turn.content ?? "").slice(0, 4000) }],
      }))
      .filter((row) => row.parts[0].text.trim().length > 0),
    {
      role: "user" as const,
      parts: [{ text: params.userPrompt }],
    },
  ];

  const generationConfig: Record<string, unknown> = {
    temperature: params.temperature ?? 0.4,
    maxOutputTokens: params.maxOutputTokens ?? 512,
  };
  if (params.responseMimeType) generationConfig.responseMimeType = params.responseMimeType;
  if (params.responseSchema) generationConfig.responseSchema = params.responseSchema;

  const payload: Record<string, unknown> = {
    systemInstruction: {
      parts: [{ text: params.systemPrompt }],
    },
    contents,
    generationConfig,
  };

  const timeoutMs = Math.max(1000, Math.min(params.timeoutMs ?? 20000, 45000));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort("timeout"), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(geminiErrorMessage(body));
    }

    const text = extractTextFromGeminiResponse(body);
    if (!text) {
      throw new Error("Gemini returned no text");
    }

    return { text, model, raw: body };
  } catch (error) {
    if (String((error as Error)?.message ?? "").includes("timeout")) {
      throw new Error("Gemini request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

