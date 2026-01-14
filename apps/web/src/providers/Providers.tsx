"use client";

import * as React from "react";
import { QueryClientProvider } from "./QueryClientProvider";
import { MSWProvider } from "./MSWProvider";
import { AuthProvider } from "./AuthProvider";
import { ThemeProvider } from "./ThemeProvider";
import { I18nProvider } from "./I18nProvider";

interface ProvidersProps {
  children: React.ReactNode;
}

const keycloakConfig = {
  url: process.env.NEXT_PUBLIC_KEYCLOAK_URL || "http://localhost:8080",
  realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM || "crm",
  clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || "crm-web",
};

// Check if MSW should be enabled
const isMswEnabled = process.env.NEXT_PUBLIC_MSW_ENABLED === "true";

// MSW initialization function
const initMsw = async () => {
  if (typeof window !== "undefined" && isMswEnabled) {
    const { initMsw: init } = await import("@/mocks/browser");
    await init();
  }
};

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <MSWProvider initMsw={isMswEnabled ? initMsw : undefined}>
          <QueryClientProvider>
            <AuthProvider config={keycloakConfig}>{children}</AuthProvider>
          </QueryClientProvider>
        </MSWProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
