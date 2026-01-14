"use client";

import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { SupportedLanguage } from "@/lib/i18n";
import { supportedLanguages } from "@/lib/i18n";

export function useLanguageSwitcher() {
  const { i18n } = useTranslation();

  const currentLanguage = i18n.language as SupportedLanguage;

  const changeLanguage = useCallback(
    async (lang: SupportedLanguage) => {
      await i18n.changeLanguage(lang);
    },
    [i18n],
  );

  const toggleLanguage = useCallback(async () => {
    const currentIndex = supportedLanguages.indexOf(currentLanguage);
    const nextIndex = (currentIndex + 1) % supportedLanguages.length;
    const nextLang = supportedLanguages[nextIndex];
    await i18n.changeLanguage(nextLang);
  }, [i18n, currentLanguage]);

  return {
    currentLanguage,
    supportedLanguages,
    changeLanguage,
    toggleLanguage,
  };
}
