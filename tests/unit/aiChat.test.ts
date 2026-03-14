/**
 * Unit tests for supabase/functions/_shared/ai_chat.ts
 *
 * Tests intent detection, conversation summarization, and response generation
 * with mocked Gemini API and Supabase calls.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Deno env mock ──────────────────────────────────────────────────────

const envVars: Record<string, string> = {
  GEMINI_API_KEY: 'test-gemini-key',
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
};

const mockDeno = {
  env: {
    get: (key: string) => envVars[key] ?? envVars[key.toUpperCase()] ?? '',
  },
};

(globalThis as any).Deno = mockDeno;

// ── Fetch mock ─────────────────────────────────────────────────────────

const originalFetch = globalThis.fetch;
let fetchMock: ReturnType<typeof vi.fn>;

function createGeminiResponse(text: string) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve({
      candidates: [{
        content: {
          parts: [{ text }],
        },
      }],
    }),
  };
}

function createSupabaseRestResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
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

// ── Intent detection tests ─────────────────────────────────────────────

describe('detectIntent', () => {
  it('classifies crop advice intent via Gemini', async () => {
    fetchMock.mockResolvedValueOnce(
      createGeminiResponse('{"intent":"crop_advice"}')
    );

    const { detectIntent } = await import('../../supabase/functions/_shared/ai_chat.ts');
    const intent = await detectIntent('How should I treat my tomato plants?');
    expect(intent).toBe('crop_advice');
  });

  it('classifies weather query intent', async () => {
    fetchMock.mockResolvedValueOnce(
      createGeminiResponse('{"intent":"weather_query"}')
    );

    const { detectIntent } = await import('../../supabase/functions/_shared/ai_chat.ts');
    const intent = await detectIntent('Will it rain tomorrow?');
    expect(intent).toBe('weather_query');
  });

  it('classifies market price intent', async () => {
    fetchMock.mockResolvedValueOnce(
      createGeminiResponse('{"intent":"market_price"}')
    );

    const { detectIntent } = await import('../../supabase/functions/_shared/ai_chat.ts');
    const intent = await detectIntent('What is the mandi price for onion?');
    expect(intent).toBe('market_price');
  });

  it('returns general for unknown intents', async () => {
    fetchMock.mockResolvedValueOnce(
      createGeminiResponse('{"intent":"something_invalid"}')
    );

    const { detectIntent } = await import('../../supabase/functions/_shared/ai_chat.ts');
    const intent = await detectIntent('Tell me a joke');
    expect(intent).toBe('general');
  });

  it('falls back to local inference on API error', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network error'));

    const { detectIntent } = await import('../../supabase/functions/_shared/ai_chat.ts');
    const intent = await detectIntent('What is the weather forecast?');
    expect(intent).toBe('weather_query');
  });

  it('returns general for empty message', async () => {
    const { detectIntent } = await import('../../supabase/functions/_shared/ai_chat.ts');
    const intent = await detectIntent('');
    expect(intent).toBe('general');
  });

  it('handles local fallback for pest/disease keywords', async () => {
    fetchMock.mockRejectedValueOnce(new Error('timeout'));

    const { detectIntent } = await import('../../supabase/functions/_shared/ai_chat.ts');
    const intent = await detectIntent('My crop has a fungus problem');
    expect(intent).toBe('pest_disease');
  });

  it('handles local fallback for transport keywords', async () => {
    fetchMock.mockRejectedValueOnce(new Error('timeout'));

    const { detectIntent } = await import('../../supabase/functions/_shared/ai_chat.ts');
    const intent = await detectIntent('I need a truck for pickup');
    expect(intent).toBe('transport');
  });

  it('handles local fallback for irrigation keywords', async () => {
    fetchMock.mockRejectedValueOnce(new Error('timeout'));

    const { detectIntent } = await import('../../supabase/functions/_shared/ai_chat.ts');
    const intent = await detectIntent('When should I irrigate my field?');
    expect(intent).toBe('irrigation');
  });
});

// ── Summarization tests ────────────────────────────────────────────────

describe('summarizeConversation', () => {
  it('summarizes conversation via Gemini', async () => {
    fetchMock.mockResolvedValueOnce(
      createGeminiResponse('{"title":"Tomato pest issue","summary":"Farmer asked about tomato plant disease treatment."}')
    );

    const { summarizeConversation } = await import('../../supabase/functions/_shared/ai_chat.ts');
    const result = await summarizeConversation([
      { role: 'user', content: 'My tomato plants have spots' },
      { role: 'assistant', content: 'Sounds like early blight. Try copper-based fungicide.' },
    ]);

    expect(result.title).toBe('Tomato pest issue');
    expect(result.summary).toContain('tomato');
  });

  it('returns fallback for empty messages', async () => {
    const { summarizeConversation } = await import('../../supabase/functions/_shared/ai_chat.ts');
    const result = await summarizeConversation([]);
    expect(result.title).toBe('Empty conversation');
    expect(result.summary).toContain('No messages');
  });

  it('falls back to first user message on API error', async () => {
    fetchMock.mockRejectedValueOnce(new Error('API error'));

    const { summarizeConversation } = await import('../../supabase/functions/_shared/ai_chat.ts');
    const result = await summarizeConversation([
      { role: 'user', content: 'Help with my rice crop' },
      { role: 'assistant', content: 'Sure, what is the issue?' },
    ]);

    expect(result.title).toContain('rice crop');
    expect(result.summary).toContain('2 messages');
  });
});

// ── Chat response generation tests ─────────────────────────────────────

describe('generateChatResponse', () => {
  it('generates a response with intent detection and context', async () => {
    // Intent detection call
    fetchMock.mockResolvedValueOnce(
      createGeminiResponse('{"intent":"crop_advice"}')
    );
    // Context: profile fetch
    fetchMock.mockResolvedValueOnce(
      createSupabaseRestResponse([{
        full_name: 'Test Farmer',
        village: 'Test Village',
        taluk: 'Test Taluk',
        district: 'Test District',
        pincode: '560001',
        preferred_language: 'en',
        total_land_area: 5,
        home_market_id: null,
      }])
    );
    // Context: crops fetch
    fetchMock.mockResolvedValueOnce(
      createSupabaseRestResponse([{
        crop_name: 'Tomato',
        status: 'growing',
        growth_stage: 'flowering',
        health_status: 'normal',
        harvest_estimate: null,
        estimated_quantity: 100,
        quantity_unit: 'kg',
        variety: 'hybrid',
      }])
    );
    // Context: weather fetch
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { temp_c: 28, humidity: 60 } }),
    });
    // Context: market prices fetch
    fetchMock.mockResolvedValueOnce(
      createSupabaseRestResponse([])
    );
    // Main Gemini chat call
    fetchMock.mockResolvedValueOnce(
      createGeminiResponse('{"reply":"Water your tomatoes in the morning for best results.","suggestions":["Fertilizer tips","Pest prevention"]}')
    );

    const { generateChatResponse } = await import('../../supabase/functions/_shared/ai_chat.ts');
    const result = await generateChatResponse({
      userId: 'test-user-id',
      authToken: 'test-token',
      message: 'How should I water my tomato plants?',
      requestId: 'test-req-id',
    });

    expect(result.reply).toContain('tomato');
    expect(result.intent).toBe('crop_advice');
    expect(result.sessionId).toBeTruthy();
    expect(result.model).toBeTruthy();
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.responseLanguage).toBe('en');
  });

  it('throws error for empty message', async () => {
    const { generateChatResponse } = await import('../../supabase/functions/_shared/ai_chat.ts');
    await expect(generateChatResponse({
      userId: 'test-user-id',
      authToken: 'test-token',
      message: '',
    })).rejects.toThrow('message is required');
  });

  it('returns fallback on Gemini failure', async () => {
    // Intent fallback
    fetchMock.mockRejectedValueOnce(new Error('timeout'));
    // Context calls all fail
    fetchMock.mockRejectedValueOnce(new Error('db error'));
    fetchMock.mockRejectedValueOnce(new Error('db error'));
    fetchMock.mockRejectedValueOnce(new Error('db error'));
    fetchMock.mockRejectedValueOnce(new Error('db error'));
    // Main chat call fails
    fetchMock.mockRejectedValueOnce(new Error('Gemini request timed out'));

    const { generateChatResponse } = await import('../../supabase/functions/_shared/ai_chat.ts');
    const result = await generateChatResponse({
      userId: 'test-user-id',
      authToken: 'test-token',
      message: 'Hello',
      requestId: 'test-req-id',
    });

    expect(result.reply).toBeTruthy();
    expect(result.suggestions.length).toBeGreaterThan(0);
  });
});

// ── generateGroundedChatResponse tests ─────────────────────────────────

describe('generateGroundedChatResponse', () => {
  it('returns grounded response with grounding metadata', async () => {
    fetchMock.mockImplementation((url: string) => {
      const u = typeof url === 'string' ? url : '';
      if (u.includes('embedContent')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ embedding: { values: Array(768).fill(0.1) } }) });
      }
      if (u.includes('rpc/match_knowledge_chunks')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([
          { chunk_id: 'c1', content: 'Water tomatoes in the morning.', similarity: 0.92,
            document_id: 'd1', document_title: 'Guide', source_name: 'ICAR', source_type: 'research', trust_level: 5, chunk_metadata: {} },
        ]) });
      }
      if (u.includes('generativelanguage.googleapis.com')) {
        const isIntent = fetchMock.mock.calls.filter((c: any[]) => String(c[0]).includes('generativelanguage')).length <= 1;
        if (isIntent) return Promise.resolve({ ok: true, json: () => Promise.resolve({ candidates: [{ content: { parts: [{ text: '{"intent":"crop_advice"}' }] } }] }) });
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ candidates: [{ content: { parts: [{ text: '{"reply":"Water tomatoes in the morning.","suggestions":["Pest control"],"advisory_type":"crop_guidance"}' }] } }] }) });
      }
      if (u.includes('/rest/v1/profiles')) return Promise.resolve({ ok: true, json: () => Promise.resolve([{ full_name: 'Test' }]) });
      if (u.includes('/rest/v1/crops')) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      if (u.includes('/functions/v1/get-weather')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: null }) });
      if (u.includes('/rest/v1/market_prices')) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    const { generateGroundedChatResponse } = await import('../../supabase/functions/_shared/ai_chat.ts');
    const result = await generateGroundedChatResponse({
      userId: 'user-grounded-1',
      authToken: 'test-token',
      message: 'When should I water my tomatoes?',
      requestId: 'req-grounded-1',
    });

    expect(result.reply).toBeTruthy();
    expect(result.grounding).toBeDefined();
    expect(typeof result.grounding.groundingConfidence).toBe('number');
    expect(typeof result.grounding.disclaimerApplied).toBe('boolean');
    expect(Array.isArray(result.grounding.guardrailFlags)).toBe(true);
    expect(result.sessionId).toBeTruthy();
    expect(result.model).toBeTruthy();
  });

  it('returns safe fallback when no knowledge is retrieved', async () => {
    // Intent
    fetchMock.mockResolvedValueOnce(createGeminiResponse('{"intent":"general"}'));
    // Profile
    fetchMock.mockResolvedValueOnce(createSupabaseRestResponse([]));
    // Crops
    fetchMock.mockResolvedValueOnce(createSupabaseRestResponse([]));
    // Weather
    fetchMock.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: null }) });
    // Market
    fetchMock.mockResolvedValueOnce(createSupabaseRestResponse([]));
    // Embedding
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ embedding: { values: Array(768).fill(0.1) } }),
    });
    // Vector search empty
    fetchMock.mockResolvedValueOnce(createSupabaseRestResponse([]));
    // Gemini
    fetchMock.mockResolvedValueOnce(
      createGeminiResponse('{"reply":"I cannot find information on this topic.","suggestions":[],"advisory_type":"general"}')
    );

    const { generateGroundedChatResponse } = await import('../../supabase/functions/_shared/ai_chat.ts');
    const result = await generateGroundedChatResponse({
      userId: 'user-grounded-2',
      authToken: 'test-token',
      message: 'How do I farm on Mars?',
      requestId: 'req-grounded-2',
    });

    expect(result.reply).toBeTruthy();
    expect(result.grounding.retrievedChunkIds).toHaveLength(0);
    expect(result.grounding.groundingConfidence).toBeLessThan(0.4);
    expect(result.grounding.disclaimerApplied).toBe(true);
  });

  it('still works when all retrieval services fail', async () => {
    fetchMock.mockRejectedValue(new Error('total failure'));

    const { generateGroundedChatResponse } = await import('../../supabase/functions/_shared/ai_chat.ts');
    const result = await generateGroundedChatResponse({
      userId: 'user-grounded-3',
      authToken: 'test-token',
      message: 'Help me',
      requestId: 'req-grounded-3',
    });

    expect(result.reply).toBeTruthy();
    expect(result.grounding).toBeDefined();
    expect(result.grounding.disclaimerApplied).toBe(true);
  });
});
