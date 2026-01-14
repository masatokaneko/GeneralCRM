/**
 * ライブラリのエクスポート集約
 */

export { cn } from "./utils";
export { default as i18n, supportedLanguages, defaultLanguage, namespaces } from "./i18n";
export type { SupportedLanguage, Namespace } from "./i18n";

// APIクライアント
export {
  createApiClient,
  apiClient,
  api,
  orvalApi,
} from "./api-client";
export type { ApiClientConfig } from "./api-client";

// ロガー
export { logger } from "./logger";
export type { ExternalLogServiceConfig } from "./logger";

// 無限スクロール
export {
  createInfiniteQueryFn,
  flattenInfiniteData,
  INFINITE_SCROLL_DEFAULTS,
} from "./infinite-scroll";
export type {
  InfiniteScrollPageResult,
  InfiniteScrollApiResponse,
  ItemMapper,
  CreateInfiniteQueryFnConfig,
} from "./infinite-scroll";
