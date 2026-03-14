/**
 * Locale configuration for AgriNext Gen.
 *
 * Central registry of supported locales, default/fallback locale,
 * browser-language detection, and locale resolution logic.
 *
 * Phase 1: en (English) + kn (Kannada).
 * To add a language later, append to SUPPORTED_LOCALES and add the
 * corresponding translation file + import in index.ts.
 */

export const SUPPORTED_LOCALES = ['en', 'kn'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'en';
export const FALLBACK_LOCALE: SupportedLocale = 'en';

/**
 * Type-guard: checks whether a string is a supported locale code.
 */
export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(locale);
}

/**
 * Map BCP-47 / navigator language tags to our supported locale codes.
 * Handles both exact matches ("kn") and regional variants ("kn-IN").
 */
const BROWSER_LANG_MAP: Record<string, SupportedLocale> = {
  en: 'en',
  kn: 'kn',
};

/**
 * Detect the best-matching supported locale from the browser's
 * navigator.languages (or navigator.language) list.
 *
 * Returns DEFAULT_LOCALE when no browser language maps to a supported locale.
 */
export function detectBrowserLocale(): SupportedLocale {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE;

  const candidates = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];

  for (const tag of candidates) {
    if (!tag) continue;

    const lower = tag.toLowerCase();

    if (isSupportedLocale(lower)) return lower;

    const primary = lower.split('-')[0];
    const mapped = BROWSER_LANG_MAP[primary];
    if (mapped) return mapped;
  }

  return DEFAULT_LOCALE;
}

/**
 * Resolve a locale value with fallback chain:
 *   saved value (if supported) -> browser detection -> DEFAULT_LOCALE
 */
export function resolveLocale(saved?: string | null): SupportedLocale {
  if (saved && isSupportedLocale(saved)) return saved;
  return detectBrowserLocale();
}
