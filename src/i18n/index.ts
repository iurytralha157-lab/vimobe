import { ptBR } from "./translations/pt-BR";
import { en } from "./translations/en";

export type Language = "pt-BR" | "en";

export const translations = {
  "pt-BR": ptBR,
  en: en,
};

export type TranslationKeys = typeof ptBR;

export function getTranslation(language: Language): TranslationKeys {
  return translations[language];
}

export function t(
  language: Language,
  path: string,
  params?: Record<string, string | number>
): string {
  const keys = path.split(".");
  let value: unknown = translations[language];

  for (const key of keys) {
    if (value && typeof value === "object" && key in value) {
      value = (value as Record<string, unknown>)[key];
    } else {
      return path; // Return the path if translation not found
    }
  }

  if (typeof value !== "string") {
    return path;
  }

  // Replace parameters
  if (params) {
    return Object.entries(params).reduce((acc, [key, val]) => {
      return acc.replace(new RegExp(`{${key}}`, "g"), String(val));
    }, value);
  }

  return value;
}
