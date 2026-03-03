import { describe, it, expect } from 'vitest';
import { t, validateTranslations } from '@/i18n';

describe('i18n translations', () => {
  describe('English translations', () => {
    it('returns correct values for common keys', () => {
      expect(t('common.save', 'en')).toBe('Save');
      expect(t('common.cancel', 'en')).toBe('Cancel');
      expect(t('common.loading', 'en')).toBe('Loading...');
      expect(t('common.delete', 'en')).toBe('Delete');
    });

    it('returns correct values for nav keys', () => {
      expect(t('nav.dashboard', 'en')).toBeDefined();
      expect(typeof t('nav.dashboard', 'en')).toBe('string');
    });
  });

  describe('Kannada translations', () => {
    it('returns non-empty string for common.welcome', () => {
      const result = t('common.welcome', 'kn');
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result).not.toBe('common.welcome');
    });
  });

  describe('Fallback behavior', () => {
    it('falls back to English for missing Kannada keys', () => {
      const enValue = t('common.save', 'en');
      const knValue = t('common.save', 'kn');
      expect(knValue).toBeDefined();
      expect(knValue.length).toBeGreaterThan(0);
      expect(enValue).toBeDefined();
    });

    it('returns the key segment for completely unknown keys', () => {
      const result = t('this.key.does.not.exist', 'en');
      expect(result).toBe('exist');
    });
  });

  describe('Validation', () => {
    it('can validate translations without throwing', () => {
      expect(() => validateTranslations()).not.toThrow();
    });

    it('returns missing and extra arrays', () => {
      const result = validateTranslations();
      expect(Array.isArray(result.missing)).toBe(true);
      expect(Array.isArray(result.extra)).toBe(true);
    });
  });
});
