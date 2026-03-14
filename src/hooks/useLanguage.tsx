import { useState, useEffect, useCallback, useRef, createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { t, Language, resolveLocale, isSupportedLocale, DEFAULT_LOCALE } from '@/i18n';
import { STORAGE_KEYS, LEGACY_LANGUAGE_KEYS } from '@/lib/constants';
import { toast } from 'sonner';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string) => string;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

/**
 * One-time migration: move any value stored under legacy localStorage keys
 * to the canonical key, then remove the old entries. Runs once per page load.
 */
function migrateLegacyKeys(): void {
  try {
    const currentValue = localStorage.getItem(STORAGE_KEYS.LANGUAGE);
    if (currentValue && isSupportedLocale(currentValue)) return;

    for (const legacyKey of LEGACY_LANGUAGE_KEYS) {
      const legacy = localStorage.getItem(legacyKey);
      if (legacy && isSupportedLocale(legacy)) {
        localStorage.setItem(STORAGE_KEYS.LANGUAGE, legacy);
        localStorage.removeItem(legacyKey);
        return;
      }
    }
  } catch {
    // localStorage unavailable (SSR, private browsing) — safe to ignore
  }
}

/**
 * Read the current language from localStorage for a given storage key,
 * falling back to browser detection then DEFAULT_LOCALE.
 */
function readStoredLocale(storageKey: string): Language {
  try {
    const stored = localStorage.getItem(storageKey);
    return resolveLocale(stored);
  } catch {
    return resolveLocale(null);
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const prevUserIdRef = useRef<string | null>(null);
  const profileFetchedRef = useRef(false);

  // Run legacy key migration once on first mount
  const [migrated] = useState(() => {
    migrateLegacyKeys();
    return true;
  });

  // Initial state: use PUBLIC_LANGUAGE for public visitors;
  // authenticated users start at DEFAULT_LOCALE until profile hydrates.
  const [language, setLanguageState] = useState<Language>(() => {
    if (migrated) { /* ensures migration runs before first read */ }
    return readStoredLocale(STORAGE_KEYS.PUBLIC_LANGUAGE);
  });
  const [isLoading, setIsLoading] = useState(false);

  // Load language from profile when an authenticated user is present.
  // On logout (user goes null), revert to public language preference.
  useEffect(() => {
    const userId = user?.id ?? null;
    const prevUserId = prevUserIdRef.current;
    prevUserIdRef.current = userId;

    if (userId) {
      profileFetchedRef.current = false;

      let retries = 0;
      const fetchProfileLanguage = async (): Promise<void> => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('preferred_language')
            .eq('id', userId)
            .maybeSingle();

          if (error) throw error;

          const resolved = resolveLocale(data?.preferred_language);
          setLanguageState(resolved);
          try { localStorage.setItem(STORAGE_KEYS.LANGUAGE, resolved); } catch {}
          profileFetchedRef.current = true;
        } catch (error) {
          if (retries < 1) {
            retries++;
            await fetchProfileLanguage();
            return;
          }
          if (import.meta.env.DEV) console.error('Failed to load language preference:', error);
          setLanguageState(DEFAULT_LOCALE);
          profileFetchedRef.current = true;
        }
      };

      fetchProfileLanguage();
    } else if (prevUserId !== null) {
      // User just logged out — revert to public language preference
      profileFetchedRef.current = false;
      const publicLang = readStoredLocale(STORAGE_KEYS.PUBLIC_LANGUAGE);
      setLanguageState(publicLang);
    }
  }, [user?.id]);

  // While auth is loading and no user yet, keep showing PUBLIC_LANGUAGE.
  // Once auth resolves with no user, stay on PUBLIC_LANGUAGE.
  useEffect(() => {
    if (!authLoading && !user) {
      setLanguageState(readStoredLocale(STORAGE_KEYS.PUBLIC_LANGUAGE));
    }
  }, [authLoading, user]);

  const setLanguage = useCallback(async (lang: Language) => {
    const previousLang = language;
    setIsLoading(true);

    // Optimistic: update UI immediately
    setLanguageState(lang);

    if (user?.id) {
      // Authenticated: persist to profile (single source of truth)
      try {
        localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
      } catch {}

      try {
        const { error } = await supabase
          .from('profiles')
          .update({ preferred_language: lang })
          .eq('id', user.id);

        if (error) throw error;

        toast.success(t('toast.languageChanged', lang));
      } catch (error) {
        if (import.meta.env.DEV) console.error('Failed to save language preference:', error);
        toast.error(t('errors.languagePreferenceSaveFailed', previousLang));
        // Revert on failure
        setLanguageState(previousLang);
        try { localStorage.setItem(STORAGE_KEYS.LANGUAGE, previousLang); } catch {}
      }
    } else {
      // Public: persist to PUBLIC_LANGUAGE only
      try {
        localStorage.setItem(STORAGE_KEYS.PUBLIC_LANGUAGE, lang);
      } catch {}
    }

    setIsLoading(false);
  }, [user?.id, language]);

  const translate = useCallback((key: string) => t(key, language), [language]);

  return (
    <LanguageContext.Provider value={{
      language,
      setLanguage,
      t: translate,
      isLoading
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (context === undefined) {
    // Return default if used outside provider (for gradual adoption)
    return {
      language: 'en' as Language,
      setLanguage: async () => {},
      t: (key: string) => t(key, 'en'),
      isLoading: false,
    };
  }

  return context;
}
