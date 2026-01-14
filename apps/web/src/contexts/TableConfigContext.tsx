"use client";

import { createContext, type ReactNode, useContext } from "react";

/**
 * テーブル設定のコンテキスト型定義
 * @template TQueryFnData - infiniteQueryFnの戻り値の型
 * @template TPageParam - ページパラメータの型
 */
export interface TableConfigContextType<
  TQueryFnData = unknown,
  TPageParam = unknown,
> {
  // 基本設定
  enableStripe?: boolean;
  enableSort?: boolean;
  enableSelect?: boolean;
  compact?: boolean;
  stickyHeader?: boolean;

  // 仮想化設定
  enableVirtualization?: boolean;
  virtualizationConfig?: {
    itemHeight?: number;
    overscan?: number;
    estimateSize?: (index: number) => number;
    getScrollElement?: () => HTMLElement | null;
    measureElement?: (element: HTMLElement | null) => void;
    scrollMargin?: number;
  };

  // 無限スクロール設定
  enableInfiniteScroll?: boolean;
  infiniteScrollConfig?: {
    fetchNextPage?: () => Promise<void>;
    hasNextPage?: boolean;
    isFetchingNextPage?: boolean;
    isFetchNextPageError?: boolean;
    onEndReached?: () => void;
    queryKey?: (string | number)[];
    initialPageParam?: TPageParam;
    getNextPageParam?: (
      lastPage: TQueryFnData,
      allPages: TQueryFnData[],
      lastPageParam: TPageParam,
      allPageParams: TPageParam[],
    ) => TPageParam | undefined | null;
    loadMoreTriggerPoint?: number;
    infiniteQueryFn?: (params: {
      pageParam: TPageParam;
      signal?: AbortSignal;
    }) => Promise<TQueryFnData>;
  };

  // 表示設定
  emptyMessage?: string;
  loading?: boolean;
  error?: string | null;

  // 列設定
  customColumnWidths?: Record<string, string>;
}

/**
 * テーブル設定コンテキスト
 */
const TableConfigContext = createContext<
  TableConfigContextType<unknown, unknown> | undefined
>(undefined);

/**
 * TableConfigProvider プロパティ
 */
export interface TableConfigProviderProps<
  TQueryFnData = unknown,
  TPageParam = unknown,
> extends TableConfigContextType<TQueryFnData, TPageParam> {
  children: ReactNode;
}

/**
 * テーブル設定プロバイダー
 */
export function TableConfigProvider<
  TQueryFnData = unknown,
  TPageParam = unknown,
>({
  children,
  enableStripe = true,
  enableSort = false,
  enableSelect = false,
  compact = false,
  stickyHeader = true,
  enableVirtualization = false,
  virtualizationConfig,
  enableInfiniteScroll = false,
  infiniteScrollConfig,
  emptyMessage,
  loading = false,
  error = null,
  customColumnWidths,
}: TableConfigProviderProps<TQueryFnData, TPageParam>) {
  const contextValue: TableConfigContextType<TQueryFnData, TPageParam> = {
    enableStripe,
    enableSort,
    enableSelect,
    compact,
    stickyHeader,
    enableVirtualization,
    virtualizationConfig,
    enableInfiniteScroll,
    infiniteScrollConfig,
    emptyMessage,
    loading,
    error,
    customColumnWidths,
  };

  return (
    <TableConfigContext.Provider value={contextValue as TableConfigContextType}>
      {children}
    </TableConfigContext.Provider>
  );
}

/**
 * テーブル設定コンテキストを使用するカスタムフック
 */
export function useTableConfig<
  TQueryFnData = unknown,
  TPageParam = unknown,
>(): TableConfigContextType<TQueryFnData, TPageParam> {
  const context = useContext(TableConfigContext);
  if (context === undefined) {
    throw new Error("useTableConfig must be used within a TableConfigProvider");
  }
  return context as TableConfigContextType<TQueryFnData, TPageParam>;
}

/**
 * テーブル設定コンテキストを安全に使用するカスタムフック
 */
export function useTableConfigOptional<
  TQueryFnData = unknown,
  TPageParam = unknown,
>(): TableConfigContextType<TQueryFnData, TPageParam> {
  const context = useContext(TableConfigContext);
  return (context || {}) as TableConfigContextType<TQueryFnData, TPageParam>;
}
