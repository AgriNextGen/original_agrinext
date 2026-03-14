/**
 * Unit tests for supabase/functions/_shared/knowledge_guardrails.ts
 */
import { describe, it, expect } from 'vitest';

(globalThis as any).Deno = { env: { get: () => '' } };

describe('scoreConfidence', () => {
  it('returns high score for strong retrieval', async () => {
    const { scoreConfidence } = await import('../../supabase/functions/_shared/knowledge_guardrails.ts');
    const score = scoreConfidence({
      chunks: [
        { chunkId: 'c1', content: 'A', similarity: 0.95, documentId: 'd1', documentTitle: 'D', sourceName: 'S', sourceType: 'r', trustLevel: 5 },
        { chunkId: 'c2', content: 'B', similarity: 0.90, documentId: 'd2', documentTitle: 'D', sourceName: 'S2', sourceType: 'r', trustLevel: 4 },
        { chunkId: 'c3', content: 'C', similarity: 0.85, documentId: 'd3', documentTitle: 'D', sourceName: 'S3', sourceType: 'r', trustLevel: 5 },
      ],
      avgSimilarity: 0.9,
      sourceCount: 3,
      hasEvidence: true,
    });
    expect(score).toBeGreaterThan(0.7);
  });

  it('returns low score for no chunks', async () => {
    const { scoreConfidence } = await import('../../supabase/functions/_shared/knowledge_guardrails.ts');
    const score = scoreConfidence({
      chunks: [],
      avgSimilarity: 0,
      sourceCount: 0,
      hasEvidence: false,
    });
    expect(score).toBeLessThan(0.2);
  });

  it('returns moderate score for single weak chunk', async () => {
    const { scoreConfidence } = await import('../../supabase/functions/_shared/knowledge_guardrails.ts');
    const score = scoreConfidence({
      chunks: [
        { chunkId: 'c1', content: 'A', similarity: 0.72, documentId: 'd1', documentTitle: 'D', sourceName: 'S', sourceType: 'r', trustLevel: 2 },
      ],
      avgSimilarity: 0.72,
      sourceCount: 1,
      hasEvidence: true,
    });
    expect(score).toBeGreaterThan(0.2);
    expect(score).toBeLessThan(0.7);
  });

  it('is bounded between 0 and 1', async () => {
    const { scoreConfidence } = await import('../../supabase/functions/_shared/knowledge_guardrails.ts');
    const max = scoreConfidence({
      chunks: Array(10).fill({ chunkId: 'c', content: 'A', similarity: 1, documentId: 'd', documentTitle: 'D', sourceName: 'S', sourceType: 'r', trustLevel: 5 }),
      avgSimilarity: 1.0,
      sourceCount: 5,
      hasEvidence: true,
    });
    expect(max).toBeLessThanOrEqual(1);
    expect(max).toBeGreaterThanOrEqual(0);
  });
});

describe('checkHallucination', () => {
  it('passes when claims are supported', async () => {
    const { checkHallucination } = await import('../../supabase/functions/_shared/knowledge_guardrails.ts');
    const result = checkHallucination(
      'Apply 50 kg NPK per acre as recommended.',
      [{ chunkId: 'c1', content: 'Apply 50 kg NPK per acre for best results.', similarity: 0.9,
        documentId: 'd1', documentTitle: 'D', sourceName: 'S', sourceType: 'r', trustLevel: 5 }],
    );
    expect(result.passed).toBe(true);
  });

  it('flags unsupported quantity claims', async () => {
    const { checkHallucination } = await import('../../supabase/functions/_shared/knowledge_guardrails.ts');
    const result = checkHallucination(
      'Apply 200 ml of pesticide per acre for best results.',
      [{ chunkId: 'c1', content: 'Average yield varies by region.', similarity: 0.8,
        documentId: 'd1', documentTitle: 'D', sourceName: 'S', sourceType: 'r', trustLevel: 4 }],
    );
    expect(result.flags.length).toBeGreaterThan(0);
  });

  it('flags fabricated scheme claims', async () => {
    const { checkHallucination } = await import('../../supabase/functions/_shared/knowledge_guardrails.ts');
    const result = checkHallucination(
      'The government provides free seeds under the new scheme.',
      [],
    );
    expect(result.flags.some(f => f.includes('unsupported_claim'))).toBe(true);
  });
});

describe('checkUnsafeAdvice', () => {
  it('passes for safe advice', async () => {
    const { checkUnsafeAdvice } = await import('../../supabase/functions/_shared/knowledge_guardrails.ts');
    const result = checkUnsafeAdvice('Water your crops in the morning for better absorption.');
    expect(result.passed).toBe(true);
    expect(result.flags).toEqual([]);
  });

  it('flags guaranteed yield promises', async () => {
    const { checkUnsafeAdvice } = await import('../../supabase/functions/_shared/knowledge_guardrails.ts');
    const result = checkUnsafeAdvice('This will give you guaranteed yield of 100 quintals per hectare.');
    expect(result.passed).toBe(false);
    expect(result.flags).toContain('guaranteed_outcome');
  });

  it('flags guaranteed price promises', async () => {
    const { checkUnsafeAdvice } = await import('../../supabase/functions/_shared/knowledge_guardrails.ts');
    const result = checkUnsafeAdvice('You will get guaranteed price of Rs 5000 per quintal.');
    expect(result.passed).toBe(false);
    expect(result.flags).toContain('guaranteed_price');
  });

  it('flags dangerous chemical mixing', async () => {
    const { checkUnsafeAdvice } = await import('../../supabase/functions/_shared/knowledge_guardrails.ts');
    const result = checkUnsafeAdvice('You can mix all pesticide solutions together for better effect.');
    expect(result.passed).toBe(false);
    expect(result.flags).toContain('dangerous_chemical_mixing');
  });

  it('flags safety dismissals', async () => {
    const { checkUnsafeAdvice } = await import('../../supabase/functions/_shared/knowledge_guardrails.ts');
    const result = checkUnsafeAdvice('No need safety equipment when spraying.');
    expect(result.passed).toBe(false);
    expect(result.flags).toContain('safety_dismissal');
  });
});

describe('applySafeFallback', () => {
  it('returns original reply for high confidence', async () => {
    const { applySafeFallback } = await import('../../supabase/functions/_shared/knowledge_guardrails.ts');
    const result = applySafeFallback('Water your crops daily.', 0.85, 'en');
    expect(result.reply).toBe('Water your crops daily.');
    expect(result.disclaimerApplied).toBe(false);
  });

  it('appends disclaimer for moderate confidence', async () => {
    const { applySafeFallback } = await import('../../supabase/functions/_shared/knowledge_guardrails.ts');
    const result = applySafeFallback('Use neem oil for pest control.', 0.55, 'en');
    expect(result.reply).toContain('neem oil');
    expect(result.reply).toContain('agricultural officer');
    expect(result.disclaimerApplied).toBe(true);
  });

  it('replaces response for very low confidence', async () => {
    const { applySafeFallback } = await import('../../supabase/functions/_shared/knowledge_guardrails.ts');
    const result = applySafeFallback('Some unverified claim.', 0.2, 'en');
    expect(result.reply).not.toContain('unverified claim');
    expect(result.reply).toContain('verified information');
    expect(result.disclaimerApplied).toBe(true);
    expect(result.originalReply).toBe('Some unverified claim.');
  });

  it('replaces response for dangerous flags regardless of confidence', async () => {
    const { applySafeFallback } = await import('../../supabase/functions/_shared/knowledge_guardrails.ts');
    const result = applySafeFallback('Mix all pesticide together.', 0.9, 'en', ['dangerous_chemical_mixing']);
    expect(result.reply).not.toContain('Mix all pesticide');
    expect(result.disclaimerApplied).toBe(true);
  });

  it('works in Kannada', async () => {
    const { applySafeFallback } = await import('../../supabase/functions/_shared/knowledge_guardrails.ts');
    const result = applySafeFallback('ಸಲಹೆ', 0.2, 'kn');
    expect(result.reply).toContain('ಪರಿಶೀಲಿತ');
    expect(result.disclaimerApplied).toBe(true);
  });
});

describe('GUARDRAIL_THRESHOLDS', () => {
  it('exports configurable thresholds', async () => {
    const { GUARDRAIL_THRESHOLDS } = await import('../../supabase/functions/_shared/knowledge_guardrails.ts');
    expect(GUARDRAIL_THRESHOLDS.minConfidence).toBe(0.4);
    expect(GUARDRAIL_THRESHOLDS.highConfidence).toBe(0.75);
    expect(GUARDRAIL_THRESHOLDS.minSimilarity).toBe(0.7);
  });
});
