// Supported languages type definition
export type SupportedLanguage = "ja" | "en";

// Supported languages configuration
export const supportedLanguages: SupportedLanguage[] = ["ja", "en"];

// Default language
export const defaultLanguage: SupportedLanguage = "ja";

// Namespace definitions
export const namespaces = ["common", "navigation"] as const;
export type Namespace = (typeof namespaces)[number];

// Re-export types for convenience
export type { SupportedLanguage as Language };
