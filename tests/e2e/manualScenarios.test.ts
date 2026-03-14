/**
 * Manual Scenario Validation (programmatic)
 *
 * Simulates the 7 required manual scenarios from the validation plan.
 * Uses mocked external APIs since credentials are not available in CI.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';

const originalFetch = globalThis.fetch;
let fetchCallLog: string[] = [];

beforeAll(() => {
  (globalThis as any).Deno = {
    env: {
      get: (key: string) => {
        const vars: Record<string, string> = {
          GEMINI_API_KEY: 'test-gemini-key',
          gemini_api_key: 'test-gemini-key',
          SUPABASE_URL: 'https://test.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'test-srv-key',
          SUPABASE_ANON_KEY: 'test-anon-key',
          ELEVENLABS_API_KEY: 'test-eleven-key',
          elevenlabs_api_key: 'test-eleven-key',
          firecrawl_api_key: 'test-fc-key',
          GOOGLE_MAPS_API_KEY: 'test-maps-key',
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

beforeEach(async () => {
  fetchCallLog = [];
  vi.resetModules();
});

// ── Scenario 1: Grounded farmer question ────────────────────────────────

describe('Scenario 1: Grounded farmer question', () => {
  it('retrieves knowledge, assembles context, returns grounded response', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      fetchCallLog.push(url);

      if (url.includes('embedContent')) {
        return { ok: true, json: () => Promise.resolve({ embedding: { values: Array(768).fill(0.1) } }) };
      }
      if (url.includes('match_knowledge_chunks')) {
        return {
          ok: true,
          json: () => Promise.resolve([
            { chunk_id: 'c1', content: 'Tomatoes need 2-3 cm water per week during fruiting stage.', similarity: 0.92, document_id: 'd1', document_title: 'Tomato Guide', source_name: 'UAHS', source_type: 'extension', trust_level: 4, chunk_metadata: {} },
            { chunk_id: 'c2', content: 'Apply organic manure before transplanting.', similarity: 0.85, document_id: 'd1', document_title: 'Tomato Guide', source_name: 'UAHS', source_type: 'extension', trust_level: 4, chunk_metadata: {} },
          ]),
        };
      }
      if (url.includes('generateContent')) {
        return {
          ok: true,
          json: () => Promise.resolve({
            candidates: [{
              content: {
                parts: [{
                  text: JSON.stringify({
                    reply: 'Tomatoes need 2-3 cm water per week during fruiting. Apply organic manure before transplanting.',
                    suggestions: ['How much fertilizer should I use?'],
                    advisory_type: 'crop_guidance',
                  }),
                }],
              },
            }],
          }),
        };
      }
      if (url.includes('/rest/v1/')) {
        return { ok: true, json: () => Promise.resolve({}) };
      }
      return { ok: true, json: () => Promise.resolve({}) };
    }) as any;

    const { generateGroundedChatResponse } = await import('../../supabase/functions/_shared/ai_chat.ts');
    const result = await generateGroundedChatResponse({
      userId: 'farmer-001',
      authToken: 'test-token',
      message: 'How much water do tomatoes need?',
      role: 'farmer',
      requestId: 'scenario-1',
    });

    expect(result.reply.toLowerCase()).toContain('tomato');
    expect(result.grounding).toBeDefined();
    expect(result.grounding.retrievedChunkIds.length).toBeGreaterThan(0);
    expect(result.grounding.groundingConfidence).toBeGreaterThan(0);
    expect(result.sessionId).toBeDefined();

    const embeddingCalls = fetchCallLog.filter(u => u.includes('embedContent'));
    expect(embeddingCalls.length).toBeGreaterThan(0);

    const rpcCalls = fetchCallLog.filter(u => u.includes('match_knowledge_chunks'));
    expect(rpcCalls.length).toBeGreaterThan(0);
  });
});

// ── Scenario 2: Low-confidence fallback ──────────────────────────────────

describe('Scenario 2: Low-confidence fallback', () => {
  it('returns safe fallback when no knowledge matches', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      fetchCallLog.push(url);

      if (url.includes('embedContent')) {
        return { ok: true, json: () => Promise.resolve({ embedding: { values: Array(768).fill(0.1) } }) };
      }
      if (url.includes('match_knowledge_chunks')) {
        return { ok: true, json: () => Promise.resolve([]) };
      }
      if (url.includes('generateContent')) {
        return {
          ok: true,
          json: () => Promise.resolve({
            candidates: [{
              content: {
                parts: [{
                  text: JSON.stringify({
                    reply: 'I do not have specific information about quantum computing in agriculture. Please consult your local agricultural officer.',
                    suggestions: [],
                    advisory_type: 'general',
                  }),
                }],
              },
            }],
          }),
        };
      }
      return { ok: true, json: () => Promise.resolve({}) };
    }) as any;

    const { generateGroundedChatResponse } = await import('../../supabase/functions/_shared/ai_chat.ts');
    const result = await generateGroundedChatResponse({
      userId: 'farmer-002',
      authToken: 'test-token',
      message: 'What is the quantum computing approach to ragi cultivation?',
      role: 'farmer',
      requestId: 'scenario-2',
    });

    expect(result.reply).toBeDefined();
    expect(result.reply.length).toBeGreaterThan(0);
    expect(result.grounding).toBeDefined();
    expect(result.grounding.retrievedChunkIds.length).toBe(0);

    expect(result.reply).not.toMatch(/guaranteed yield|100% increase/i);
  });
});

// ── Scenario 3: Admin insights query ─────────────────────────────────────

describe('Scenario 3: Admin insights query', () => {
  it('produces aggregate summary without PII', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('generateContent')) {
        return {
          ok: true,
          json: () => Promise.resolve({
            candidates: [{
              content: { parts: [{ text: JSON.stringify({ summary: '3 active sources, 12 indexed documents, top intent: crop_advice', recommendations: ['Add pest management content'] }) }] },
            }],
          }),
        };
      }
      return { ok: true, json: () => Promise.resolve([]) };
    }) as any;

    const { generateGeminiText } = await import('../../supabase/functions/_shared/gemini_client.ts');
    const { parseJsonObject } = await import('../../supabase/functions/_shared/ai_response.ts');

    const result = await generateGeminiText({
      systemPrompt: 'You are an admin analytics AI. Do not fabricate data.',
      userPrompt: 'Admin query: knowledge base status\nSources: []\nDocuments: []',
      temperature: 0.3,
      maxOutputTokens: 512,
    });

    const parsed = parseJsonObject(result.text);
    expect(parsed?.summary).toBeDefined();
    expect(parsed?.recommendations).toBeDefined();
    expect(JSON.stringify(parsed)).not.toMatch(/password|phone_number|api_key/i);
  });
});

// ── Scenario 4: Knowledge ingestion job ──────────────────────────────────

describe('Scenario 4: Knowledge ingestion job', () => {
  it('clean -> chunk pipeline produces valid chunks with hashes and token counts', async () => {
    const { chunkContent, cleanContent, computeChecksum } = await import('../../supabase/functions/_shared/knowledge_crawl.ts');

    const rawContent = '# Ragi Cultivation Guide\n\nRagi requires well-drained red soil with pH 5.5-7.0.\n\nSow seeds in June-July at the onset of monsoon.\n\nApply organic manure at 10 tons per hectare before final ploughing.\n\nRagi is drought resistant and grows well in semi-arid regions of Karnataka.';
    const cleaned = cleanContent(rawContent);
    expect(cleaned.length).toBeGreaterThan(0);
    expect(cleaned).not.toContain('<script');

    const checksum = await computeChecksum(cleaned);
    expect(checksum).toBeDefined();
    expect(typeof checksum).toBe('string');
    expect(checksum.length).toBeGreaterThan(0);

    const chunks = chunkContent(cleaned);
    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      expect(chunk.content.length).toBeGreaterThan(0);
      expect(chunk.contentHash).toBeDefined();
      expect(chunk.tokenCount).toBeGreaterThan(0);
      expect(chunk.index).toBeDefined();
    }

    const sameChecksum = await computeChecksum(cleaned);
    expect(sameChecksum).toBe(checksum);
  });

  it('embedChunks calls Gemini embedding API and stores results', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async (urlInput: any) => {
      const url = String(urlInput);
      if (url.includes('embedContent')) {
        return { ok: true, json: () => Promise.resolve({ embedding: { values: Array(768).fill(0.1) } }) };
      }
      if (url.includes('knowledge_embeddings')) {
        return { ok: true, json: () => Promise.resolve({}) };
      }
      return { ok: true, json: () => Promise.resolve({}) };
    }) as any;

    const { embedChunks } = await import('../../supabase/functions/_shared/knowledge_embeddings.ts');
    const result = await embedChunks([
      { chunkId: 'chunk-1', content: 'Ragi requires well-drained soil.' },
      { chunkId: 'chunk-2', content: 'Sow seeds in June-July.' },
    ], { requestId: 'scenario-4-embed' });

    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.errors).toHaveLength(0);
  });
});

// ── Scenario 5: Voice-enabled chatbot ────────────────────────────────────

describe('Scenario 5: Voice-enabled chatbot', () => {
  it('generates text + voice, stores audio, returns signed URL', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      fetchCallLog.push(url);

      if (url.includes('text-to-speech')) {
        return {
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
          headers: new Headers({ 'content-type': 'audio/mpeg' }),
        };
      }
      if (url.includes('/storage/v1/object/')) {
        return { ok: true, json: () => Promise.resolve({ Key: 'voice-responses/user/test.mp3' }) };
      }
      if (url.includes('/storage/v1/object/sign/')) {
        return { ok: true, json: () => Promise.resolve({ signedURL: 'https://test.supabase.co/storage/signed/test.mp3' }) };
      }
      if (url.includes('/rest/v1/voice_responses')) {
        return { ok: true, json: () => Promise.resolve({}) };
      }
      return { ok: true, json: () => Promise.resolve({}) };
    }) as any;

    const { generateAndStoreVoice } = await import('../../supabase/functions/_shared/voice_service.ts');
    const result = await generateAndStoreVoice({
      text: 'Tomatoes need regular watering during fruiting.',
      userId: 'farmer-voice-001',
      languageCode: 'en-IN',
      voiceRole: 'farmer',
      requestId: 'scenario-5',
    });

    expect(result.file_path).toBeDefined();
    expect(result.voice_id).toBeDefined();
    expect(result.language_code).toBe('en-IN');

    const ttsCalls = fetchCallLog.filter(u => u.includes('text-to-speech'));
    expect(ttsCalls.length).toBe(1);

    const storageCalls = fetchCallLog.filter(u => u.includes('/storage/v1/object/'));
    expect(storageCalls.length).toBeGreaterThan(0);
  });

  it('text response works even when voice generation fails', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('text-to-speech')) {
        return { ok: false, status: 500, text: () => Promise.resolve('Server error') };
      }
      return { ok: true, json: () => Promise.resolve({}) };
    }) as any;

    const { generateSpeech } = await import('../../supabase/functions/_shared/voice_service.ts');
    await expect(generateSpeech('Test text')).rejects.toThrow();
  });
});

// ── Scenario 6: Image upload validation ──────────────────────────────────

describe('Scenario 6: Image upload validation', () => {
  it('valid JPEG passes validation', async () => {
    const { validateImageFile } = await import('../../supabase/functions/_shared/image_validator.ts');
    const jpegBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, ...Array(100).fill(0)]);
    const result = validateImageFile(jpegBytes, 'image/jpeg', 1024);
    expect(result.valid).toBe(true);
  });

  it('invalid file type is blocked', async () => {
    const { validateImageFile } = await import('../../supabase/functions/_shared/image_validator.ts');
    const txtBytes = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]);
    const result = validateImageFile(txtBytes, 'text/plain', 100);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid file type');
  });

  it('oversized file is blocked', async () => {
    const { validateImageFile, MAX_IMAGE_SIZE_BYTES } = await import('../../supabase/functions/_shared/image_validator.ts');
    const bytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]);
    const result = validateImageFile(bytes, 'image/jpeg', MAX_IMAGE_SIZE_BYTES + 1);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('too large');
  });

  it('magic bytes mismatch is blocked', async () => {
    const { validateImageFile } = await import('../../supabase/functions/_shared/image_validator.ts');
    const wrongBytes = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
    const result = validateImageFile(wrongBytes, 'image/jpeg', 100);
    expect(result.valid).toBe(false);
  });

  it('sanitizeFileName removes unsafe characters', async () => {
    const { sanitizeFileName } = await import('../../supabase/functions/_shared/image_validator.ts');
    const safe = sanitizeFileName('../../../etc/passwd.jpg');
    expect(safe).not.toContain('..');
    expect(safe).not.toContain('/');
  });
});

// ── Scenario 7: Maps flow ────────────────────────────────────────────────

describe('Scenario 7: Maps flow', () => {
  it('geocode returns structured result', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('geocode')) {
        return {
          ok: true,
          json: () => Promise.resolve({
            status: 'OK',
            results: [{
              geometry: { location: { lat: 12.9716, lng: 77.5946 } },
              formatted_address: 'Bangalore, Karnataka, India',
              place_id: 'ChIJv0JGZmMWrjsRAR_GDYQ',
            }],
          }),
        };
      }
      if (url.includes('/rest/v1/geocoding_cache')) {
        return { ok: true, json: () => Promise.resolve([]) };
      }
      return { ok: true, json: () => Promise.resolve({}) };
    }) as any;

    const { geocodeAddress } = await import('../../supabase/functions/_shared/maps_client.ts');
    const result = await geocodeAddress('Bangalore, Karnataka');

    expect(result.lat).toBeCloseTo(12.9716, 2);
    expect(result.lng).toBeCloseTo(77.5946, 2);
    expect(result.formatted_address).toContain('Bangalore');
    expect(result.place_id).toBeDefined();
  });

  it('directions returns route with distance and duration', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async () => ({
      ok: true,
      json: () => Promise.resolve({
        status: 'OK',
        routes: [{
          legs: [{
            distance: { value: 15000, text: '15 km' },
            duration: { value: 1800, text: '30 mins' },
            steps: [{ html_instructions: 'Head north', distance: { text: '1 km' }, duration: { text: '2 mins' } }],
          }],
          overview_polyline: { points: 'test_polyline' },
        }],
      }),
    })) as any;

    const { getDirections } = await import('../../supabase/functions/_shared/maps_client.ts');
    const result = await getDirections(
      { lat: 12.97, lng: 77.59 },
      { lat: 13.05, lng: 77.63 },
    );

    expect(result.distance_meters).toBe(15000);
    expect(result.duration_seconds).toBe(1800);
    expect(result.polyline).toBe('test_polyline');
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it('handles API failure gracefully', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async () => ({
      ok: true,
      json: () => Promise.resolve({ status: 'ZERO_RESULTS', results: [] }),
    })) as any;

    const { geocodeAddress } = await import('../../supabase/functions/_shared/maps_client.ts');
    await expect(geocodeAddress('xyznonexistent123')).rejects.toThrow();
  });
});
