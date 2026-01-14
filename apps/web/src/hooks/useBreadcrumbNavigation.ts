"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

/**
 * パンクズナビゲーションアイテムの型
 */
export interface BreadcrumbItem {
  /** アイテムID */
  id: string;
  /** 表示名 */
  name: string;
  /** リンク先URL */
  href?: string;
  /** アクティブ状態（現在のページ） */
  isActive?: boolean;
}

/**
 * パンクズナビゲーション設定
 */
export interface BreadcrumbConfig {
  /** ルート設定 */
  routes: Record<string, {
    /** ルート名の翻訳キー */
    nameKey: string;
    /** リンク先URL */
    href: string;
  }>;
  /** ルート翻訳の名前空間 */
  translationNamespace?: string;
}

/**
 * デフォルト設定
 */
const DEFAULT_CONFIG: BreadcrumbConfig = {
  routes: {
    home: { nameKey: "breadcrumb.home", href: "/" },
  },
  translationNamespace: "navigation",
};

/**
 * パンクズナビゲーションの戻り値型
 */
export interface UseBreadcrumbNavigationReturn {
  /** ナビゲーションアイテムを取得 */
  getBreadcrumbs: (path: string[], currentPageId?: string) => BreadcrumbItem[];
  /** ナビゲーション処理 */
  handleNavigation: (item: BreadcrumbItem) => void;
}

/**
 * パンクズナビゲーション用のカスタムフック
 *
 * @example
 * ```tsx
 * const { getBreadcrumbs, handleNavigation } = useBreadcrumbNavigation({
 *   routes: {
 *     dashboard: { nameKey: "breadcrumb.dashboard", href: "/" },
 *     users: { nameKey: "breadcrumb.users", href: "/users" },
 *   },
 * });
 *
 * const items = getBreadcrumbs(["dashboard", "users"], "users");
 * ```
 */
export function useBreadcrumbNavigation(
  config: BreadcrumbConfig = DEFAULT_CONFIG,
): UseBreadcrumbNavigationReturn {
  const router = useRouter();
  const { t } = useTranslation(config.translationNamespace || "navigation");

  /**
   * パスからパンクズナビゲーションアイテムを生成
   */
  const getBreadcrumbs = useCallback(
    (path: string[], currentPageId?: string): BreadcrumbItem[] => {
      return path.map((routeId) => {
        const route = config.routes[routeId];
        if (!route) {
          return {
            id: routeId,
            name: routeId,
            isActive: routeId === currentPageId,
          };
        }

        return {
          id: routeId,
          name: t(route.nameKey) as string,
          href: route.href,
          isActive: routeId === currentPageId,
        };
      });
    },
    [config.routes, t],
  );

  /**
   * ナビゲーション処理
   */
  const handleNavigation = useCallback(
    (item: BreadcrumbItem) => {
      if (item.href && !item.isActive) {
        router.push(item.href);
      }
    },
    [router],
  );

  return {
    getBreadcrumbs,
    handleNavigation,
  };
}
