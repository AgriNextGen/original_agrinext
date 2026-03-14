/**
 * E2E test: Voice-enabled chatbot flow
 *
 * Simulates the full user journey:
 *   user message with voice_response:true → chatbot response → voice generated → audio_url returned
 *
 * Mocks all external APIs but tests the complete orchestration across
 * ai_chat.ts, voice_service.ts, and the ai-gateway routing logic.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const envVars: Record<string, string> = {
  GEMINI_API_KEY: 'test-gemini-key',
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
let fetchCallLog: Array<{ url: string; method: string }> = [];

beforeEach(() => {
  fetchCallLog = [];
  fetchMock = vi.fn().mockImplementation((url: string | Request, init?: RequestInit) => {
    const urlStr = typeof url === 'string' ? url : url.toString();
    const method = init?.method ?? 'GET';
    fetchCallLog.push({ url: urlStr, method });

    // Gemini API (intent detection + chat response)
    if (urlStr.includes('generativelanguage.googleapis.com')) {
      const geminiCalls = fetchCallLog.filter(c => c.url.includes('generativelanguage'));
      if (geminiCalls.length <= 1) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            candidates: [{ content: { parts: [{ text: '{"intent":"crop_advice"}' }] } }],
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{ content: { parts: [{
            text: '{"reply":"Water your tomatoes early morning for best results. How many plants do you have?","suggestions":["Pest control","Fertilizer tips"]}'
          }] } }],
        }),
      });
    }

    // Supabase REST (profiles, crops, weather, market, chat_sessions, chat_messages, voice_responses)
    if (urlStr.includes('/rest/v1/profiles')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve([{
        full_name: 'Test Farmer', village: 'Hirekerur', taluk: 'Hirekerur',
        district: 'Haveri', pincode: '581111', preferred_language: 'en',
        total_land_area: 3, home_market_id: null,
      }]) });
    }
    if (urlStr.includes('/rest/v1/crops')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }
    if (urlStr.includes('/functions/v1/get-weather')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: null }) });
    }
    if (urlStr.includes('/rest/v1/market_prices')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }
    if (urlStr.includes('/rest/v1/chat_sessions')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'sess-e2e' }) });
    }
    if (urlStr.includes('/rest/v1/chat_messages')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }
    if (urlStr.includes('/rest/v1/voice_responses')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'vr-e2e' }) });
    }

    // ElevenLabs TTS
    if (urlStr.includes('api.elevenlabs.io')) {
      const audioBytes = new Uint8Array([0xFF, 0xFB, 0x90, 0x00]);
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'audio/mpeg' }),
        arrayBuffer: () => Promise.resolve(audioBytes.buffer),
      });
    }

    // Supabase Storage upload
    if (urlStr.includes('/storage/v1/object/voice-responses')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ Key: 'test.mp3' }) });
    }

    // Signed URL
    if (urlStr.includes('/storage/v1/object/sign')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          signedURL: '/object/sign/voice-responses/user/test.mp3?token=signed-e2e',
        }),
      });
    }

    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
  globalThis.fetch = fetchMock as any;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('Voice chatbot E2E', () => {
  it('generates chat response with voice audio URL when voice_response is true', async () => {
    const { generateChatResponse } = await import('../../supabase/functions/_shared/ai_chat.ts');
    const { generateAndStoreVoice } = await import('../../supabase/functions/_shared/voice_service.ts');

    // Step 1: Generate chat response
    const chatResult = await generateChatResponse({
      userId: 'user-e2e-001',
      authToken: 'test-bearer-token',
      message: 'How should I water my tomato plants?',
      requestId: 'req-e2e-001',
    });

    expect(chatResult.reply).toBeTruthy();
    expect(chatResult.reply.length).toBeGreaterThan(10);
    expect(chatResult.intent).toBeDefined();
    expect(chatResult.sessionId).toBeTruthy();

    // Step 2: Generate voice from the reply
    const voiceResult = await generateAndStoreVoice({
      text: chatResult.reply,
      userId: 'user-e2e-001',
      languageCode: chatResult.responseLanguage === 'kn' ? 'kn-IN' : 'en-IN',
      sessionId: chatResult.sessionId,
      requestId: 'req-e2e-001',
    });

    expect(voiceResult.audio_url).toBeTruthy();
    expect(voiceResult.audio_url).toContain('signed');
    expect(voiceResult.file_path).toContain('user-e2e-001');
    expect(voiceResult.voice_id).toBeTruthy();

    // Step 3: Verify the combined response shape matches API contract
    const combinedResponse = {
      reply: chatResult.reply,
      suggestions: chatResult.suggestions,
      session_id: chatResult.sessionId,
      audio_url: voiceResult.audio_url,
      metadata: {
        intent: chatResult.intent,
        model: chatResult.model,
        responseLanguage: chatResult.responseLanguage,
        voice_id: voiceResult.voice_id,
        duration_ms: voiceResult.duration_ms,
      },
    };

    expect(combinedResponse.reply).toBeTruthy();
    expect(combinedResponse.audio_url).toBeTruthy();
    expect(combinedResponse.session_id).toBeTruthy();
    expect(combinedResponse.metadata.intent).toBeDefined();
    expect(combinedResponse.metadata.voice_id).toBeTruthy();

    // Verify ElevenLabs was called
    const elevenLabsCalls = fetchCallLog.filter(c => c.url.includes('api.elevenlabs.io'));
    expect(elevenLabsCalls.length).toBeGreaterThanOrEqual(1);

    // Verify voice was stored
    const voiceStoreCalls = fetchCallLog.filter(c => c.url.includes('/storage/v1/object/voice-responses'));
    expect(voiceStoreCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('chat response works without voice when voice generation fails', async () => {
    const { generateChatResponse } = await import('../../supabase/functions/_shared/ai_chat.ts');

    // Step 1: Chat works fine
    const chatResult = await generateChatResponse({
      userId: 'user-e2e-002',
      authToken: 'test-bearer-token',
      message: 'What pest is attacking my rice?',
      requestId: 'req-e2e-002',
    });

    expect(chatResult.reply).toBeTruthy();

    // Step 2: Voice fails — should not break the flow
    fetchMock.mockRejectedValueOnce(new Error('ElevenLabs timeout'));

    let audioUrl: string | undefined;
    try {
      const { generateAndStoreVoice } = await import('../../supabase/functions/_shared/voice_service.ts');
      const voiceResult = await generateAndStoreVoice({
        text: chatResult.reply,
        userId: 'user-e2e-002',
      });
      audioUrl = voiceResult.audio_url;
    } catch {
      audioUrl = undefined;
    }

    // Text response is always available even when voice fails
    const response = {
      reply: chatResult.reply,
      suggestions: chatResult.suggestions,
      session_id: chatResult.sessionId,
      ...(audioUrl ? { audio_url: audioUrl } : {}),
    };

    expect(response.reply).toBeTruthy();
    expect(response.session_id).toBeTruthy();
  });

  it('Kannada voice response uses correct language code', async () => {
    const { generateAndStoreVoice } = await import('../../supabase/functions/_shared/voice_service.ts');

    const result = await generateAndStoreVoice({
      text: 'ನಿಮ್ಮ ಬೆಳೆಗೆ ನೀರು ಹಾಕಿ.',
      userId: 'user-e2e-kn',
      languageCode: 'kn-IN',
      requestId: 'req-e2e-kn',
    });

    expect(result.language_code).toBe('kn-IN');
    expect(result.audio_url).toBeTruthy();
  });
});
