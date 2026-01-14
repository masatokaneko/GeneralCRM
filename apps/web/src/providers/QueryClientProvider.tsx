"use client";

import {
  QueryClient,
  QueryClientProvider as ReactQueryClientProvider,
} from "@tanstack/react-query";
import { type ReactNode, useState } from "react";

/**
 * QueryClient設定
 */
export interface QueryClientConfig {
  /** データが新鮮とみなされる時間（ミリ秒） */
  staleTime?: number;
  /** ガベージコレクション時間（ミリ秒） */
  gcTime?: number;
  /** リトライ回数 */
  retry?: number | false;
  /** リフェッチ無効化（開発時など） */
  disableRefetch?: boolean;
}

/**
 * デフォルト設定
 */
const DEFAULT_CONFIG: Required<Omit<QueryClientConfig, "disableRefetch">> & {
  disableRefetch: boolean;
} = {
  staleTime: 60 * 1000, // 1分
  gcTime: 5 * 60 * 1000, // 5分
  retry: 1,
  disableRefetch: false,
};

interface QueryClientProviderProps {
  children: ReactNode;
  /** カスタム設定 */
  config?: QueryClientConfig;
}

/**
 * React Query用プロバイダー
 *
 * コンポーネントレベルでQueryClientのインスタンスを作成
 * サーバーコンポーネントとクライアントコンポーネント間でステートが共有されるのを防ぐ
 *
 * @example
 * ```tsx
 * // デフォルト設定
 * <QueryClientProvider>
 *   {children}
 * </QueryClientProvider>
 *
 * // カスタム設定
 * <QueryClientProvider config={{ staleTime: 30000, retry: 3 }}>
 *   {children}
 * </QueryClientProvider>
 * ```
 */
export function QueryClientProvider({ children, config }: QueryClientProviderProps) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: mergedConfig.staleTime,
            gcTime: mergedConfig.gcTime,
            retry: mergedConfig.retry,
            refetchOnWindowFocus: !mergedConfig.disableRefetch,
            refetchOnReconnect: !mergedConfig.disableRefetch,
          },
        },
      }),
  );

  return (
    <ReactQueryClientProvider client={queryClient}>
      {children}
    </ReactQueryClientProvider>
  );
}
