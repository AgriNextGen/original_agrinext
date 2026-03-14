/**
 * E2E test: Low confidence fallback
 * farmer asks unsupported question -> weak retrieval -> safe fallback response
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const envVars: Record<string, string> = {
  GEMINI_API_KEY: 'test-key', gemini_api_key: 'test-key',
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-srv-key',
};

(globalThis as any).Deno = { env: { get: (key: string) => envVars[key] ?? '' } };

const originalFetch = globalThis.fetch;
let fetchMock: ReturnType<typeof vi.fn>;
let geminiCalls = 0;

beforeEach(() => {
  geminiCalls = 0;
  fetchMock = vi.fn().mockImplementation((url: string) => {
    const u = typeof url === 'string' ? url : '';

    if (u.includes('embedContent')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ embedding: { values: Array(768).fill(0.1) } }) });
    }

    // Return NO knowledge chunks (empty retrieval)
    if (u.includes('rpc/match_knowledge_chunks')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }

    if (u.includes('generateContent')) {
      geminiCalls++;
      if (geminiCalls === 1) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ candidates: [{ content: { parts: [{ text: '{"intent":"general"}' }] } }] }) });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{ content: { parts: [{
            text: '{"reply":"I do not have specific information about space farming techniques in the knowledge base. For specialized questions, please consult your local agricultural university.","suggestions":["Ask about crops","Ask about irrigation"],"advisory_type":"general"}'
          }] } }],
        }),
      });
    }

    if (u.includes('/rest/v1/profiles')) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    if (u.includes('/rest/v1/crops')) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    if (u.includes('/functions/v1/get-weather')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: null }) });
    if (u.includes('/rest/v1/market_prices')) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });

    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
  globalThis.fetch = fetchMock as any;
});

afterEach(() => { globalThis.fetch = originalFetch; vi.restoreAllMocks(); });

describe('Low confidence fallback E2E', () => {
  it('unsupported question -> empty retrieval -> safe fallback with disclaimer', async () => {
    const { generateGroundedChatResponse } = await import('../../supabase/functions/_shared/ai_chat.ts');

    const result = await generateGroundedChatResponse({
      userId: 'user-e2e-fallback-1',
      authToken: 'test-token',
      message: 'How do I farm on Mars using hydroponics in zero gravity?',
      requestId: 'req-e2e-fallback-1',
    });

    expect(result.reply).toBeTruthy();
    expect(result.grounding.retrievedChunkIds).toHaveLength(0);
    expect(result.grounding.groundingConfidence).toBeLessThan(0.4);
    expect(result.grounding.disclaimerApplied).toBe(true);
    expect(result.grounding.sourceCount).toBe(0);
    expect(result.reply).toContain('verified information');
  });

  it('response still includes session and intent metadata', async () => {
    const { generateGroundedChatResponse } = await import('../../supabase/functions/_shared/ai_chat.ts');

    const result = await generateGroundedChatResponse({
      userId: 'user-e2e-fallback-2',
      authToken: 'test-token',
      message: 'Tell me about alien farming techniques',
      requestId: 'req-e2e-fallback-2',
    });

    expect(result.sessionId).toBeTruthy();
    expect(result.intent).toBeDefined();
    expect(result.model).toBeTruthy();
    expect(result.responseLanguage).toBeDefined();
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('never crashes even with total retrieval failure', async () => {
    fetchMock.mockReset();
    fetchMock.mockImplementation(() => {
      return Promise.reject(new Error('Total network failure'));
    });

    const { generateGroundedChatResponse } = await import('../../supabase/functions/_shared/ai_chat.ts');

    const result = await generateGroundedChatResponse({
      userId: 'user-e2e-fallback-3',
      authToken: 'test-token',
      message: 'Any question',
      requestId: 'req-e2e-fallback-3',
    });

    expect(result.reply).toBeTruthy();
    expect(result.grounding).toBeDefined();
    expect(result.grounding.disclaimerApplied).toBe(true);
  });
});
