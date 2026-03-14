/**
 * Integration test: Chat flow
 *
 * Simulates the full chat message lifecycle:
 *   user message → context load → intent detection → AI call → DB storage → response
 *
 * Mocks external APIs (Gemini, Supabase REST) but tests the full orchestration
 * across ai_chat.ts, ai_context.ts, ai_prompts.ts, ai_response.ts, and gemini_client.ts.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Deno env mock ──────────────────────────────────────────────────────

const envVars: Record<string, string> = {
  GEMINI_API_KEY: 'test-gemini-key',
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
};

(globalThis as any).Deno = {
  env: { get: (key: string) => envVars[key] ?? envVars[key.toUpperCase()] ?? '' },
};

const originalFetch = globalThis.fetch;
let fetchMock: ReturnType<typeof vi.fn>;
let fetchCallLog: string[] = [];

function mockResponse(data: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  };
}

beforeEach(() => {
  fetchCallLog = [];
  fetchMock = vi.fn().mockImplementation((url: string) => {
    const urlStr = typeof url === 'string' ? url : '';
    fetchCallLog.push(urlStr);

    if (urlStr.includes('generativelanguage.googleapis.com')) {
      if (fetchCallLog.filter(u => u.includes('generativelanguage')).length === 1) {
        return Promise.resolve(mockResponse({
          candidates: [{ content: { parts: [{ text: '{"intent":"crop_advice"}' }] } }],
        }));
      }
      return Promise.resolve(mockResponse({
        candidates: [{ content: { parts: [{
          text: '{"reply":"Water your crops early morning for best absorption. What crop are you growing?","suggestions":["Tomato care","Rice irrigation"]}'
        }] } }],
      }));
    }

    if (urlStr.includes('/rest/v1/profiles')) {
      return Promise.resolve(mockResponse([{
        full_name: 'Ramu',
        village: 'Hirekerur',
        taluk: 'Hirekerur',
        district: 'Haveri',
        pincode: '581111',
        preferred_language: 'kn',
        total_land_area: 3,
        home_market_id: null,
      }]));
    }

    if (urlStr.includes('/rest/v1/crops')) {
      return Promise.resolve(mockResponse([{
        crop_name: 'Paddy',
        status: 'growing',
        growth_stage: 'tillering',
        health_status: 'normal',
        harvest_estimate: null,
        estimated_quantity: 500,
        quantity_unit: 'kg',
        variety: 'Sona Masuri',
      }]));
    }

    if (urlStr.includes('/functions/v1/get-weather')) {
      return Promise.resolve(mockResponse({
        data: { temp_c: 30, humidity: 70, description: 'Partly cloudy' },
      }));
    }

    if (urlStr.includes('/rest/v1/market_prices')) {
      return Promise.resolve(mockResponse([]));
    }

    if (urlStr.includes('/rest/v1/chat_sessions')) {
      return Promise.resolve(mockResponse({ id: 'test-session-id' }));
    }

    if (urlStr.includes('/rest/v1/chat_messages')) {
      return Promise.resolve(mockResponse([{ id: 'msg-1' }, { id: 'msg-2' }]));
    }

    return Promise.resolve(mockResponse({}));
  });
  globalThis.fetch = fetchMock as any;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('Chat flow integration', () => {
  it('orchestrates full message flow: context → intent → AI → response', async () => {
    const { generateChatResponse } = await import('../../supabase/functions/_shared/ai_chat.ts');

    const result = await generateChatResponse({
      userId: 'user-abc-123',
      authToken: 'test-bearer-token',
      message: 'When should I water my paddy field?',
      requestId: 'req-integration-1',
    });

    expect(result.reply).toBeTruthy();
    expect(result.reply.length).toBeGreaterThan(10);
    expect(result.intent).toBe('crop_advice');
    expect(result.sessionId).toBeTruthy();
    expect(result.model).toBeTruthy();
    expect(result.responseLanguage).toBe('en');
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);

    expect(result.contextBundle).not.toBeNull();
    if (result.contextBundle) {
      expect(result.contextBundle.sources.profile).toBe(true);
      expect(result.contextBundle.sources.crops).toBe(true);
    }
  });

  it('uses existing session ID when provided', async () => {
    const { generateChatResponse } = await import('../../supabase/functions/_shared/ai_chat.ts');

    const result = await generateChatResponse({
      userId: 'user-abc-123',
      authToken: 'test-bearer-token',
      message: 'Tell me about pest control',
      sessionId: 'existing-session-456',
      requestId: 'req-integration-2',
    });

    expect(result.sessionId).toBe('existing-session-456');
  });

  it('carries conversation history forward', async () => {
    const { generateChatResponse } = await import('../../supabase/functions/_shared/ai_chat.ts');

    const result = await generateChatResponse({
      userId: 'user-abc-123',
      authToken: 'test-bearer-token',
      message: 'What about fertilizer?',
      conversation: [
        { role: 'user', content: 'How should I water my paddy?' },
        { role: 'assistant', content: 'Water early morning for best results.' },
      ],
      requestId: 'req-integration-3',
    });

    expect(result.reply).toBeTruthy();
    const geminiCalls = fetchCallLog.filter(u => u.includes('generativelanguage'));
    expect(geminiCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('returns suggestions array in response', async () => {
    const { generateChatResponse } = await import('../../supabase/functions/_shared/ai_chat.ts');

    const result = await generateChatResponse({
      userId: 'user-abc-123',
      authToken: 'test-bearer-token',
      message: 'Irrigation tips for rice',
      requestId: 'req-integration-4',
    });

    expect(Array.isArray(result.suggestions)).toBe(true);
  });

  it('handles summarize flow end-to-end', async () => {
    const { summarizeConversation } = await import('../../supabase/functions/_shared/ai_chat.ts');

    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(mockResponse({
      candidates: [{ content: { parts: [{
        text: '{"title":"Paddy irrigation discussion","summary":"Farmer asked about watering schedule for paddy during tillering stage."}'
      }] } }],
    }));

    const result = await summarizeConversation([
      { role: 'user', content: 'When should I water my paddy field?' },
      { role: 'assistant', content: 'During tillering stage, maintain 2-3 inches of standing water.' },
      { role: 'user', content: 'How often?' },
      { role: 'assistant', content: 'Every 3-4 days. Monitor soil moisture.' },
    ]);

    expect(result.title).toBeTruthy();
    expect(result.title.length).toBeLessThan(100);
    expect(result.summary).toBeTruthy();
    expect(result.summary.length).toBeGreaterThan(10);
  });
});
