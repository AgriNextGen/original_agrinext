import { en } from './en';
import { kn } from './kn';
import { resolveTranslationAlias } from './aliases';

export type Language = 'en' | 'kn';
export type TranslationKeys = typeof en;

const translations: Record<Language, TranslationKeys> = {
  en,
  kn,
};

// Track missing keys in development
const missingKeys = new Set<string>();

// Get nested value from object using dot notation
function getNestedValue(obj: Record<string, any>, path: string): string | undefined {
  const keys = path.split('.');
  let current: any = obj;
  
  for (const key of keys) {
    if (current === undefined || current === null) {
      return undefined;
    }
    current = current[key];
  }
  
  return typeof current === 'string' ? current : undefined;
}

/**
 * Log missing translation keys in development
 */
function logMissingKey(key: string, language: Language): void {
  const logKey = `${language}:${key}`;
  if (!missingKeys.has(logKey) && import.meta.env.DEV) {
    missingKeys.add(logKey);
    console.warn(`[i18n] Missing ${language.toUpperCase()} key: "${key}"`);
  }
}

/**
 * Check for missing keys between languages (dev helper)
 */
export function validateTranslations(): { missing: string[]; extra: string[] } {
  const enKeys = new Set<string>();
  const knKeys = new Set<string>();
  
  function collectKeys(obj: Record<string, any>, prefix: string, set: Set<string>) {
    for (const key of Object.keys(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        collectKeys(obj[key], fullKey, set);
      } else {
        set.add(fullKey);
      }
    }
  }
  
  collectKeys(en, '', enKeys);
  collectKeys(kn, '', knKeys);
  
  const missing = [...enKeys].filter(k => !knKeys.has(k));
  const extra = [...knKeys].filter(k => !enKeys.has(k));
  
  if (import.meta.env.DEV && (missing.length > 0 || extra.length > 0)) {
    if (missing.length > 0) {
      console.warn('[i18n] Missing Kannada translations:', missing);
    }
    if (extra.length > 0) {
      console.warn('[i18n] Extra Kannada keys (not in English):', extra);
    }
  }
  
  return { missing, extra };
}

/**
 * Get translation for a key
 * Falls back to English if key not found in current language
 * Falls back to the key itself if not found in English either
 */
export function t(key: string, language: Language = 'en'): string {
  const translation = getNestedValue(translations[language], key);
  
  if (translation !== undefined) {
    return translation;
  }

  const aliasedKey = resolveTranslationAlias(key);
  if (aliasedKey && aliasedKey !== key) {
    const aliasedTranslation = getNestedValue(translations[language], aliasedKey);
    if (aliasedTranslation !== undefined) {
      return aliasedTranslation;
    }
  }
  
  // Log missing key
  logMissingKey(key, language);
  
  // Fallback to English
  if (language !== 'en') {
    const fallback = getNestedValue(translations.en, key);
    if (fallback !== undefined) {
      return fallback;
    }

    if (aliasedKey && aliasedKey !== key) {
      const aliasedFallback = getNestedValue(translations.en, aliasedKey);
      if (aliasedFallback !== undefined) {
        return aliasedFallback;
      }
    }
  }
  
  // Return key as last resort (never blank)
  return key.split('.').pop() || key;
}

export { en, kn };
