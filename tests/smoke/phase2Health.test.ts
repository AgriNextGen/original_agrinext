/**
 * Smoke tests for Phase 2 backend services.
 *
 * Verifies that all Phase 2 modules load correctly, exports are available,
 * migration file exists with correct content, and config is updated.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

const envVars: Record<string, string> = {
  GEMINI_API_KEY: 'test-gemini-key',
  ELEVENLABS_API_KEY: 'test-elevenlabs-key',
  GOOGLE_MAPS_API_KEY: 'test-maps-key',
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  ELEVENLABS_VOICE_ID: 'test-voice-id',
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
      headers: new Headers({ 'content-type': 'application/json' }),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    })
  ) as any;
});

afterAll(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

// ── Voice service module health ────────────────────────────────────────

describe('Voice service module smoke tests', () => {
  it('voice_service.ts exports generateSpeech function', async () => {
    const mod = await import('../../supabase/functions/_shared/voice_service.ts');
    expect(typeof mod.generateSpeech).toBe('function');
  });

  it('voice_service.ts exports storeVoiceResponse function', async () => {
    const mod = await import('../../supabase/functions/_shared/voice_service.ts');
    expect(typeof mod.storeVoiceResponse).toBe('function');
  });

  it('voice_service.ts exports generateAndStoreVoice function', async () => {
    const mod = await import('../../supabase/functions/_shared/voice_service.ts');
    expect(typeof mod.generateAndStoreVoice).toBe('function');
  });
});

// ── Image validator module health ──────────────────────────────────────

describe('Image validator module smoke tests', () => {
  it('image_validator.ts exports validateImageFile function', async () => {
    const mod = await import('../../supabase/functions/_shared/image_validator.ts');
    expect(typeof mod.validateImageFile).toBe('function');
  });

  it('image_validator.ts exports sanitizeFileName function', async () => {
    const mod = await import('../../supabase/functions/_shared/image_validator.ts');
    expect(typeof mod.sanitizeFileName).toBe('function');
  });

  it('image_validator.ts exports detectImageType function', async () => {
    const mod = await import('../../supabase/functions/_shared/image_validator.ts');
    expect(typeof mod.detectImageType).toBe('function');
  });

  it('image_validator.ts exports getExtensionForType function', async () => {
    const mod = await import('../../supabase/functions/_shared/image_validator.ts');
    expect(typeof mod.getExtensionForType).toBe('function');
  });

  it('image_validator.ts exports constants', async () => {
    const mod = await import('../../supabase/functions/_shared/image_validator.ts');
    expect(mod.ALLOWED_IMAGE_TYPES).toBeDefined();
    expect(mod.MAX_IMAGE_SIZE_BYTES).toBe(10 * 1024 * 1024);
    expect(mod.UPLOAD_TYPE_BUCKET_MAP).toBeDefined();
    expect(mod.VALID_UPLOAD_TYPES).toBeDefined();
  });
});

// ── Phase 1 modules still functional ───────────────────────────────────

describe('Phase 1 modules remain intact', () => {
  it('ai_chat.ts still exports all functions', async () => {
    const mod = await import('../../supabase/functions/_shared/ai_chat.ts');
    expect(typeof mod.detectIntent).toBe('function');
    expect(typeof mod.summarizeConversation).toBe('function');
    expect(typeof mod.generateChatResponse).toBe('function');
  });

  it('maps_client.ts still exports all functions', async () => {
    const mod = await import('../../supabase/functions/_shared/maps_client.ts');
    expect(typeof mod.geocodeAddress).toBe('function');
    expect(typeof mod.getDirections).toBe('function');
    expect(typeof mod.searchNearby).toBe('function');
  });

  it('gemini_client.ts still exports', async () => {
    const mod = await import('../../supabase/functions/_shared/gemini_client.ts');
    expect(typeof mod.generateGeminiText).toBe('function');
  });
});

// ── Migration file verification ────────────────────────────────────────

describe('Phase 2 migration smoke tests', () => {
  it('migration file exists', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const migrationPath = path.resolve(
      __dirname,
      '../../supabase/migrations/202603141800_phase2_voice_storage_and_image_buckets.sql'
    );
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  it('migration contains voice_responses table', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const migrationPath = path.resolve(
      __dirname,
      '../../supabase/migrations/202603141800_phase2_voice_storage_and_image_buckets.sql'
    );
    const content = fs.readFileSync(migrationPath, 'utf-8');
    expect(content).toContain('CREATE TABLE IF NOT EXISTS public.voice_responses');
    expect(content).toContain('ENABLE ROW LEVEL SECURITY');
    expect(content).toContain('user_id uuid NOT NULL REFERENCES auth.users');
  });

  it('migration creates storage buckets', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const migrationPath = path.resolve(
      __dirname,
      '../../supabase/migrations/202603141800_phase2_voice_storage_and_image_buckets.sql'
    );
    const content = fs.readFileSync(migrationPath, 'utf-8');
    expect(content).toContain("'voice-responses'");
    expect(content).toContain("'crop-images'");
    expect(content).toContain("'disease-images'");
    expect(content).toContain('INSERT INTO storage.buckets');
  });

  it('migration has storage object policies', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const migrationPath = path.resolve(
      __dirname,
      '../../supabase/migrations/202603141800_phase2_voice_storage_and_image_buckets.sql'
    );
    const content = fs.readFileSync(migrationPath, 'utf-8');
    expect(content).toContain('voice_responses_select_own');
    expect(content).toContain('crop_images_select_own');
    expect(content).toContain('disease_images_select_own');
  });
});

// ── Config verification ────────────────────────────────────────────────

describe('Config smoke tests', () => {
  it('supabase config has image-upload entry', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const configPath = path.resolve(__dirname, '../../supabase/config.toml');
    const content = fs.readFileSync(configPath, 'utf-8');
    expect(content).toContain('[functions."image-upload"]');
    expect(content).toContain('verify_jwt = true');
  });

  it('supabase config still has maps-service entry (Phase 1)', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const configPath = path.resolve(__dirname, '../../supabase/config.toml');
    const content = fs.readFileSync(configPath, 'utf-8');
    expect(content).toContain('[functions."maps-service"]');
  });

  it('supabase config still has ai-gateway entry', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const configPath = path.resolve(__dirname, '../../supabase/config.toml');
    const content = fs.readFileSync(configPath, 'utf-8');
    expect(content).toContain('[functions."ai-gateway"]');
  });
});

// ── Image validation quick checks ──────────────────────────────────────

describe('Image validation smoke tests', () => {
  it('validates JPEG correctly', async () => {
    const { validateImageFile } = await import('../../supabase/functions/_shared/image_validator.ts');
    const result = validateImageFile(
      new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]),
      'image/jpeg',
      1024,
    );
    expect(result.valid).toBe(true);
  });

  it('rejects invalid type', async () => {
    const { validateImageFile } = await import('../../supabase/functions/_shared/image_validator.ts');
    const result = validateImageFile(
      new Uint8Array([0x00]),
      'text/plain',
      100,
    );
    expect(result.valid).toBe(false);
  });

  it('sanitizeFileName handles dangerous inputs', async () => {
    const { sanitizeFileName } = await import('../../supabase/functions/_shared/image_validator.ts');
    expect(sanitizeFileName('../../etc/passwd')).not.toContain('..');
    expect(sanitizeFileName('')).toBe('upload');
    expect(sanitizeFileName('normal.jpg')).toBe('normal.jpg');
  });
});
