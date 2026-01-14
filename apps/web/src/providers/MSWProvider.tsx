"use client";

import { type ReactNode, useEffect, useState } from "react";

interface MSWProviderProps {
  children: ReactNode;
  /** MSWを有効化する環境 */
  enabledEnvs?: string[];
  /** MSW初期化関数 */
  initMsw?: () => Promise<void>;
}

/**
 * Mock Service Workerプロバイダー
 *
 * 開発環境やテスト環境でAPIモックを有効化
 *
 * @example
 * ```tsx
 * // カスタム初期化関数を指定
 * <MSWProvider
 *   enabledEnvs={["development", "test"]}
 *   initMsw={async () => {
 *     const { worker } = await import("@/mocks/browser");
 *     await worker.start();
 *   }}
 * >
 *   {children}
 * </MSWProvider>
 * ```
 */
export function MSWProvider({
  children,
  enabledEnvs = ["development"],
  initMsw,
}: MSWProviderProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const shouldEnable =
      enabledEnvs.includes(process.env.NODE_ENV) &&
      typeof window !== "undefined";

    if (!shouldEnable) {
      setIsReady(true);
      return;
    }

    const init = async () => {
      try {
        if (initMsw) {
          await initMsw();
        }
        // カスタム初期化関数が提供されない場合はスキップ
        // モックを使用する場合はinitMsw関数を提供する必要があります
      } catch (error) {
        console.error("MSW initialization failed:", error);
      } finally {
        setIsReady(true);
      }
    };

    init();
  }, [enabledEnvs, initMsw]);

  // MSW初期化完了まで待機
  if (!isReady) {
    return null;
  }

  return <>{children}</>;
}
