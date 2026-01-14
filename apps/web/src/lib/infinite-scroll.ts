/**
 * 無限スクロール用のユーティリティ関数
 */

import type { BaseTableData } from "@/types/baseTable";

/**
 * 無限スクロール用のページ結果
 */
export interface InfiniteScrollPageResult<T> {
  items: T[];
  nextCursor: number | string | null;
}

/**
 * APIレスポンスの型定義
 */
export interface InfiniteScrollApiResponse<T> {
  data: {
    items: T[];
  };
  pagination: {
    cursor?: string;
    hasMore: boolean;
    total?: number;
    page?: number;
    perPage?: number;
  };
}

/**
 * アイテムマッパー関数の型
 */
export type ItemMapper<TSource, TTarget> = (item: TSource) => TTarget;

/**
 * 無限スクロール用のクエリ関数を生成する設定
 */
export interface CreateInfiniteQueryFnConfig<TSource, TTarget> {
  /**
   * APIエンドポイントのベースURL（例: "/api/items"）
   */
  endpoint: string;
  /**
   * クエリパラメータを生成する関数
   */
  buildQueryParams: (cursor: number | string) => Record<string, string | number>;
  /**
   * APIレスポンスのアイテムをターゲット型にマッピングする関数
   */
  mapItem: ItemMapper<TSource, TTarget>;
  /**
   * fetchオプション（ヘッダー等）
   */
  fetchOptions?: RequestInit;
  /**
   * basePathを構築する関数（オプション）
   */
  buildPath?: (path: string) => string;
}

/**
 * 汎用的な無限スクロール用のクエリ関数を生成
 *
 * @example
 * ```typescript
 * const infiniteQueryFn = createInfiniteQueryFn({
 *   endpoint: '/api/items',
 *   buildQueryParams: (cursor) => ({
 *     cursor: cursor.toString(),
 *     'per-page': 50,
 *   }),
 *   mapItem: (item: ApiItem) => ({
 *     id: item.itemId,
 *     name: item.itemName,
 *   }),
 * });
 * ```
 */
export function createInfiniteQueryFn<TSource = unknown, TTarget = unknown>({
  endpoint,
  buildQueryParams,
  mapItem,
  fetchOptions,
  buildPath = (path) => path,
}: CreateInfiniteQueryFnConfig<TSource, TTarget>) {
  return async ({
    pageParam,
  }: {
    pageParam: unknown;
  }): Promise<InfiniteScrollPageResult<TTarget>> => {
    const cursor = (pageParam as number | string) || 0;

    // クエリパラメータを構築
    const params = buildQueryParams(cursor);
    const queryString = new URLSearchParams(
      Object.entries(params).reduce(
        (acc, [key, value]) => {
          acc[key] = String(value);
          return acc;
        },
        {} as Record<string, string>,
      ),
    ).toString();

    // APIリクエスト
    const response = await fetch(
      `${buildPath(endpoint)}?${queryString}`,
      fetchOptions,
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch from ${endpoint}: ${response.statusText}`);
    }

    const result: InfiniteScrollApiResponse<TSource> = await response.json();

    // アイテムをマッピング
    const items = result.data.items.map(mapItem);

    // 次のカーソルを計算
    const nextCursor = result.pagination.hasMore && result.pagination.cursor
      ? result.pagination.cursor
      : null;

    return {
      items,
      nextCursor,
    };
  };
}

/**
 * 無限スクロールのデフォルト設定
 */
export const INFINITE_SCROLL_DEFAULTS = {
  /** デフォルトの1ページあたりのアイテム数 */
  perPage: 50,
  /** ロード開始トリガーポイント（ビューポート外のピクセル数） */
  loadMoreTriggerPoint: 200,
} as const;

/**
 * 無限スクロール結果をフラット化するヘルパー
 */
export function flattenInfiniteData<T extends BaseTableData>(
  pages: InfiniteScrollPageResult<T>[] | undefined,
): T[] {
  if (!pages) return [];
  return pages.flatMap((page) => page.items);
}
