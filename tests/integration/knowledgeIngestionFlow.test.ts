/**
 * Integration test: Knowledge ingestion flow
 * source added -> crawl -> clean -> chunk -> embed -> store
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

(globalThis as any).Deno = {
  env: {
    get: (key: string) => {
      const vars: Record<string, string> = {
        firecrawl_api_key: 'test-fc-key', FIRECRAWL_API_KEY: 'test-fc-key',
        GEMINI_API_KEY: 'test-gemini-key', gemini_api_key: 'test-gemini-key',
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'test-srv-key',
      };
      return vars[key] ?? '';
    },
  },
};

const originalFetch = globalThis.fetch;
let fetchMock: ReturnType<typeof vi.fn>;
let fetchCallLog: string[] = [];

beforeEach(() => {
  fetchCallLog = [];
  fetchMock = vi.fn().mockImplementation((urlInput: string | Request | URL, init?: RequestInit) => {
    const url = typeof urlInput === 'string' ? urlInput : urlInput.toString();
    fetchCallLog.push(url);

    if (url.includes('firecrawl') || url.includes('scrape')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          data: {
            markdown: 'Tomato cultivation guide. Water tomatoes in the morning. Apply organic manure. Monitor for early blight symptoms. Harvest when fruits are firm and red.',
            metadata: { title: 'Tomato Guide' },
          },
        }),
      });
    }

    if (url.includes('embedContent')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ embedding: { values: Array(768).fill(0.1) } }),
      });
    }

    if (url.includes('/rest/v1/knowledge_embeddings')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }

    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
  globalThis.fetch = fetchMock as any;
});

afterEach(() => { globalThis.fetch = originalFetch; vi.restoreAllMocks(); });

describe('Knowledge ingestion flow', () => {
  it('clean -> chunk -> embed pipeline', async () => {
    const { cleanContent, chunkContent } = await import('../../supabase/functions/_shared/knowledge_crawl.ts');
    const { embedChunks } = await import('../../supabase/functions/_shared/knowledge_embeddings.ts');

    const rawHtml = '<p>Tomato cultivation guide.</p><script>bad()</script><p>Water tomatoes in the morning.</p><p>Apply organic manure.</p><p>Monitor for early blight symptoms.</p><p>Harvest when fruits are firm and red.</p>';
    const cleaned = cleanContent(rawHtml);
    expect(cleaned).toContain('Tomato');
    expect(cleaned).not.toContain('script');

    const chunks = chunkContent(cleaned);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].content).toBeTruthy();
    expect(chunks[0].contentHash).toBeTruthy();

    const embedResult = await embedChunks(
      chunks.map((c, i) => ({ chunkId: `chunk-${i}`, content: c.content })),
    );

    expect(embedResult.succeeded).toBe(chunks.length);
    expect(embedResult.failed).toBe(0);

    const embeddingCalls = fetchCallLog.filter(u => u.includes('embedContent'));
    expect(embeddingCalls.length).toBe(chunks.length);

    const storageCalls = fetchCallLog.filter(u => u.includes('knowledge_embeddings'));
    expect(storageCalls.length).toBe(chunks.length);
  });

  it('deduplicates content via checksums', async () => {
    const { computeChecksum } = await import('../../supabase/functions/_shared/knowledge_crawl.ts');

    const hash1 = await computeChecksum('Same content');
    const hash2 = await computeChecksum('Same content');
    const hash3 = await computeChecksum('Different content');

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
  });

  it('handles crawl failure gracefully', async () => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Server error'),
    });

    const { crawlSource } = await import('../../supabase/functions/_shared/knowledge_crawl.ts');
    await expect(crawlSource({
      id: 'src-fail', source_name: 'Failing', source_type: 'internal',
      base_url: 'https://fail.example.com', trust_level: 3, language: 'en',
    })).rejects.toThrow('Firecrawl failed');
  });
});
