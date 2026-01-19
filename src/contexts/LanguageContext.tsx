import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations, Language, TranslationKeys, t } from '@/i18n';
import { supabase } from '@/integrations/supabase/client';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (path: string, params?: Record<string, string | number>) => string;
  translations: TranslationKeys;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = "vimob-language";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (stored && (stored === "pt-BR" || stored === "en")) {
        return stored;
      }
      // Detect browser language
      const browserLang = navigator.language;
      if (browserLang.startsWith("pt")) {
        return "pt-BR";
      }
    }
    return "pt-BR";
  });

  const [userId, setUserId] = useState<string | null>(null);

  // Get user ID from session (independent of AuthContext to avoid circular dependency)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load language from user profile when logged in
  useEffect(() => {
    const loadUserLanguage = async () => {
      if (!userId) return;

      const { data } = await supabase
        .from('users')
        .select('language')
        .eq('id', userId)
        .single();

      if (data?.language && (data.language === 'pt-BR' || data.language === 'en')) {
        setLanguageState(data.language as Language);
        localStorage.setItem(STORAGE_KEY, data.language);
      }
    };

    loadUserLanguage();
  }, [userId]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);

    // If user is logged in, save to database
    if (userId) {
      try {
        await supabase
          .from('users')
          .update({ language: lang })
          .eq('id', userId);
      } catch (error) {
        console.error('Error saving language preference:', error);
      }
    }
  }, [userId]);

  const translate = useCallback(
    (path: string, params?: Record<string, string | number>) => {
      return t(language, path, params);
    },
    [language]
  );

  const value: LanguageContextType = {
    language,
    setLanguage,
    t: translate,
    translations: translations[language],
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
