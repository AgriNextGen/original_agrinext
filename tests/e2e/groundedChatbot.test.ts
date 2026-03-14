/**
 * E2E test: Grounded chatbot
 * farmer asks known question -> retrieval succeeds -> grounded response returned
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

    if (u.includes('rpc/match_knowledge_chunks')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
          { chunk_id: 'c1', content: 'For ragi, apply 25kg urea per acre at tillering stage. Use organic manure as basal dose.', similarity: 0.93,
            document_id: 'd1', document_title: 'Ragi Guide', source_name: 'UAS Dharwad', source_type: 'research', trust_level: 5, chunk_metadata: {} },
          { chunk_id: 'c2', content: 'Ragi requires moderate water. Irrigate every 7-10 days during grain filling.', similarity: 0.88,
            document_id: 'd1', document_title: 'Ragi Guide', source_name: 'UAS Dharwad', source_type: 'research', trust_level: 5, chunk_metadata: {} },
        ]),
      });
    }

    if (u.includes('generateContent')) {
      geminiCalls++;
      if (geminiCalls === 1) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ candidates: [{ content: { parts: [{ text: '{"intent":"crop_advice"}' }] } }] }) });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{ content: { parts: [{
            text: '{"reply":"Based on UAS Dharwad research, apply 25kg urea per acre at tillering stage for ragi. Use organic manure as basal dose. Irrigate every 7-10 days during grain filling. Are you in tillering stage now?","suggestions":["Ragi pest control","Organic manure tips"],"advisory_type":"crop_guidance"}'
          }] } }],
        }),
      });
    }

    if (u.includes('/rest/v1/profiles')) return Promise.resolve({ ok: true, json: () => Promise.resolve([{ full_name: 'Ramu', district: 'Dharwad' }]) });
    if (u.includes('/rest/v1/crops')) return Promise.resolve({ ok: true, json: () => Promise.resolve([{ crop_name: 'Ragi', growth_stage: 'tillering' }]) });
    if (u.includes('/functions/v1/get-weather')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: null }) });
    if (u.includes('/rest/v1/market_prices')) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });

    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
  globalThis.fetch = fetchMock as any;
});

afterEach(() => { globalThis.fetch = originalFetch; vi.restoreAllMocks(); });

describe('Grounded chatbot E2E', () => {
  it('farmer asks known question -> retrieval succeeds -> grounded response with sources', async () => {
    const { generateGroundedChatResponse } = await import('../../supabase/functions/_shared/ai_chat.ts');

    const result = await generateGroundedChatResponse({
      userId: 'user-e2e-grounded-1',
      authToken: 'test-token',
      message: 'What fertilizer should I apply for ragi at tillering stage?',
      requestId: 'req-e2e-grounded-1',
    });

    expect(result.reply).toContain('urea');
    expect(result.reply).toContain('tillering');
    expect(result.intent).toBe('crop_advice');
    expect(result.grounding.retrievedChunkIds.length).toBeGreaterThan(0);
    expect(result.grounding.groundingConfidence).toBeGreaterThan(0.5);
    expect(result.grounding.advisoryType).toBe('crop_guidance');
    expect(result.grounding.sourceCount).toBeGreaterThanOrEqual(1);
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.sessionId).toBeTruthy();
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('response does not contain fabricated schemes or guaranteed yields', async () => {
    const { generateGroundedChatResponse } = await import('../../supabase/functions/_shared/ai_chat.ts');

    const result = await generateGroundedChatResponse({
      userId: 'user-e2e-grounded-2',
      authToken: 'test-token',
      message: 'How much ragi yield can I expect?',
      requestId: 'req-e2e-grounded-2',
    });

    expect(result.reply.toLowerCase()).not.toContain('guaranteed yield');
    expect(result.grounding.guardrailFlags.filter(f => f === 'guaranteed_outcome')).toHaveLength(0);
  });
});
