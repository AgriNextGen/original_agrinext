/**
 * Unit tests for supabase/functions/_shared/voice_service.ts
 *
 * Tests speech generation, voice storage, and the combined flow
 * with mocked ElevenLabs API and Supabase Storage.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const envVars: Record<string, string> = {
  ELEVENLABS_API_KEY: 'test-elevenlabs-key',
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  ELEVENLABS_VOICE_ID: 'test-voice-id',
};

(globalThis as any).Deno = {
  env: { get: (key: string) => envVars[key] ?? envVars[key.toUpperCase()] ?? '' },
};

const originalFetch = globalThis.fetch;
let fetchMock: ReturnType<typeof vi.fn>;

function mockAudioResponse(ok = true, status = 200) {
  const audioBytes = new Uint8Array([0xFF, 0xFB, 0x90, 0x00]);
  return {
    ok,
    status,
    headers: new Headers({ 'content-type': 'audio/mpeg' }),
    arrayBuffer: () => Promise.resolve(audioBytes.buffer),
    text: () => Promise.resolve('error text'),
  };
}

function mockJsonResponse(data: unknown, ok = true) {
  return {
    ok,
    status: ok ? 200 : 500,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  };
}

beforeEach(() => {
  fetchMock = vi.fn();
  globalThis.fetch = fetchMock as any;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('generateSpeech', () => {
  it('calls ElevenLabs API and returns audio buffer', async () => {
    fetchMock.mockResolvedValueOnce(mockAudioResponse());

    const { generateSpeech } = await import('../../supabase/functions/_shared/voice_service.ts');
    const result = await generateSpeech('Hello farmer, your crops look healthy.');

    expect(result.audio).toBeDefined();
    expect(result.audio.byteLength).toBeGreaterThan(0);
    expect(result.mimeType).toBe('audio/mpeg');
    expect(result.voiceId).toBeTruthy();

    const callUrl = fetchMock.mock.calls[0][0] as string;
    expect(callUrl).toContain('api.elevenlabs.io');
    expect(callUrl).toContain('text-to-speech');
  });

  it('throws on empty text', async () => {
    const { generateSpeech } = await import('../../supabase/functions/_shared/voice_service.ts');
    await expect(generateSpeech('')).rejects.toThrow('text is required');
  });

  it('retries on 5xx error', async () => {
    fetchMock
      .mockResolvedValueOnce(mockAudioResponse(false, 500))
      .mockResolvedValueOnce(mockAudioResponse(true, 200));

    const { generateSpeech } = await import('../../supabase/functions/_shared/voice_service.ts');
    const result = await generateSpeech('Test retry');

    expect(result.audio).toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws provider_error on non-5xx failure', async () => {
    fetchMock.mockResolvedValueOnce(mockAudioResponse(false, 401));

    const { generateSpeech } = await import('../../supabase/functions/_shared/voice_service.ts');
    await expect(generateSpeech('Test error')).rejects.toThrow('ElevenLabs TTS failed: 401');
  });

  it('uses resolved voice ID from language code', async () => {
    fetchMock.mockResolvedValueOnce(mockAudioResponse());

    const { generateSpeech } = await import('../../supabase/functions/_shared/voice_service.ts');
    await generateSpeech('ನಮಸ್ಕಾರ', { languageCode: 'kn-IN' });

    const callUrl = fetchMock.mock.calls[0][0] as string;
    expect(callUrl).toContain('text-to-speech');
  });

  it('throws when ELEVENLABS_API_KEY is missing', async () => {
    const saved = envVars.ELEVENLABS_API_KEY;
    envVars.ELEVENLABS_API_KEY = '';

    const { generateSpeech } = await import('../../supabase/functions/_shared/voice_service.ts');
    await expect(generateSpeech('Test')).rejects.toThrow();

    envVars.ELEVENLABS_API_KEY = saved;
  });
});

describe('storeVoiceResponse', () => {
  it('uploads audio and inserts metadata row', async () => {
    // Storage upload
    fetchMock.mockResolvedValueOnce(mockJsonResponse({ Key: 'voice-responses/test.mp3' }));
    // DB insert
    fetchMock.mockResolvedValueOnce(mockJsonResponse({ id: 'voice-row-1' }));

    const { storeVoiceResponse } = await import('../../supabase/functions/_shared/voice_service.ts');
    const result = await storeVoiceResponse({
      audio: new ArrayBuffer(100),
      mimeType: 'audio/mpeg',
      userId: 'user-123',
      voiceId: 'voice-456',
      languageCode: 'en-IN',
      textHash: 'v_abc',
    });

    expect(result.filePath).toBeTruthy();
    expect(result.filePath).toContain('user-123');
    expect(result.bucket).toBe('voice-responses');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws when storage upload fails', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Storage error'),
    });

    const { storeVoiceResponse } = await import('../../supabase/functions/_shared/voice_service.ts');
    await expect(storeVoiceResponse({
      audio: new ArrayBuffer(100),
      mimeType: 'audio/mpeg',
      userId: 'user-123',
      voiceId: 'voice-456',
      languageCode: 'en-IN',
      textHash: 'v_abc',
    })).rejects.toThrow('Voice storage upload failed');
  });
});

describe('generateAndStoreVoice', () => {
  it('generates speech, stores, and returns signed URL', async () => {
    // ElevenLabs API
    fetchMock.mockResolvedValueOnce(mockAudioResponse());
    // Storage upload
    fetchMock.mockResolvedValueOnce(mockJsonResponse({ Key: 'test.mp3' }));
    // DB insert
    fetchMock.mockResolvedValueOnce(mockJsonResponse({ id: 'vr-1' }));
    // Signed URL
    fetchMock.mockResolvedValueOnce(mockJsonResponse({ signedURL: '/object/sign/voice-responses/test.mp3?token=abc' }));

    const { generateAndStoreVoice } = await import('../../supabase/functions/_shared/voice_service.ts');
    const result = await generateAndStoreVoice({
      text: 'Water your tomatoes in the morning.',
      userId: 'user-abc',
      languageCode: 'en-IN',
      requestId: 'req-test',
    });

    expect(result.audio_url).toContain('test.supabase.co');
    expect(result.file_path).toBeTruthy();
    expect(result.voice_id).toBeTruthy();
    expect(result.language_code).toBe('en-IN');
    expect(result.duration_ms).toBeGreaterThanOrEqual(0);
  });

  it('works even when signed URL generation fails', async () => {
    fetchMock.mockResolvedValueOnce(mockAudioResponse());
    fetchMock.mockResolvedValueOnce(mockJsonResponse({ Key: 'test.mp3' }));
    fetchMock.mockResolvedValueOnce(mockJsonResponse({ id: 'vr-1' }));
    fetchMock.mockRejectedValueOnce(new Error('Sign failed'));

    const { generateAndStoreVoice } = await import('../../supabase/functions/_shared/voice_service.ts');
    const result = await generateAndStoreVoice({
      text: 'Test text',
      userId: 'user-abc',
    });

    expect(result.audio_url).toBe('');
    expect(result.file_path).toBeTruthy();
  });
});
