/**
 * Unit tests for supabase/functions/_shared/knowledge_crawl.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

(globalThis as any).Deno = {
  env: { get: (key: string) => key === 'firecrawl_api_key' ? 'test-firecrawl-key' : '' },
};

const originalFetch = globalThis.fetch;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  globalThis.fetch = fetchMock as any;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('cleanContent', () => {
  it('strips script tags', async () => {
    const { cleanContent } = await import('../../supabase/functions/_shared/knowledge_crawl.ts');
    const result = cleanContent('<p>Hello</p><script>alert("xss")</script><p>World</p>');
    expect(result).toContain('Hello');
    expect(result).toContain('World');
    expect(result).not.toContain('alert');
    expect(result).not.toContain('script');
  });

  it('strips style tags', async () => {
    const { cleanContent } = await import('../../supabase/functions/_shared/knowledge_crawl.ts');
    const result = cleanContent('<style>.foo{color:red}</style><p>Content</p>');
    expect(result).toContain('Content');
    expect(result).not.toContain('.foo');
  });

  it('strips nav/header/footer', async () => {
    const { cleanContent } = await import('../../supabase/functions/_shared/knowledge_crawl.ts');
    const result = cleanContent('<nav>Menu</nav><main>Article text</main><footer>Copyright</footer>');
    expect(result).toContain('Article text');
    expect(result).not.toContain('Menu');
  });

  it('converts HTML entities', async () => {
    const { cleanContent } = await import('../../supabase/functions/_shared/knowledge_crawl.ts');
    const result = cleanContent('&amp; &lt;tag&gt; &quot;quoted&quot;');
    expect(result).toContain('&');
    expect(result).toContain('<tag>');
    expect(result).toContain('"quoted"');
  });

  it('collapses whitespace', async () => {
    const { cleanContent } = await import('../../supabase/functions/_shared/knowledge_crawl.ts');
    const result = cleanContent('Hello     World\n\n\n\nNew paragraph');
    expect(result).not.toContain('     ');
    expect(result).not.toContain('\n\n\n');
  });
});

describe('chunkContent', () => {
  it('splits long text into multiple chunks', async () => {
    const { chunkContent } = await import('../../supabase/functions/_shared/knowledge_crawl.ts');
    const longText = Array(100).fill('This is a test sentence about agriculture and farming practices.').join(' ');
    const chunks = chunkContent(longText, 50);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].index).toBe(0);
    expect(chunks[1].index).toBe(1);
  });

  it('returns empty array for empty text', async () => {
    const { chunkContent } = await import('../../supabase/functions/_shared/knowledge_crawl.ts');
    expect(chunkContent('')).toEqual([]);
    expect(chunkContent('   ')).toEqual([]);
  });

  it('returns single chunk for short text', async () => {
    const { chunkContent } = await import('../../supabase/functions/_shared/knowledge_crawl.ts');
    const chunks = chunkContent('Short text about crops.');
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toContain('crops');
  });

  it('generates content hashes', async () => {
    const { chunkContent } = await import('../../supabase/functions/_shared/knowledge_crawl.ts');
    const chunks = chunkContent('Test sentence one. Test sentence two.');
    expect(chunks[0].contentHash).toBeTruthy();
    expect(chunks[0].contentHash).toMatch(/^ch_/);
  });

  it('estimates token counts', async () => {
    const { chunkContent } = await import('../../supabase/functions/_shared/knowledge_crawl.ts');
    const chunks = chunkContent('One two three four five.');
    expect(chunks[0].tokenCount).toBeGreaterThan(0);
  });
});

describe('computeChecksum', () => {
  it('returns hex string for text', async () => {
    const { computeChecksum } = await import('../../supabase/functions/_shared/knowledge_crawl.ts');
    const hash = await computeChecksum('Hello world');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns same hash for same input', async () => {
    const { computeChecksum } = await import('../../supabase/functions/_shared/knowledge_crawl.ts');
    const hash1 = await computeChecksum('Test content');
    const hash2 = await computeChecksum('Test content');
    expect(hash1).toBe(hash2);
  });

  it('returns different hash for different input', async () => {
    const { computeChecksum } = await import('../../supabase/functions/_shared/knowledge_crawl.ts');
    const hash1 = await computeChecksum('Content A');
    const hash2 = await computeChecksum('Content B');
    expect(hash1).not.toBe(hash2);
  });
});

describe('crawlSource', () => {
  it('calls Firecrawl API and returns cleaned content', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: {
          markdown: '# Agriculture Guide\n\nTomato farming requires proper irrigation.',
          metadata: { title: 'Agri Guide' },
        },
      }),
    });

    const { crawlSource } = await import('../../supabase/functions/_shared/knowledge_crawl.ts');
    const result = await crawlSource({
      id: 'src-1', source_name: 'Test Source', source_type: 'internal',
      base_url: 'https://example.com/guide', trust_level: 4, language: 'en',
    });

    expect(result.title).toBe('Agri Guide');
    expect(result.content).toContain('Tomato farming');
    expect(result.checksum).toMatch(/^[0-9a-f]+$/);
  });

  it('throws on empty Firecrawl response', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { markdown: '' } }),
    });

    const { crawlSource } = await import('../../supabase/functions/_shared/knowledge_crawl.ts');
    await expect(crawlSource({
      id: 'src-1', source_name: 'Test', source_type: 'internal',
      base_url: 'https://example.com', trust_level: 3, language: 'en',
    })).rejects.toThrow('empty content');
  });
});
