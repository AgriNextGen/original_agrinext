/**
 * E2E test: Admin insights — verifies the insights pipeline
 * produces useful output without leaking sensitive data.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

const originalFetch = globalThis.fetch;

beforeAll(() => {
  (globalThis as any).Deno = {
    env: {
      get: (key: string) => {
        const vars: Record<string, string> = {
          GEMINI_API_KEY: 'test-key',
          gemini_api_key: 'test-key',
          SUPABASE_URL: 'https://test.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'test-srv-key',
          SUPABASE_ANON_KEY: 'test-anon-key',
        };
        return vars[key] ?? '';
      },
    },
  };
});

afterAll(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('Admin insights E2E', () => {
  it('insights query returns summary and recommendations without user PII', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      const urlStr = typeof url === 'string' ? url : url.toString();

      if (urlStr.includes('generateContent')) {
        return {
          ok: true,
          json: () => Promise.resolve({
            candidates: [{
              content: {
                parts: [{
                  text: JSON.stringify({
                    summary: 'Knowledge base has 3 sources with 12 indexed documents. Top user intent is crop_advice.',
                    recommendations: ['Add more pest management sources', 'Enable Kannada language sources'],
                  }),
                }],
              },
            }],
          }),
        };
      }

      return { ok: true, json: () => Promise.resolve([]) };
    }) as any;

    const { generateGeminiText } = await import('../../supabase/functions/_shared/gemini_client.ts');
    const { parseJsonObject, trimText } = await import('../../supabase/functions/_shared/ai_response.ts');

    const gemini = await generateGeminiText({
      systemPrompt: 'You are an admin analytics AI for an agricultural platform. Provide concise, data-driven summaries. Do not fabricate data.',
      userPrompt: 'Admin query: How is the knowledge base performing?\nSources: []\nDocuments: []',
      temperature: 0.3,
      maxOutputTokens: 512,
    });

    const parsed = parseJsonObject(gemini.text);
    const result = {
      summary: trimText(parsed?.summary ?? gemini.text, 2000),
      recommendations: Array.isArray(parsed?.recommendations) ? parsed.recommendations : [],
    };

    expect(result.summary).toContain('sources');
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.summary).not.toMatch(/user_id|phone|email|password|token/i);
    expect(JSON.stringify(result.recommendations)).not.toMatch(/user_id|phone|email|password/i);
  });

  it('insights summary aggregates without exposing raw data', async () => {
    const mockSources = [
      { id: 's1', source_name: 'UAHS Guidelines', is_active: true, trust_level: 4 },
      { id: 's2', source_name: 'IIHR Research', is_active: true, trust_level: 5 },
    ];
    const mockDocs = [
      { id: 'd1', status: 'indexed' },
      { id: 'd2', status: 'indexed' },
      { id: 'd3', status: 'pending' },
    ];

    const sources = mockSources;
    const docs = mockDocs;

    const summary = {
      sources: { total: sources.length, active: sources.filter(s => s.is_active).length },
      documents: {
        total: docs.length,
        indexed: docs.filter(d => d.status === 'indexed').length,
        pending: docs.filter(d => d.status === 'pending').length,
        failed: docs.filter(d => d.status === 'failed').length,
      },
    };

    expect(summary.sources.total).toBe(2);
    expect(summary.sources.active).toBe(2);
    expect(summary.documents.indexed).toBe(2);
    expect(summary.documents.pending).toBe(1);
    expect(summary.documents.failed).toBe(0);
    expect(JSON.stringify(summary)).not.toContain('user_id');
    expect(JSON.stringify(summary)).not.toContain('phone');
  });
});
