"use client";

import * as React from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n";

interface I18nProviderProps {
  children: React.ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    // Wait for i18n to be initialized
    if (i18n.isInitialized) {
      setIsReady(true);
    } else {
      i18n.on("initialized", () => {
        setIsReady(true);
      });
    }
  }, []);

  if (!isReady) {
    return null;
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
