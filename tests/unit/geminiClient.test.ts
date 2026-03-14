/**
 * Unit tests for gemini_client.ts
 * Verifies Gemini API call structure, timeout handling, response parsing.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';

const originalFetch = globalThis.fetch;

beforeAll(() => {
  (globalThis as any).Deno = {
    env: {
      get: (key: string) => {
        const vars: Record<string, string> = {
          GEMINI_API_KEY: 'test-gemini-key',
          gemini_api_key: 'test-gemini-key',
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

describe('generateGeminiText', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sends correct request structure and extracts text', async () => {
    let capturedBody: any;
    globalThis.fetch = vi.fn().mockImplementation(async (url: string, init: any) => {
      capturedBody = JSON.parse(init.body);
      return {
        ok: true,
        json: () => Promise.resolve({
          candidates: [{ content: { parts: [{ text: 'Test response' }] } }],
        }),
      };
    }) as any;

    const { generateGeminiText } = await import('../../supabase/functions/_shared/gemini_client.ts');
    const result = await generateGeminiText({
      systemPrompt: 'You are a test bot.',
      userPrompt: 'Hello world',
      temperature: 0.5,
      maxOutputTokens: 256,
    });

    expect(result.text).toBe('Test response');
    expect(result.model).toBe('gemini-2.0-flash');
    expect(capturedBody.systemInstruction.parts[0].text).toBe('You are a test bot.');
    expect(capturedBody.contents).toHaveLength(1);
    expect(capturedBody.contents[0].parts[0].text).toBe('Hello world');
    expect(capturedBody.generationConfig.temperature).toBe(0.5);
    expect(capturedBody.generationConfig.maxOutputTokens).toBe(256);
  });

  it('includes conversation history mapped to Gemini roles', async () => {
    let capturedBody: any;
    globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init: any) => {
      capturedBody = JSON.parse(init.body);
      return {
        ok: true,
        json: () => Promise.resolve({
          candidates: [{ content: { parts: [{ text: 'Reply' }] } }],
        }),
      };
    }) as any;

    const { generateGeminiText } = await import('../../supabase/functions/_shared/gemini_client.ts');
    await generateGeminiText({
      systemPrompt: 'System',
      userPrompt: 'Current message',
      conversation: [
        { role: 'user', content: 'Previous question' },
        { role: 'assistant', content: 'Previous answer' },
      ],
    });

    expect(capturedBody.contents).toHaveLength(3);
    expect(capturedBody.contents[0].role).toBe('user');
    expect(capturedBody.contents[1].role).toBe('model');
    expect(capturedBody.contents[2].role).toBe('user');
  });

  it('throws on non-ok response', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async () => ({
      ok: false,
      status: 429,
      json: () => Promise.resolve({ error: { message: 'Rate limited' } }),
    })) as any;

    const { generateGeminiText } = await import('../../supabase/functions/_shared/gemini_client.ts');
    await expect(generateGeminiText({
      systemPrompt: 'S',
      userPrompt: 'U',
    })).rejects.toThrow();
  });

  it('throws when Gemini returns empty candidates', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async () => ({
      ok: true,
      json: () => Promise.resolve({ candidates: [] }),
    })) as any;

    const { generateGeminiText } = await import('../../supabase/functions/_shared/gemini_client.ts');
    await expect(generateGeminiText({
      systemPrompt: 'S',
      userPrompt: 'U',
    })).rejects.toThrow('Gemini returned no text');
  });
});

describe('getGeminiModel', () => {
  it('returns default model when env is unset', async () => {
    const { getGeminiModel } = await import('../../supabase/functions/_shared/gemini_client.ts');
    expect(getGeminiModel()).toBe('gemini-2.0-flash');
  });
});
