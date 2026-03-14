/**
 * Integration test: Admin insights flow
 * admin query -> summary generation -> safe filtered output
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

(globalThis as any).Deno = {
  env: {
    get: (key: string) => {
      const vars: Record<string, string> = {
        GEMINI_API_KEY: 'test-key', gemini_api_key: 'test-key',
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'test-srv-key',
      };
      return vars[key] ?? '';
    },
  },
};

const originalFetch = globalThis.fetch;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn().mockImplementation((url: string) => {
    if (url.includes('generativelanguage.googleapis.com')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{ content: { parts: [{
            text: '{"summary":"The knowledge base has 3 active sources covering crop guidance and pest management. Coverage gaps exist in logistics and weather-specific advisories.","recommendations":["Add weather advisory sources","Expand logistics knowledge base"]}'
          }] } }],
        }),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
  globalThis.fetch = fetchMock as any;
});

afterEach(() => { globalThis.fetch = originalFetch; vi.restoreAllMocks(); });

describe('Admin insights flow', () => {
  it('generates analytical narrative from Gemini', async () => {
    const { generateGeminiText } = await import('../../supabase/functions/_shared/gemini_client.ts');
    const { parseJsonObject } = await import('../../supabase/functions/_shared/ai_response.ts');

    const result = await generateGeminiText({
      systemPrompt: 'You are an admin analytics AI. Provide concise summaries.',
      userPrompt: 'Summarize the knowledge base health and recommend improvements.',
      temperature: 0.3,
      maxOutputTokens: 512,
      timeoutMs: 12000,
      responseMimeType: 'application/json',
    });

    const parsed = parseJsonObject(result.text);
    expect(parsed).toBeDefined();
    expect(parsed?.summary).toBeTruthy();
    expect(parsed?.summary).toContain('knowledge base');
    expect(Array.isArray(parsed?.recommendations)).toBe(true);
    expect((parsed?.recommendations as string[]).length).toBeGreaterThan(0);
  });

  it('does not expose raw embeddings in output', async () => {
    const { generateGeminiText } = await import('../../supabase/functions/_shared/gemini_client.ts');

    const result = await generateGeminiText({
      systemPrompt: 'Admin analytics AI.',
      userPrompt: 'Summarize knowledge base.',
      temperature: 0.3,
      maxOutputTokens: 256,
    });

    expect(result.text).not.toContain('embedding');
    expect(result.text).not.toContain('[0.1,');
  });

  it('builds grounded prompt for admin role', async () => {
    const { buildGroundedSystemPrompt } = await import('../../supabase/functions/_shared/knowledge_prompts.ts');
    const prompt = buildGroundedSystemPrompt('en', 'admin');
    expect(prompt).toContain('analytical insights');
    expect(prompt).toContain('professional language');
    expect(prompt).toContain('GROUNDING RULES');
  });

  it('builds farmer prompt differently from admin', async () => {
    const { buildGroundedSystemPrompt } = await import('../../supabase/functions/_shared/knowledge_prompts.ts');
    const farmerPrompt = buildGroundedSystemPrompt('en');
    const adminPrompt = buildGroundedSystemPrompt('en', 'admin');
    expect(farmerPrompt).toContain('Krishi Mitra');
    expect(adminPrompt).not.toContain('Krishi Mitra');
  });
});
