/**
 * Unit tests for supabase/functions/_shared/advisory_engine.ts
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

beforeEach(() => { fetchMock = vi.fn(); globalThis.fetch = fetchMock as any; });
afterEach(() => { globalThis.fetch = originalFetch; vi.restoreAllMocks(); });

describe('validateAdvisoryResponse', () => {
  it('returns high confidence when chunks are strong', async () => {
    const { validateAdvisoryResponse } = await import('../../supabase/functions/_shared/advisory_engine.ts');
    const result = validateAdvisoryResponse(
      'Water your tomato plants in the morning.',
      [
        { chunkId: 'c1', content: 'Water tomato plants early morning for best absorption.', similarity: 0.92,
          documentId: 'd1', documentTitle: 'Irrigation Guide', sourceName: 'ICAR', sourceType: 'research', trustLevel: 5 },
        { chunkId: 'c2', content: 'Morning irrigation reduces disease risk.', similarity: 0.88,
          documentId: 'd2', documentTitle: 'Best Practices', sourceName: 'KVK', sourceType: 'extension', trustLevel: 4 },
      ],
      'en',
    );
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.guardrailFlags).toEqual([]);
    expect(result.disclaimerApplied).toBe(false);
  });

  it('adds disclaimer for low confidence', async () => {
    const { validateAdvisoryResponse } = await import('../../supabase/functions/_shared/advisory_engine.ts');
    const result = validateAdvisoryResponse(
      'Use 5ml pesticide per litre.',
      [],
      'en',
    );
    expect(result.confidence).toBeLessThan(0.4);
    expect(result.disclaimerApplied).toBe(true);
  });

  it('flags unsafe advice', async () => {
    const { validateAdvisoryResponse } = await import('../../supabase/functions/_shared/advisory_engine.ts');
    const result = validateAdvisoryResponse(
      'This will give you guaranteed yield of 50 quintals.',
      [{ chunkId: 'c1', content: 'Average yield is 30 quintals.', similarity: 0.8,
        documentId: 'd1', documentTitle: 'D', sourceName: 'S', sourceType: 'research', trustLevel: 4 }],
      'en',
    );
    expect(result.guardrailFlags).toContain('guaranteed_outcome');
  });
});

describe('simplifyForRole', () => {
  it('keeps admin response unchanged', async () => {
    const { simplifyForRole } = await import('../../supabase/functions/_shared/advisory_engine.ts');
    const text = 'Analysis of nitrogen (N) deficiency in paddy fields per hectare.';
    expect(simplifyForRole(text, 'admin')).toBe(text);
  });

  it('replaces hectare with acre for farmers', async () => {
    const { simplifyForRole } = await import('../../supabase/functions/_shared/advisory_engine.ts');
    const result = simplifyForRole('Apply 50kg per hectare of NPK.', 'farmer');
    expect(result).toContain('acre');
    expect(result).not.toContain('hectare');
  });

  it('truncates long farmer responses', async () => {
    const { simplifyForRole } = await import('../../supabase/functions/_shared/advisory_engine.ts');
    const longText = Array(200).fill('word').join(' ');
    const result = simplifyForRole(longText, 'farmer');
    expect(result.split(/\s+/).length).toBeLessThanOrEqual(151);
  });
});

describe('generateAdvisory', () => {
  it('generates advisory from Gemini response', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        candidates: [{ content: { parts: [{
          text: '{"reply":"Water your tomatoes in the morning.","advisory_type":"crop_guidance","key_points":["Morning watering"]}'
        }] } }],
      }),
    });

    const { generateAdvisory } = await import('../../supabase/functions/_shared/advisory_engine.ts');
    const result = await generateAdvisory({
      message: 'How should I water my tomatoes?',
      language: 'en',
      platformContext: { profile: { full_name: 'Test Farmer' } },
      retrievedChunks: [
        { chunkId: 'c1', content: 'Water tomatoes in morning.', similarity: 0.9,
          documentId: 'd1', documentTitle: 'Guide', sourceName: 'ICAR', sourceType: 'research', trustLevel: 5 },
      ],
      knowledgeContext: 'Water tomatoes in morning for best results.',
    });

    expect(result.reply).toContain('tomato');
    expect(result.advisoryType).toBe('crop_guidance');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.chunkIds).toEqual(['c1']);
  });

  it('returns fallback on Gemini failure', async () => {
    fetchMock.mockRejectedValueOnce(new Error('timeout'));

    const { generateAdvisory } = await import('../../supabase/functions/_shared/advisory_engine.ts');
    const result = await generateAdvisory({
      message: 'Test question',
      language: 'en',
      platformContext: {},
      retrievedChunks: [],
      knowledgeContext: '',
    });

    expect(result.reply).toBeTruthy();
    expect(result.disclaimerApplied).toBe(true);
  });
});
