"use client";

import type { ReactNode } from "react";
import type { BaseTableData, SortDirection } from "@/types/baseTable";
import {
  TableActionProvider,
  type TableActionProviderProps,
  useTableActionsOptional,
} from "./TableActionContext";
import {
  TableConfigProvider,
  type TableConfigProviderProps,
  useTableConfigOptional,
} from "./TableConfigContext";
import {
  TableDataProvider,
  type TableDataProviderProps,
  useTableDataOptional,
} from "./TableDataContext";

/**
 * 統合テーブルプロバイダーのプロパティ
 * @template T - テーブルデータの型
 * @template TQueryFnData - infiniteQueryFnの戻り値の型
 * @template TPageParam - ページパラメータの型
 */
export interface TableProviderProps<
  T extends BaseTableData = BaseTableData,
  TRow = unknown,
  TQueryFnData = unknown,
  TPageParam = unknown,
> extends Omit<TableActionProviderProps<TRow>, "children">,
  Omit<TableConfigProviderProps<TQueryFnData, TPageParam>, "children">,
  Omit<TableDataProviderProps<T>, "children"> {
  children: ReactNode;
  // 無限スクロール用の直接プロパティ（利便性のため）
  queryKey?: (string | number)[];
  infiniteQueryFn?: (params: {
    pageParam: TPageParam;
    signal?: AbortSignal;
  }) => Promise<TQueryFnData>;
  initialPageParam?: TPageParam;
  getNextPageParam?: (
    lastPage: TQueryFnData,
    allPages: TQueryFnData[],
    lastPageParam: TPageParam,
    allPageParams: TPageParam[],
  ) => TPageParam | undefined | null;
}

/**
 * 統合テーブルプロバイダー
 * TableAction、TableConfig、TableDataの3つのContextを統合
 */
export function TableProvider<
  T extends BaseTableData = BaseTableData,
  TRow = unknown,
  TQueryFnData = unknown,
  TPageParam = unknown,
>({
  children,
  // TableActionProvider props
  selectedIds,
  onRowClick,
  onMoreClick,
  onSort,
  onSelectionChange,
  onClearSelection,
  customActions,
  // TableConfigProvider props
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
  // 無限スクロール用の直接プロパティ
  queryKey,
  infiniteQueryFn,
  initialPageParam,
  getNextPageParam,
  // TableDataProvider props
  data,
  totalCount,
  sortColumn,
  sortDirection,
  searchQuery,
  currentPage,
  pageSize,
  hasNextPage,
  hasPreviousPage,
  refetch,
  setData,
  setLoading,
  setError,
  setSearchQuery,
  setSortConfig,
  setCurrentPage,
  setPageSize,
  setSelectedIds,
}: TableProviderProps<T, TRow, TQueryFnData, TPageParam>) {
  // 直接プロパティとinfiniteScrollConfigをマージ
  const mergedInfiniteScrollConfig =
    infiniteScrollConfig ||
      queryKey ||
      infiniteQueryFn ||
      initialPageParam !== undefined ||
      getNextPageParam
      ? {
        ...infiniteScrollConfig,
        ...(queryKey && { queryKey }),
        ...(infiniteQueryFn && { infiniteQueryFn }),
        ...(initialPageParam !== undefined && { initialPageParam }),
        ...(getNextPageParam && { getNextPageParam }),
      }
      : undefined;

  // 無限スクロール有効時はdataをundefinedに設定（infiniteQueryFnがデータを管理）
  const effectiveData =
    enableInfiniteScroll && mergedInfiniteScrollConfig ? undefined : data || [];

  return (
    <TableDataProvider
      data={effectiveData}
      loading={loading}
      error={error}
      totalCount={totalCount}
      sortColumn={sortColumn}
      sortDirection={sortDirection}
      searchQuery={searchQuery}
      currentPage={currentPage}
      pageSize={pageSize}
      hasNextPage={hasNextPage}
      hasPreviousPage={hasPreviousPage}
      selectedIds={selectedIds}
      refetch={refetch}
      setData={setData}
      setLoading={setLoading}
      setError={setError}
      setSearchQuery={setSearchQuery}
      setSortConfig={setSortConfig}
      setCurrentPage={setCurrentPage}
      setPageSize={setPageSize}
      setSelectedIds={setSelectedIds}
    >
      <TableConfigProvider
        enableStripe={enableStripe}
        enableSort={enableSort}
        enableSelect={enableSelect}
        compact={compact}
        stickyHeader={stickyHeader}
        enableVirtualization={enableVirtualization}
        virtualizationConfig={virtualizationConfig}
        enableInfiniteScroll={enableInfiniteScroll}
        infiniteScrollConfig={mergedInfiniteScrollConfig}
        emptyMessage={emptyMessage}
        loading={loading}
        error={error}
        customColumnWidths={customColumnWidths}
      >
        <TableActionProvider
          selectedIds={selectedIds}
          onRowClick={onRowClick}
          onMoreClick={onMoreClick}
          onSort={onSort}
          onSelectionChange={onSelectionChange}
          onClearSelection={onClearSelection}
          customActions={customActions}
        >
          {children}
        </TableActionProvider>
      </TableConfigProvider>
    </TableDataProvider>
  );
}

/**
 * 統合テーブルフック
 * 全てのテーブル関連Contextを一度に取得
 */
export function useTable<T extends BaseTableData = BaseTableData, TRow = unknown>() {
  const actions = useTableActionsOptional<TRow>();
  const config = useTableConfigOptional();
  const data = useTableDataOptional<T>();

  return {
    actions,
    config,
    data,
  };
}

// 個別フックの再エクスポート
export { useTableActions, useTableActionsOptional } from "./TableActionContext";
export { useTableConfig, useTableConfigOptional } from "./TableConfigContext";
export { useTableData, useTableDataOptional } from "./TableDataContext";
