/**
 * Integration test: Voice flow
 *
 * Simulates the full voice generation lifecycle:
 *   text → ElevenLabs API → storage upload → DB insert → signed URL
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const envVars: Record<string, string> = {
  ELEVENLABS_API_KEY: 'test-elevenlabs-key',
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  ELEVENLABS_VOICE_ID: 'test-voice-id',
  GEMINI_API_KEY: 'test-gemini-key',
};

(globalThis as any).Deno = {
  env: { get: (key: string) => envVars[key] ?? envVars[key.toUpperCase()] ?? '' },
};

const originalFetch = globalThis.fetch;
let fetchMock: ReturnType<typeof vi.fn>;
let fetchCallLog: string[] = [];

beforeEach(() => {
  fetchCallLog = [];
  fetchMock = vi.fn().mockImplementation((url: string | Request) => {
    const urlStr = typeof url === 'string' ? url : url.toString();
    fetchCallLog.push(urlStr);

    if (urlStr.includes('api.elevenlabs.io')) {
      const audioBytes = new Uint8Array([0xFF, 0xFB, 0x90, 0x00, 0x01, 0x02]);
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'audio/mpeg' }),
        arrayBuffer: () => Promise.resolve(audioBytes.buffer),
      });
    }

    if (urlStr.includes('/storage/v1/object/voice-responses')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ Key: 'voice-responses/user-123/test.mp3' }),
        text: () => Promise.resolve('{}'),
      });
    }

    if (urlStr.includes('/rest/v1/voice_responses')) {
      return Promise.resolve({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ id: 'vr-int-1' }),
      });
    }

    if (urlStr.includes('/storage/v1/object/sign')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          signedURL: '/object/sign/voice-responses/user-123/test.mp3?token=signed-abc',
        }),
      });
    }

    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });
  });
  globalThis.fetch = fetchMock as any;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('Voice flow integration', () => {
  it('full flow: text → ElevenLabs → storage → DB → signed URL', async () => {
    const { generateAndStoreVoice } = await import('../../supabase/functions/_shared/voice_service.ts');

    const result = await generateAndStoreVoice({
      text: 'Your tomato crop needs watering today.',
      userId: 'user-int-123',
      languageCode: 'en-IN',
      sessionId: 'session-456',
      requestId: 'req-int-voice-1',
    });

    expect(result.audio_url).toContain('test.supabase.co');
    expect(result.audio_url).toContain('signed');
    expect(result.file_path).toContain('user-int-123');
    expect(result.voice_id).toBeTruthy();
    expect(result.language_code).toBe('en-IN');
    expect(result.duration_ms).toBeGreaterThanOrEqual(0);

    const elevenLabsCalls = fetchCallLog.filter(u => u.includes('api.elevenlabs.io'));
    expect(elevenLabsCalls).toHaveLength(1);

    const storageCalls = fetchCallLog.filter(u => u.includes('/storage/v1/object/voice-responses'));
    expect(storageCalls).toHaveLength(1);

    const dbCalls = fetchCallLog.filter(u => u.includes('/rest/v1/voice_responses'));
    expect(dbCalls).toHaveLength(1);

    const signCalls = fetchCallLog.filter(u => u.includes('/storage/v1/object/sign'));
    expect(signCalls).toHaveLength(1);
  });

  it('handles Kannada language code', async () => {
    const { generateAndStoreVoice } = await import('../../supabase/functions/_shared/voice_service.ts');

    const result = await generateAndStoreVoice({
      text: 'ನಿಮ್ಮ ಟೊಮಾಟೊ ಬೆಳೆಗೆ ನೀರು ಹಾಕಿ.',
      userId: 'user-kn-456',
      languageCode: 'kn-IN',
      requestId: 'req-int-voice-2',
    });

    expect(result.language_code).toBe('kn-IN');
    expect(result.file_path).toContain('user-kn-456');
  });

  it('generateSpeech returns audio independently', async () => {
    const { generateSpeech } = await import('../../supabase/functions/_shared/voice_service.ts');

    const result = await generateSpeech('Quick test', {
      languageCode: 'en-IN',
      voiceRole: 'farmer',
    });

    expect(result.audio.byteLength).toBeGreaterThan(0);
    expect(result.mimeType).toBe('audio/mpeg');
  });

  it('storeVoiceResponse works independently', async () => {
    const { storeVoiceResponse } = await import('../../supabase/functions/_shared/voice_service.ts');

    const result = await storeVoiceResponse({
      audio: new ArrayBuffer(50),
      mimeType: 'audio/mpeg',
      userId: 'user-store-789',
      voiceId: 'voice-test',
      languageCode: 'en-IN',
      textHash: 'v_testhash',
      sessionId: 'sess-001',
    });

    expect(result.filePath).toContain('user-store-789');
    expect(result.bucket).toBe('voice-responses');
  });
});
