/**
 * Voice generation service for AgriNext Edge Functions.
 *
 * Generates speech via ElevenLabs, stores audio in Supabase Storage,
 * and records metadata in the voice_responses table.
 *
 * Usage:
 *   import { generateAndStoreVoice } from "../_shared/voice_service.ts";
 *   const result = await generateAndStoreVoice({ text, userId, ... });
 *   // result.audio_url is a signed URL for playback
 *
 * Reuses resolveElevenLabsVoiceId from _shared/ai_context.ts.
 * Requires ELEVENLABS_API_KEY secret.
 */
import { EnvError } from "./env.ts";
import { resolveElevenLabsVoiceId } from "./ai_context.ts";
import { logStructured } from "./request_context.ts";
import { trimText } from "./ai_response.ts";

// ── Types ──────────────────────────────────────────────────────────────

export type GenerateSpeechOptions = {
  languageCode?: string;
  voiceRole?: string;
  voiceId?: string;
  modelId?: string;
};

export type GenerateSpeechResult = {
  audio: ArrayBuffer;
  mimeType: string;
  voiceId: string;
};

export type StoreVoiceParams = {
  audio: ArrayBuffer;
  mimeType: string;
  userId: string;
  voiceId: string;
  languageCode: string;
  textHash: string;
  sessionId?: string;
  messageId?: string;
};

export type StoreVoiceResult = {
  filePath: string;
  bucket: string;
};

export type GenerateAndStoreParams = {
  text: string;
  userId: string;
  languageCode?: string;
  voiceRole?: string;
  voiceId?: string;
  sessionId?: string;
  messageId?: string;
  requestId?: string;
};

export type GenerateAndStoreResult = {
  audio_url: string;
  file_path: string;
  duration_ms: number;
  voice_id: string;
  language_code: string;
};

// ── Config ─────────────────────────────────────────────────────────────

const VOICE_TIMEOUT_MS = 10_000;
const VOICE_BUCKET = "voice-responses";
const ELEVENLABS_MODEL = "eleven_multilingual_v2";
const VOICE_SETTINGS = {
  stability: 0.45,
  similarity_boost: 0.75,
  style: 0.2,
  use_speaker_boost: true,
};

function getElevenLabsApiKey(): string {
  const key = (
    Deno.env.get("elevenlabs_api_key") ??
    Deno.env.get("ELEVENLABS_API_KEY") ??
    ""
  ).trim();
  if (!key) throw new EnvError("ELEVENLABS_API_KEY");
  return key;
}

function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return `v_${Math.abs(hash).toString(36)}`;
}

// ── generateSpeech ─────────────────────────────────────────────────────

export async function generateSpeech(
  text: string,
  options?: GenerateSpeechOptions,
): Promise<GenerateSpeechResult> {
  const trimmed = trimText(text, 1600);
  if (!trimmed) {
    throw Object.assign(new Error("text is required for speech generation"), {
      status: 400,
      code: "invalid_input",
    });
  }

  const apiKey = getElevenLabsApiKey();
  const langCode = options?.languageCode ?? "en-IN";
  const voiceId = (
    options?.voiceId ??
    resolveElevenLabsVoiceId({
      languageCode: langCode,
      voiceRole: options?.voiceRole ?? "assistant",
    }) ??
    ""
  ).trim();

  if (!voiceId) {
    throw Object.assign(new Error("No ElevenLabs voice configured"), {
      status: 500,
      code: "invalid_config",
    });
  }

  const modelId = options?.modelId ?? ELEVENLABS_MODEL;
  const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`;
  const payload = JSON.stringify({
    text: trimmed,
    model_id: modelId,
    voice_settings: VOICE_SETTINGS,
  });

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort("timeout"), VOICE_TIMEOUT_MS);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
        },
        body: payload,
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        const err = new Error(
          `ElevenLabs TTS failed: ${res.status} ${errText.slice(0, 180)}`,
        );
        if (attempt === 0 && res.status >= 500) {
          lastError = err;
          logStructured({
            event: "voice_api_retry",
            attempt: attempt + 1,
            status: res.status,
          });
          continue;
        }
        throw Object.assign(err, { status: 502, code: "provider_error" });
      }

      const audio = await res.arrayBuffer();
      return {
        audio,
        mimeType: res.headers.get("content-type") || "audio/mpeg",
        voiceId,
      };
    } catch (error) {
      lastError = error as Error;
      const msg = String(lastError?.message ?? "");
      if (attempt === 0 && msg.includes("timeout")) {
        logStructured({ event: "voice_api_retry", attempt: attempt + 1, error: msg });
        continue;
      }
      break;
    } finally {
      clearTimeout(timer);
    }
  }

  const finalErr = lastError ?? new Error("ElevenLabs request failed");
  logStructured({
    event: "voice_generation_failed",
    error: String(finalErr?.message ?? finalErr),
  });
  throw finalErr;
}

// ── storeVoiceResponse ─────────────────────────────────────────────────

export async function storeVoiceResponse(
  params: StoreVoiceParams,
): Promise<StoreVoiceResult> {
  const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? "").trim();
  const serviceRoleKey = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase runtime not configured for voice storage");
  }

  const ext = params.mimeType.includes("wav") ? "wav" : "mp3";
  const filePath = `${params.userId}/${crypto.randomUUID()}.${ext}`;

  const uploadRes = await fetch(
    `${supabaseUrl}/storage/v1/object/${VOICE_BUCKET}/${filePath}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": params.mimeType,
        "x-upsert": "true",
      },
      body: params.audio,
    },
  );

  if (!uploadRes.ok) {
    const errText = await uploadRes.text().catch(() => "");
    throw new Error(`Voice storage upload failed: ${uploadRes.status} ${errText.slice(0, 200)}`);
  }

  const restHeaders = {
    "Content-Type": "application/json",
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };

  await fetch(`${supabaseUrl}/rest/v1/voice_responses`, {
    method: "POST",
    headers: restHeaders,
    body: JSON.stringify({
      user_id: params.userId,
      message_id: params.messageId || null,
      session_id: params.sessionId || null,
      file_path: filePath,
      bucket: VOICE_BUCKET,
      voice_id: params.voiceId,
      language_code: params.languageCode,
      text_hash: params.textHash,
    }),
  });

  return { filePath, bucket: VOICE_BUCKET };
}

// ── generateAndStoreVoice ──────────────────────────────────────────────

export async function generateAndStoreVoice(
  params: GenerateAndStoreParams,
): Promise<GenerateAndStoreResult> {
  const startedAt = Date.now();
  const langCode = params.languageCode ?? "en-IN";
  const textHash = hashText(params.text);

  const speechResult = await generateSpeech(params.text, {
    languageCode: langCode,
    voiceRole: params.voiceRole,
    voiceId: params.voiceId,
  });

  const storeResult = await storeVoiceResponse({
    audio: speechResult.audio,
    mimeType: speechResult.mimeType,
    userId: params.userId,
    voiceId: speechResult.voiceId,
    languageCode: langCode,
    textHash,
    sessionId: params.sessionId,
    messageId: params.messageId,
  });

  const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? "").trim();
  const serviceRoleKey = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
  let audioUrl = "";

  if (supabaseUrl && serviceRoleKey) {
    try {
      const signRes = await fetch(
        `${supabaseUrl}/storage/v1/object/sign/${VOICE_BUCKET}/${storeResult.filePath}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ expiresIn: 300 }),
        },
      );
      if (signRes.ok) {
        const signData = await signRes.json();
        const signedPath = signData?.signedURL ?? signData?.signedUrl ?? "";
        audioUrl = signedPath
          ? `${supabaseUrl}/storage/v1${signedPath}`
          : "";
      }
    } catch {
      // Signed URL generation is best-effort
    }
  }

  const durationMs = Date.now() - startedAt;

  logStructured({
    event: "voice_generated_and_stored",
    user_id: params.userId,
    request_id: params.requestId,
    voice_id: speechResult.voiceId,
    language_code: langCode,
    duration_ms: durationMs,
    file_path: storeResult.filePath,
  });

  return {
    audio_url: audioUrl,
    file_path: storeResult.filePath,
    duration_ms: durationMs,
    voice_id: speechResult.voiceId,
    language_code: langCode,
  };
}
