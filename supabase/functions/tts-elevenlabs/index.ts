import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { corsHeaders } from "../_shared/cors.ts";
import { EnvError } from "../_shared/env.ts";
import { resolveElevenLabsVoiceId } from "../_shared/ai_context.ts";
import { getRequestIdFromHeaders, logStructured, makeResponseWithRequestId } from "../_shared/request_context.ts";
import { trimText } from "../_shared/ai_response.ts";

const SUPABASE_URL = (Deno.env.get("SUPABASE_URL") ?? "").trim();
const SUPABASE_ANON_KEY = (Deno.env.get("SUPABASE_ANON_KEY") ?? "").trim();

function jsonHeaders(): Headers {
  return new Headers({ "Content-Type": "application/json", ...corsHeaders });
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

function extractBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") return null;
  return token.trim();
}

async function authUserId(token: string): Promise<string | null> {
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
  return typeof body?.id === "string" ? body.id : null;
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

Deno.serve(async (req: Request) => {
  const reqId = getRequestIdFromHeaders(req.headers);
  const startedAt = Date.now();
  let userId: string | null = null;

  if (req.method === "OPTIONS") {
    return makeResponseWithRequestId(null, reqId, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return respondError(reqId, "method_not_allowed", "Only POST is supported", 405);
    }

    const token = extractBearerToken(req);
    if (!token) {
      return respondError(reqId, "unauthorized", "Missing Authorization header", 401);
    }

    userId = await authUserId(token);
    if (!userId) {
      return respondError(reqId, "unauthorized", "Invalid token", 401);
    }

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const text = trimText(body.text, 1600);
    if (!text) {
      return respondError(reqId, "invalid_request", "text is required", 400);
    }

    const apiKey = (Deno.env.get("elevenlabs_api_key") ?? Deno.env.get("ELEVENLABS_API_KEY") ?? "").trim();
    if (!apiKey) {
      throw new EnvError("elevenlabs_api_key");
    }

    const languageCode = String(body.language_code ?? "en-IN");
    const voiceRole = String(body.voice_role ?? "assistant");
    const voiceId = String(body.voice_id ?? resolveElevenLabsVoiceId({ languageCode, voiceRole }) ?? "").trim();
    if (!voiceId) {
      return respondError(reqId, "invalid_config", "No ElevenLabs voice configured", 500);
    }

    const modelId = String(body.model_id ?? "eleven_multilingual_v2");
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
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

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      return respondError(
        reqId,
        "provider_error",
        `ElevenLabs TTS failed: ${res.status} ${errorText.slice(0, 180)}`,
        502,
      );
    }

    const audio = await res.arrayBuffer();
    const out = {
      audio_base64: bufferToBase64(audio),
      mime_type: res.headers.get("content-type") || "audio/mpeg",
    };

    logStructured({
      request_id: reqId,
      endpoint: "tts-elevenlabs",
      user_id: userId,
      status_code: 200,
      latency_ms: Date.now() - startedAt,
      language_code: languageCode,
      voice_role: voiceRole,
    });

    return respondJson(reqId, 200, out);
  } catch (error) {
    const message = error instanceof EnvError
      ? `Required secret ${error.secret} is not set`
      : String((error as Error)?.message ?? error);
    const status = error instanceof EnvError ? 500 : 500;
    const code = error instanceof EnvError ? "missing_secret" : "internal_error";

    logStructured({
      request_id: reqId,
      endpoint: "tts-elevenlabs",
      user_id: userId,
      status: "error",
      latency_ms: Date.now() - startedAt,
      error: message,
    });

    return respondError(reqId, code, message, status);
  }
});

