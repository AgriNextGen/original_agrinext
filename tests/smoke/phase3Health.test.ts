/**
 * Smoke tests for Phase 3 Knowledge RAG system.
 * Verifies all modules load, migration file exists, config is updated.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

const originalFetch = globalThis.fetch;

beforeAll(() => {
  (globalThis as any).Deno = {
    env: {
      get: (key: string) => {
        const vars: Record<string, string> = {
          GEMINI_API_KEY: 'test-key', gemini_api_key: 'test-key',
          SUPABASE_URL: 'https://test.supabase.co',
          SUPABASE_ANON_KEY: 'test-anon-key',
          SUPABASE_SERVICE_ROLE_KEY: 'test-srv-key',
          firecrawl_api_key: 'test-fc-key',
        };
        return vars[key] ?? '';
      },
    },
  };
  globalThis.fetch = vi.fn().mockImplementation(() =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}), text: () => Promise.resolve('{}'),
      headers: new Headers({ 'content-type': 'application/json' }), arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) })
  ) as any;
});

afterAll(() => { globalThis.fetch = originalFetch; vi.restoreAllMocks(); });

describe('Knowledge crawl module', () => {
  it('exports crawlSource', async () => {
    const mod = await import('../../supabase/functions/_shared/knowledge_crawl.ts');
    expect(typeof mod.crawlSource).toBe('function');
  });
  it('exports cleanContent', async () => {
    const mod = await import('../../supabase/functions/_shared/knowledge_crawl.ts');
    expect(typeof mod.cleanContent).toBe('function');
  });
  it('exports chunkContent', async () => {
    const mod = await import('../../supabase/functions/_shared/knowledge_crawl.ts');
    expect(typeof mod.chunkContent).toBe('function');
  });
  it('exports computeChecksum', async () => {
    const mod = await import('../../supabase/functions/_shared/knowledge_crawl.ts');
    expect(typeof mod.computeChecksum).toBe('function');
  });
});

describe('Knowledge embeddings module', () => {
  it('exports generateEmbedding', async () => {
    const mod = await import('../../supabase/functions/_shared/knowledge_embeddings.ts');
    expect(typeof mod.generateEmbedding).toBe('function');
  });
  it('exports embedChunks', async () => {
    const mod = await import('../../supabase/functions/_shared/knowledge_embeddings.ts');
    expect(typeof mod.embedChunks).toBe('function');
  });
  it('exports storeEmbedding', async () => {
    const mod = await import('../../supabase/functions/_shared/knowledge_embeddings.ts');
    expect(typeof mod.storeEmbedding).toBe('function');
  });
});

describe('Knowledge retrieval module', () => {
  it('exports searchKnowledge', async () => {
    const mod = await import('../../supabase/functions/_shared/knowledge_retrieval.ts');
    expect(typeof mod.searchKnowledge).toBe('function');
  });
  it('exports assembleGroundingContext', async () => {
    const mod = await import('../../supabase/functions/_shared/knowledge_retrieval.ts');
    expect(typeof mod.assembleGroundingContext).toBe('function');
  });
  it('exports applyGroundingPolicy', async () => {
    const mod = await import('../../supabase/functions/_shared/knowledge_retrieval.ts');
    expect(typeof mod.applyGroundingPolicy).toBe('function');
  });
});

describe('Guardrails module', () => {
  it('exports scoreConfidence', async () => {
    const mod = await import('../../supabase/functions/_shared/knowledge_guardrails.ts');
    expect(typeof mod.scoreConfidence).toBe('function');
  });
  it('exports checkHallucination', async () => {
    const mod = await import('../../supabase/functions/_shared/knowledge_guardrails.ts');
    expect(typeof mod.checkHallucination).toBe('function');
  });
  it('exports checkUnsafeAdvice', async () => {
    const mod = await import('../../supabase/functions/_shared/knowledge_guardrails.ts');
    expect(typeof mod.checkUnsafeAdvice).toBe('function');
  });
  it('exports applySafeFallback', async () => {
    const mod = await import('../../supabase/functions/_shared/knowledge_guardrails.ts');
    expect(typeof mod.applySafeFallback).toBe('function');
  });
  it('exports GUARDRAIL_THRESHOLDS', async () => {
    const mod = await import('../../supabase/functions/_shared/knowledge_guardrails.ts');
    expect(mod.GUARDRAIL_THRESHOLDS).toBeDefined();
    expect(mod.GUARDRAIL_THRESHOLDS.minConfidence).toBe(0.4);
  });
});

describe('Knowledge prompts module', () => {
  it('exports buildGroundedSystemPrompt', async () => {
    const mod = await import('../../supabase/functions/_shared/knowledge_prompts.ts');
    expect(typeof mod.buildGroundedSystemPrompt).toBe('function');
  });
  it('exports buildGroundedUserPrompt', async () => {
    const mod = await import('../../supabase/functions/_shared/knowledge_prompts.ts');
    expect(typeof mod.buildGroundedUserPrompt).toBe('function');
  });
});

describe('Advisory engine module', () => {
  it('exports generateAdvisory', async () => {
    const mod = await import('../../supabase/functions/_shared/advisory_engine.ts');
    expect(typeof mod.generateAdvisory).toBe('function');
  });
  it('exports validateAdvisoryResponse', async () => {
    const mod = await import('../../supabase/functions/_shared/advisory_engine.ts');
    expect(typeof mod.validateAdvisoryResponse).toBe('function');
  });
  it('exports simplifyForRole', async () => {
    const mod = await import('../../supabase/functions/_shared/advisory_engine.ts');
    expect(typeof mod.simplifyForRole).toBe('function');
  });
});

describe('Extended ai_chat module', () => {
  it('still exports generateChatResponse', async () => {
    const mod = await import('../../supabase/functions/_shared/ai_chat.ts');
    expect(typeof mod.generateChatResponse).toBe('function');
  });
  it('exports generateGroundedChatResponse', async () => {
    const mod = await import('../../supabase/functions/_shared/ai_chat.ts');
    expect(typeof mod.generateGroundedChatResponse).toBe('function');
  });
  it('still exports detectIntent', async () => {
    const mod = await import('../../supabase/functions/_shared/ai_chat.ts');
    expect(typeof mod.detectIntent).toBe('function');
  });
});

describe('Phase 1/2 modules still intact', () => {
  it('gemini_client.ts still exports', async () => {
    const mod = await import('../../supabase/functions/_shared/gemini_client.ts');
    expect(typeof mod.generateGeminiText).toBe('function');
  });
  it('maps_client.ts still exports', async () => {
    const mod = await import('../../supabase/functions/_shared/maps_client.ts');
    expect(typeof mod.geocodeAddress).toBe('function');
  });
  it('voice_service.ts still exports', async () => {
    const mod = await import('../../supabase/functions/_shared/voice_service.ts');
    expect(typeof mod.generateAndStoreVoice).toBe('function');
  });
  it('image_validator.ts still exports', async () => {
    const mod = await import('../../supabase/functions/_shared/image_validator.ts');
    expect(typeof mod.validateImageFile).toBe('function');
  });
});

describe('Migration file', () => {
  it('Phase 3 migration exists', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const p = path.resolve(__dirname, '../../supabase/migrations/202603141900_phase3_knowledge_rag_tables.sql');
    expect(fs.existsSync(p)).toBe(true);
  });
  it('migration contains pgvector extension', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const p = path.resolve(__dirname, '../../supabase/migrations/202603141900_phase3_knowledge_rag_tables.sql');
    const content = fs.readFileSync(p, 'utf-8');
    expect(content).toContain('CREATE EXTENSION IF NOT EXISTS vector');
  });
  it('migration contains knowledge tables', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const p = path.resolve(__dirname, '../../supabase/migrations/202603141900_phase3_knowledge_rag_tables.sql');
    const content = fs.readFileSync(p, 'utf-8');
    expect(content).toContain('knowledge_sources');
    expect(content).toContain('knowledge_documents');
    expect(content).toContain('knowledge_chunks');
    expect(content).toContain('knowledge_embeddings');
    expect(content).toContain('knowledge_ingestion_jobs');
  });
  it('migration contains vector search RPC', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const p = path.resolve(__dirname, '../../supabase/migrations/202603141900_phase3_knowledge_rag_tables.sql');
    const content = fs.readFileSync(p, 'utf-8');
    expect(content).toContain('match_knowledge_chunks');
    expect(content).toContain('vector(768)');
  });
});

describe('Config', () => {
  it('supabase config has knowledge-service entry', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const configPath = path.resolve(__dirname, '../../supabase/config.toml');
    const content = fs.readFileSync(configPath, 'utf-8');
    expect(content).toContain('[functions."knowledge-service"]');
    expect(content).toContain('verify_jwt = true');
  });
});
