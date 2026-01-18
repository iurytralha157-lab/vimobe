import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Language, TranslationKeys, translations, t } from "@/i18n";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
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

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, lang);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

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
