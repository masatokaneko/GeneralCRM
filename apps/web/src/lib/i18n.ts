import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import Backend from "i18next-http-backend";
import { initReactI18next } from "react-i18next";

// Supported languages type
export type SupportedLanguage = "ja" | "en";

// Supported languages
export const supportedLanguages: SupportedLanguage[] = ["ja", "en"];

// Default language
export const defaultLanguage: SupportedLanguage = "ja";

// Namespaces
export const namespaces = ["common", "navigation"] as const;
export type Namespace = (typeof namespaces)[number];

// i18next initialization
i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    debug: process.env.NODE_ENV === "development",
    fallbackLng: defaultLanguage,
    supportedLngs: supportedLanguages,
    ns: namespaces,
    defaultNS: "common",

    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      lookupLocalStorage: "i18nextLng",
      caches: ["localStorage"],
      convertDetectedLanguage: (lng: string) => {
        const normalizedLng = lng.split("-")[0] as SupportedLanguage;
        return supportedLanguages.includes(normalizedLng)
          ? normalizedLng
          : defaultLanguage;
      },
    },

    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },

    react: {
      useSuspense: true,
    },

    interpolation: {
      escapeValue: false,
    },

    load: "languageOnly",
    initImmediate: false,
  });

export default i18n;
