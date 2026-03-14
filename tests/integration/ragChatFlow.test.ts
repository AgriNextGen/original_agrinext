/**
 * Integration test: RAG chat flow
 * user question -> retrieval -> grounded prompt -> Gemini -> validated response -> grounding metadata
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const envVars: Record<string, string> = {
  GEMINI_API_KEY: 'test-gemini-key', gemini_api_key: 'test-gemini-key',
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-srv-key',
};

(globalThis as any).Deno = { env: { get: (key: string) => envVars[key] ?? '' } };

const originalFetch = globalThis.fetch;
let fetchMock: ReturnType<typeof vi.fn>;
let geminiCallCount = 0;

beforeEach(() => {
  geminiCallCount = 0;
  fetchMock = vi.fn().mockImplementation((url: string) => {
    const urlStr = typeof url === 'string' ? url : '';

    if (urlStr.includes('embedContent')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ embedding: { values: Array(768).fill(0.1) } }),
      });
    }

    if (urlStr.includes('rpc/match_knowledge_chunks')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
          { chunk_id: 'c1', content: 'Tomato early blight is caused by Alternaria solani. Use copper-based fungicide.', similarity: 0.92,
            document_id: 'd1', document_title: 'Disease Guide', source_name: 'ICAR', source_type: 'research', trust_level: 5, chunk_metadata: {} },
          { chunk_id: 'c2', content: 'Remove affected leaves and improve air circulation around plants.', similarity: 0.87,
            document_id: 'd1', document_title: 'Disease Guide', source_name: 'ICAR', source_type: 'research', trust_level: 5, chunk_metadata: {} },
        ]),
      });
    }

    if (urlStr.includes('generativelanguage.googleapis.com') && urlStr.includes('generateContent')) {
      geminiCallCount++;
      if (geminiCallCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            candidates: [{ content: { parts: [{ text: '{"intent":"pest_disease"}' }] } }],
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{ content: { parts: [{
            text: '{"reply":"Based on ICAR research, early blight is caused by Alternaria solani. Remove affected leaves and use copper-based fungicide as recommended. Have you noticed lesions on stems too?","suggestions":["Show disease photo","Organic treatment"],"advisory_type":"pest_help"}'
          }] } }],
        }),
      });
    }

    if (urlStr.includes('/rest/v1/profiles')) return Promise.resolve({ ok: true, json: () => Promise.resolve([{ full_name: 'Test', district: 'Haveri' }]) });
    if (urlStr.includes('/rest/v1/crops')) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    if (urlStr.includes('/functions/v1/get-weather')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: null }) });
    if (urlStr.includes('/rest/v1/market_prices')) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });

    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
  globalThis.fetch = fetchMock as any;
});

afterEach(() => { globalThis.fetch = originalFetch; vi.restoreAllMocks(); });

describe('RAG chat flow integration', () => {
  it('retrieves knowledge, builds grounded prompt, returns validated response with metadata', async () => {
    const { generateGroundedChatResponse } = await import('../../supabase/functions/_shared/ai_chat.ts');

    const result = await generateGroundedChatResponse({
      userId: 'user-rag-1',
      authToken: 'test-token',
      message: 'My tomato plant has dark spots on leaves. What is the disease?',
      requestId: 'req-rag-1',
    });

    expect(result.reply).toBeTruthy();
    expect(result.reply.length).toBeGreaterThan(20);
    expect(result.intent).toBe('pest_disease');
    expect(result.grounding).toBeDefined();
    expect(result.grounding.retrievedChunkIds.length).toBeGreaterThan(0);
    expect(result.grounding.groundingConfidence).toBeGreaterThan(0.4);
    expect(result.grounding.advisoryType).toBe('pest_help');
    expect(result.grounding.sourceCount).toBeGreaterThanOrEqual(1);
    expect(result.sessionId).toBeTruthy();
    expect(result.model).toBeTruthy();
  });

  it('includes grounding metadata even when retrieval returns few results', async () => {
    const { generateGroundedChatResponse } = await import('../../supabase/functions/_shared/ai_chat.ts');

    const result = await generateGroundedChatResponse({
      userId: 'user-rag-2',
      authToken: 'test-token',
      message: 'What fertilizer should I use?',
      requestId: 'req-rag-2',
    });

    expect(result.grounding).toBeDefined();
    expect(Array.isArray(result.grounding.guardrailFlags)).toBe(true);
    expect(typeof result.grounding.groundingConfidence).toBe('number');
  });

  it('falls back safely when all services fail', async () => {
    fetchMock.mockReset();
    fetchMock.mockRejectedValue(new Error('Network failure'));

    const { generateGroundedChatResponse } = await import('../../supabase/functions/_shared/ai_chat.ts');
    const result = await generateGroundedChatResponse({
      userId: 'user-rag-3',
      authToken: 'test-token',
      message: 'Help with my crops',
      requestId: 'req-rag-3',
    });

    expect(result.reply).toBeTruthy();
    expect(result.grounding.groundingConfidence).toBeLessThan(0.4);
    expect(result.grounding.disclaimerApplied).toBe(true);
  });
});
