/**
 * Unit tests for knowledge_retrieval.ts and knowledge_embeddings.ts
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

describe('generateEmbedding', () => {
  it('calls Gemini embedding API and returns vector', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ embedding: { values: Array(768).fill(0.1) } }),
    });

    const { generateEmbedding } = await import('../../supabase/functions/_shared/knowledge_embeddings.ts');
    const result = await generateEmbedding('Tomato farming best practices');
    expect(result.embedding).toHaveLength(768);
    expect(result.model).toBe('text-embedding-004');
  });

  it('throws on empty text', async () => {
    const { generateEmbedding } = await import('../../supabase/functions/_shared/knowledge_embeddings.ts');
    await expect(generateEmbedding('')).rejects.toThrow('Cannot embed empty text');
  });

  it('throws on invalid dimension response', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ embedding: { values: [0.1, 0.2] } }),
    });

    const { generateEmbedding } = await import('../../supabase/functions/_shared/knowledge_embeddings.ts');
    await expect(generateEmbedding('Test')).rejects.toThrow('Invalid embedding dimensions');
  });
});

describe('assembleGroundingContext', () => {
  it('formats chunks with source attribution', async () => {
    const { assembleGroundingContext } = await import('../../supabase/functions/_shared/knowledge_retrieval.ts');
    const result = assembleGroundingContext([
      { chunkId: 'c1', content: 'Tomato needs 25mm water weekly.', similarity: 0.92,
        documentId: 'd1', documentTitle: 'Irrigation Guide', sourceName: 'ICAR', sourceType: 'research', trustLevel: 5 },
      { chunkId: 'c2', content: 'Apply NPK 19-19-19 at 50kg/acre.', similarity: 0.85,
        documentId: 'd2', documentTitle: 'Fertilizer Guide', sourceName: 'KVK', sourceType: 'extension', trustLevel: 4 },
    ]);

    expect(result.text).toContain('ICAR');
    expect(result.text).toContain('KVK');
    expect(result.text).toContain('Tomato needs');
    expect(result.chunkIds).toEqual(['c1', 'c2']);
    expect(result.sourceCount).toBe(2);
    expect(result.avgSimilarity).toBeGreaterThan(0.8);
  });

  it('returns empty for no chunks', async () => {
    const { assembleGroundingContext } = await import('../../supabase/functions/_shared/knowledge_retrieval.ts');
    const result = assembleGroundingContext([]);
    expect(result.text).toBe('');
    expect(result.chunkIds).toEqual([]);
    expect(result.sourceCount).toBe(0);
  });

  it('respects maxTokens limit', async () => {
    const { assembleGroundingContext } = await import('../../supabase/functions/_shared/knowledge_retrieval.ts');
    const chunks = Array(20).fill(null).map((_, i) => ({
      chunkId: `c${i}`, content: 'A '.repeat(200), similarity: 0.9 - i * 0.01,
      documentId: `d${i}`, documentTitle: `Doc ${i}`, sourceName: `Source ${i}`,
      sourceType: 'internal', trustLevel: 3,
    }));
    const result = assembleGroundingContext(chunks, 500);
    expect(result.chunkIds.length).toBeLessThan(20);
  });
});

describe('applyGroundingPolicy', () => {
  it('filters by trust level for pest_disease intent', async () => {
    const { applyGroundingPolicy } = await import('../../supabase/functions/_shared/knowledge_retrieval.ts');
    const chunks = [
      { chunkId: 'c1', content: 'A', similarity: 0.9, documentId: 'd1', documentTitle: 'D1',
        sourceName: 'S1', sourceType: 'internal', trustLevel: 2 },
      { chunkId: 'c2', content: 'B', similarity: 0.85, documentId: 'd2', documentTitle: 'D2',
        sourceName: 'S2', sourceType: 'research', trustLevel: 4 },
    ];
    const filtered = applyGroundingPolicy(chunks, 'pest_disease');
    expect(filtered.every(c => c.trustLevel >= 3)).toBe(true);
  });

  it('applies stricter similarity for farmer role', async () => {
    const { applyGroundingPolicy } = await import('../../supabase/functions/_shared/knowledge_retrieval.ts');
    const chunks = [
      { chunkId: 'c1', content: 'A', similarity: 0.68, documentId: 'd1', documentTitle: 'D1',
        sourceName: 'S1', sourceType: 'internal', trustLevel: 4 },
      { chunkId: 'c2', content: 'B', similarity: 0.75, documentId: 'd2', documentTitle: 'D2',
        sourceName: 'S2', sourceType: 'research', trustLevel: 5 },
    ];
    const farmerResult = applyGroundingPolicy(chunks, 'general', 'farmer');
    const adminResult = applyGroundingPolicy(chunks, 'general', 'admin');
    expect(farmerResult.length).toBeLessThanOrEqual(adminResult.length);
  });

  it('caps results at 5', async () => {
    const { applyGroundingPolicy } = await import('../../supabase/functions/_shared/knowledge_retrieval.ts');
    const chunks = Array(10).fill(null).map((_, i) => ({
      chunkId: `c${i}`, content: `Chunk ${i}`, similarity: 0.9,
      documentId: `d${i}`, documentTitle: `D${i}`, sourceName: `S${i}`,
      sourceType: 'internal', trustLevel: 5,
    }));
    expect(applyGroundingPolicy(chunks, 'general').length).toBeLessThanOrEqual(5);
  });
});

describe('searchKnowledge', () => {
  it('returns empty array when Supabase is not configured', async () => {
    const savedUrl = (globalThis as any).Deno.env.get('SUPABASE_URL');
    (globalThis as any).Deno = { env: { get: () => '' } };

    const { searchKnowledge } = await import('../../supabase/functions/_shared/knowledge_retrieval.ts');
    const results = await searchKnowledge('test query');
    expect(results).toEqual([]);

    (globalThis as any).Deno = {
      env: { get: (k: string) => k === 'SUPABASE_URL' ? 'https://test.supabase.co' : k === 'SUPABASE_SERVICE_ROLE_KEY' ? 'key' : k === 'GEMINI_API_KEY' ? 'gkey' : '' },
    };
  });
});
