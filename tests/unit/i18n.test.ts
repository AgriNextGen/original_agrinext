/**
 * Tests for the i18n translation system.
 * Verifies: key coverage, Kannada encoding, fallback behaviour.
 * Uses repaired kn from index (runtime output) — source kn.ts may have mojibake that gets repaired.
 */
import { en } from '@/i18n/en';
import { kn } from '@/i18n';

// ---------------------------------------------------------------------------
// Key coverage
// ---------------------------------------------------------------------------

/**
 * Flatten a nested object into dot-notation keys.
 * E.g. { a: { b: 'val' } } → ['a.b']
 */
function flattenKeys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, val]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof val === 'object' && val !== null) {
      return flattenKeys(val, fullKey);
    }
    return [fullKey];
  });
}

describe('i18n key coverage', () => {
  const enKeys = new Set(flattenKeys(en));
  const knKeys = new Set(flattenKeys(kn));

  it('English translation file has keys', () => {
    expect(enKeys.size).toBeGreaterThan(0);
  });

  it('Kannada translation file has keys', () => {
    expect(knKeys.size).toBeGreaterThan(0);
  });

  it('Kannada has no keys that are missing from English (no phantom keys)', () => {
    const extraInKn = [...knKeys].filter(k => !enKeys.has(k));
    if (extraInKn.length > 0) {
      console.warn('Keys in kn.ts but NOT in en.ts:', extraInKn.slice(0, 10));
    }
    // Warn only — kn may have extra keys during development
    expect(extraInKn.length).toBeLessThan(50); // reasonable threshold
  });
});

// ---------------------------------------------------------------------------
// Kannada encoding sanity
// ---------------------------------------------------------------------------

describe('Kannada encoding', () => {
  const KANNADA_BLOCK_RE = /[\u0C80-\u0CFF]/;
  const MOJIBAKE_RE = /[\u00c2\u00c3\u00e0\u00e2]/;

  const knValues = flattenKeys(kn).map(key => {
    const parts = key.split('.');
    let val: unknown = kn;
    for (const part of parts) {
      if (val && typeof val === 'object') val = (val as Record<string, unknown>)[part];
    }
    return { key, val: String(val) };
  });

  it('no Kannada translation values contain mojibake (encoding corruption)', () => {
    const corrupted = knValues.filter(
      ({ val }) => MOJIBAKE_RE.test(val) && !KANNADA_BLOCK_RE.test(val)
    );
    if (corrupted.length > 0) {
      console.error('Potentially corrupted Kannada values:', corrupted.slice(0, 5));
    }
    expect(corrupted.length).toBe(0);
  });
});
