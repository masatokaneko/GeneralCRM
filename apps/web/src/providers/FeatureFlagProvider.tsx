"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { createContext, type ReactNode, useContext, useMemo } from "react";

/**
 * フィーチャーフラグプロバイダー設定
 */
export interface FeatureFlagConfig {
  /** 利用可能なバージョン名リスト */
  versions: readonly string[];
  /** デフォルトバージョン */
  defaultVersion: string;
  /** クエリパラメータ名 */
  queryParamName?: string;
  /** パス名でのバージョン検知パターン（正規表現） */
  pathPatterns?: Record<string, RegExp>;
}

/**
 * フィーチャーフラグコンテキスト
 */
export interface FeatureFlagContextType<T extends string = string> {
  /** 現在のバージョン */
  version: T;
  /** バージョン判定ヘルパー */
  isVersion: (v: T) => boolean;
}

const FeatureFlagContext = createContext<FeatureFlagContextType | null>(null);

/**
 * デフォルト設定
 */
const DEFAULT_CONFIG: FeatureFlagConfig = {
  versions: ["v1", "v2"],
  defaultVersion: "v1",
  queryParamName: "version",
  pathPatterns: {},
};

interface FeatureFlagProviderProps {
  children: ReactNode;
  /** 設定（省略時はデフォルト） */
  config?: FeatureFlagConfig;
  /** 強制バージョン指定 */
  forcedVersion?: string;
}

/**
 * URLからバージョンを自動判定するヘルパー関数
 */
function getVersionFromUrl(
  pathname: string,
  searchParams: URLSearchParams | null,
  config: FeatureFlagConfig,
): string {
  // 1. クエリパラメータから取得
  const paramName = config.queryParamName || "version";
  const versionParam = searchParams?.get(paramName);

  if (versionParam && config.versions.includes(versionParam)) {
    return versionParam;
  }

  // 2. パス名での判定
  if (config.pathPatterns) {
    for (const [version, pattern] of Object.entries(config.pathPatterns)) {
      if (pattern.test(pathname)) {
        return version;
      }
    }
  }

  // 3. デフォルト
  return config.defaultVersion;
}

/**
 * フィーチャーフラグプロバイダー
 *
 * URLクエリパラメータから自動的にバージョンを判定します
 *
 * @example
 * ```tsx
 * // カスタム設定で使用
 * <FeatureFlagProvider config={{
 *   versions: ["first-release", "final-design"],
 *   defaultVersion: "first-release",
 * }}>
 *   {children}
 * </FeatureFlagProvider>
 * ```
 */
export function FeatureFlagProvider({
  children,
  config = DEFAULT_CONFIG,
  forcedVersion,
}: FeatureFlagProviderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const contextValue = useMemo(() => {
    const version = forcedVersion || getVersionFromUrl(pathname, searchParams, config);

    return {
      version,
      isVersion: (v: string) => version === v,
    };
  }, [pathname, searchParams, forcedVersion, config]);

  return (
    <FeatureFlagContext.Provider value={contextValue}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

/**
 * フィーチャーフラグフック
 *
 * @example
 * ```tsx
 * const { version, isVersion } = useFeatureFlags();
 * if (isVersion("v2")) {
 *   // v2専用の処理
 * }
 * ```
 */
export function useFeatureFlags<T extends string = string>(): FeatureFlagContextType<T> {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error("useFeatureFlags must be used within FeatureFlagProvider");
  }
  return context as unknown as FeatureFlagContextType<T>;
}
