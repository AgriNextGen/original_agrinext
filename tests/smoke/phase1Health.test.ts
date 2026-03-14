/**
 * Smoke tests for Phase 1 backend architecture.
 *
 * Verifies that all Phase 1 modules load correctly, exports are available,
 * and the system can be bootstrapped without crashing.
 *
 * These tests do NOT call real APIs — they verify structural integrity.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

// ── Deno env mock ──────────────────────────────────────────────────────

const envVars: Record<string, string> = {
  GEMINI_API_KEY: 'test-gemini-key',
  GOOGLE_MAPS_API_KEY: 'test-maps-key',
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
};

const originalFetch = globalThis.fetch;

beforeAll(() => {
  (globalThis as any).Deno = {
    env: { get: (key: string) => envVars[key] ?? envVars[key.toUpperCase()] ?? '' },
  };

  globalThis.fetch = vi.fn().mockImplementation(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve('{}'),
    })
  ) as any;
});

afterAll(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

// ── AI Chat module health ──────────────────────────────────────────────

describe('AI Chat module smoke tests', () => {
  it('ai_chat.ts exports detectIntent function', async () => {
    const mod = await import('../../supabase/functions/_shared/ai_chat.ts');
    expect(typeof mod.detectIntent).toBe('function');
  });

  it('ai_chat.ts exports summarizeConversation function', async () => {
    const mod = await import('../../supabase/functions/_shared/ai_chat.ts');
    expect(typeof mod.summarizeConversation).toBe('function');
  });

  it('ai_chat.ts exports generateChatResponse function', async () => {
    const mod = await import('../../supabase/functions/_shared/ai_chat.ts');
    expect(typeof mod.generateChatResponse).toBe('function');
  });
});

// ── Maps Client module health ──────────────────────────────────────────

describe('Maps Client module smoke tests', () => {
  it('maps_client.ts exports geocodeAddress function', async () => {
    const mod = await import('../../supabase/functions/_shared/maps_client.ts');
    expect(typeof mod.geocodeAddress).toBe('function');
  });

  it('maps_client.ts exports getDirections function', async () => {
    const mod = await import('../../supabase/functions/_shared/maps_client.ts');
    expect(typeof mod.getDirections).toBe('function');
  });

  it('maps_client.ts exports searchNearby function', async () => {
    const mod = await import('../../supabase/functions/_shared/maps_client.ts');
    expect(typeof mod.searchNearby).toBe('function');
  });
});

// ── Existing shared modules health ─────────────────────────────────────

describe('Existing shared modules smoke tests', () => {
  it('gemini_client.ts exports generateGeminiText', async () => {
    const mod = await import('../../supabase/functions/_shared/gemini_client.ts');
    expect(typeof mod.generateGeminiText).toBe('function');
    expect(typeof mod.getGeminiModel).toBe('function');
  });

  it('ai_context.ts exports buildFarmerContext', async () => {
    const mod = await import('../../supabase/functions/_shared/ai_context.ts');
    expect(typeof mod.buildFarmerContext).toBe('function');
  });

  it('ai_prompts.ts exports prompt builders', async () => {
    const mod = await import('../../supabase/functions/_shared/ai_prompts.ts');
    expect(typeof mod.buildFarmerSystemPrompt).toBe('function');
    expect(typeof mod.buildFarmerUserPrompt).toBe('function');
    expect(typeof mod.buildRoleAiSystemPrompt).toBe('function');
    expect(typeof mod.buildRoleAiUserPrompt).toBe('function');
  });

  it('ai_response.ts exports parsers', async () => {
    const mod = await import('../../supabase/functions/_shared/ai_response.ts');
    expect(typeof mod.parseJsonObject).toBe('function');
    expect(typeof mod.normalizeAssistantOutput).toBe('function');
    expect(typeof mod.trimText).toBe('function');
  });

  it('ai_lang.ts exports language utilities', async () => {
    const mod = await import('../../supabase/functions/_shared/ai_lang.ts');
    expect(typeof mod.resolveResponseLanguage).toBe('function');
    expect(typeof mod.detectScriptLanguage).toBe('function');
    expect(typeof mod.normalizeUiLanguage).toBe('function');
  });

  it('errors.ts exports response helpers', async () => {
    const mod = await import('../../supabase/functions/_shared/errors.ts');
    expect(typeof mod.successResponse).toBe('function');
    expect(typeof mod.errorResponse).toBe('function');
  });

  it('env.ts exports env helpers', async () => {
    const mod = await import('../../supabase/functions/_shared/env.ts');
    expect(typeof mod.getRequiredEnv).toBe('function');
    expect(typeof mod.getOptionalEnv).toBe('function');
  });

  it('request_context.ts exports logging and tracing', async () => {
    const mod = await import('../../supabase/functions/_shared/request_context.ts');
    expect(typeof mod.logStructured).toBe('function');
    expect(typeof mod.getRequestIdFromHeaders).toBe('function');
    expect(typeof mod.makeResponseWithRequestId).toBe('function');
  });

  it('cors.ts exports CORS headers', async () => {
    const mod = await import('../../supabase/functions/_shared/cors.ts');
    expect(mod.corsHeaders).toBeDefined();
    expect(mod.corsHeaders['Access-Control-Allow-Origin']).toBe('*');
  });
});

// ── Response format verification ───────────────────────────────────────

describe('Response format smoke tests', () => {
  it('successResponse returns correct structure', async () => {
    const { successResponse } = await import('../../supabase/functions/_shared/errors.ts');
    const res = successResponse({ test: 'data' });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.test).toBe('data');
  });

  it('errorResponse returns correct structure', async () => {
    const { errorResponse } = await import('../../supabase/functions/_shared/errors.ts');
    const res = errorResponse('test_error', 'Test message', 400);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('test_error');
    expect(body.error.message).toBe('Test message');
  });
});

// ── Prompt builder verification ────────────────────────────────────────

describe('Prompt builder smoke tests', () => {
  it('buildFarmerSystemPrompt produces non-empty English prompt', async () => {
    const { buildFarmerSystemPrompt } = await import('../../supabase/functions/_shared/ai_prompts.ts');
    const prompt = buildFarmerSystemPrompt('en');
    expect(prompt).toBeTruthy();
    expect(prompt.length).toBeGreaterThan(50);
    expect(prompt).toContain('Krishi Mitra');
  });

  it('buildFarmerSystemPrompt produces Kannada prompt', async () => {
    const { buildFarmerSystemPrompt } = await import('../../supabase/functions/_shared/ai_prompts.ts');
    const prompt = buildFarmerSystemPrompt('kn');
    expect(prompt).toBeTruthy();
    expect(prompt).toContain('Kannada');
  });

  it('buildFarmerUserPrompt includes context and message', async () => {
    const { buildFarmerUserPrompt } = await import('../../supabase/functions/_shared/ai_prompts.ts');
    const prompt = buildFarmerUserPrompt({
      message: 'How to treat blight?',
      language: 'en',
      context: {
        profile: { full_name: 'Test' },
        crops: [{ crop_name: 'Tomato' }],
      },
    });
    expect(prompt).toContain('blight');
    expect(prompt).toContain('Tomato');
  });
});

// ── Language detection verification ────────────────────────────────────

describe('Language detection smoke tests', () => {
  it('detects English input', async () => {
    const { detectScriptLanguage } = await import('../../supabase/functions/_shared/ai_lang.ts');
    expect(detectScriptLanguage('Hello world')).toBe('en');
  });

  it('detects Kannada input', async () => {
    const { detectScriptLanguage } = await import('../../supabase/functions/_shared/ai_lang.ts');
    expect(detectScriptLanguage('ನಮಸ್ಕಾರ')).toBe('kn');
  });

  it('detects mixed input', async () => {
    const { detectScriptLanguage } = await import('../../supabase/functions/_shared/ai_lang.ts');
    expect(detectScriptLanguage('Hello ನಮಸ್ಕಾರ')).toBe('mixed');
  });
});

// ── Database schema verification (structural) ─────────────────────────

describe('Migration file smoke tests', () => {
  it('migration file exists', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const migrationPath = path.resolve(
      __dirname,
      '../../supabase/migrations/202603141700_phase1_chat_sessions_and_geocoding_cache.sql'
    );
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  it('migration contains chat_sessions table', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const migrationPath = path.resolve(
      __dirname,
      '../../supabase/migrations/202603141700_phase1_chat_sessions_and_geocoding_cache.sql'
    );
    const content = fs.readFileSync(migrationPath, 'utf-8');
    expect(content).toContain('CREATE TABLE IF NOT EXISTS public.chat_sessions');
    expect(content).toContain('ENABLE ROW LEVEL SECURITY');
  });

  it('migration contains chat_messages table', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const migrationPath = path.resolve(
      __dirname,
      '../../supabase/migrations/202603141700_phase1_chat_sessions_and_geocoding_cache.sql'
    );
    const content = fs.readFileSync(migrationPath, 'utf-8');
    expect(content).toContain('CREATE TABLE IF NOT EXISTS public.chat_messages');
    expect(content).toContain('session_id uuid NOT NULL REFERENCES');
  });

  it('migration contains geocoding_cache table', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const migrationPath = path.resolve(
      __dirname,
      '../../supabase/migrations/202603141700_phase1_chat_sessions_and_geocoding_cache.sql'
    );
    const content = fs.readFileSync(migrationPath, 'utf-8');
    expect(content).toContain('CREATE TABLE IF NOT EXISTS public.geocoding_cache');
    expect(content).toContain('query_hash text NOT NULL UNIQUE');
  });
});

// ── Config verification ────────────────────────────────────────────────

describe('Config smoke tests', () => {
  it('supabase config has maps-service entry', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const configPath = path.resolve(__dirname, '../../supabase/config.toml');
    const content = fs.readFileSync(configPath, 'utf-8');
    expect(content).toContain('[functions."maps-service"]');
    expect(content).toContain('verify_jwt = true');
  });
});
