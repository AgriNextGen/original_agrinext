import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { t, Language } from '@/i18n';
import { toast } from 'sonner';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string) => string;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = 'agri-mitra-language';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<Language>(() => {
    // Initialize from localStorage for instant UI
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return (stored === 'kn' ? 'kn' : 'en') as Language;
  });
  const [isLoading, setIsLoading] = useState(false);

  // Load language from profile on mount
  useEffect(() => {
    const loadLanguageFromProfile = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('preferred_language')
          .eq('id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data?.preferred_language && (data.preferred_language === 'en' || data.preferred_language === 'kn')) {
          const lang = data.preferred_language as Language;
          setLanguageState(lang);
          localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
        }
      } catch (error) {
        console.error('Failed to load language preference:', error);
      }
    };

    loadLanguageFromProfile();
  }, [user?.id]);

  const setLanguage = useCallback(async (lang: Language) => {
    setIsLoading(true);
    
    // Update local state immediately for instant UI feedback
    setLanguageState(lang);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);

    // Persist to database if user is logged in
    if (user?.id) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ preferred_language: lang })
          .eq('id', user.id);

        if (error) throw error;
        
        toast.success(t('toast.languageChanged', lang));
      } catch (error) {
        console.error('Failed to save language preference:', error);
        toast.error(t('errors.languagePreferenceSaveFailed', lang));
      }
    }

    setIsLoading(false);
  }, [user?.id]);

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
