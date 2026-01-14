"use client";

import React, { createContext, type ReactNode, useContext, useMemo } from "react";

import type { BaseTableData, SortDirection } from "@/types/baseTable";

/**
 * テーブルデータのコンテキスト型定義
 */
export interface TableDataContextType<T extends BaseTableData = BaseTableData> {
  // データ状態
  data?: T[];
  loading?: boolean;
  error?: string | null;
  totalCount?: number;

  // フィルタリング・ソート状態
  filteredData?: T[];
  sortColumn?: string;
  sortDirection?: SortDirection;
  searchQuery?: string;

  // ページネーション状態
  currentPage?: number;
  pageSize?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;

  // 選択状態
  selectedIds?: string[];

  // データ操作関数
  refetch?: () => Promise<void>;
  setData?: (data: T[]) => void;
  setLoading?: (loading: boolean) => void;
  setError?: (error: string | null) => void;

  // フィルタリング・ソート操作
  setSearchQuery?: (query: string) => void;
  setSortConfig?: (column: string, direction: SortDirection) => void;

  // ページネーション操作
  setCurrentPage?: (page: number) => void;
  setPageSize?: (size: number) => void;

  // 選択操作
  setSelectedIds?: (ids: string[]) => void;
}

/**
 * テーブルデータコンテキスト
 */
const TableDataContext = createContext<TableDataContextType<BaseTableData> | undefined>(
  undefined,
);

/**
 * TableDataProvider プロパティ
 */
export interface TableDataProviderProps<
  T extends BaseTableData = BaseTableData,
> {
  children: ReactNode;
  // データ状態
  data?: T[];
  loading?: boolean;
  error?: string | null;
  totalCount?: number;

  // フィルタリング・ソート状態
  sortColumn?: string;
  sortDirection?: SortDirection;
  searchQuery?: string;

  // ページネーション状態
  currentPage?: number;
  pageSize?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;

  // 選択状態
  selectedIds?: string[];

  // データ操作関数
  refetch?: () => Promise<void>;
  setData?: (data: T[]) => void;
  setLoading?: (loading: boolean) => void;
  setError?: (error: string | null) => void;

  // フィルタリング・ソート操作
  setSearchQuery?: (query: string) => void;
  setSortConfig?: (column: string, direction: SortDirection) => void;

  // ページネーション操作
  setCurrentPage?: (page: number) => void;
  setPageSize?: (size: number) => void;

  // 選択操作
  setSelectedIds?: (ids: string[]) => void;
}

/**
 * テーブルデータプロバイダー
 */
export function TableDataProvider<T extends BaseTableData = BaseTableData>({
  children,
  data,
  loading = false,
  error = null,
  totalCount,
  sortColumn,
  sortDirection,
  searchQuery,
  currentPage = 1,
  pageSize = 50,
  hasNextPage = false,
  hasPreviousPage = false,
  selectedIds = [],
  refetch,
  setData,
  setLoading,
  setError,
  setSearchQuery,
  setSortConfig,
  setCurrentPage,
  setPageSize,
  setSelectedIds,
}: TableDataProviderProps<T>) {
  // フィルタリング済みデータの計算
  const filteredData = useMemo(() => {
    if (!Array.isArray(data)) {
      return [];
    }

    let result = [...data];

    // 検索フィルタリング
    if (searchQuery) {
      result = result.filter((item) =>
        Object.values(item).some((value) =>
          String(value).toLowerCase().includes(searchQuery.toLowerCase()),
        ),
      );
    }

    // ソート
    if (sortColumn && sortDirection) {
      result.sort((a, b) => {
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];

        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return sortDirection === "asc" ? -1 : 1;
        if (bValue == null) return sortDirection === "asc" ? 1 : -1;

        const aStr = String(aValue);
        const bStr = String(bValue);

        if (aStr < bStr) return sortDirection === "asc" ? -1 : 1;
        if (aStr > bStr) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchQuery, sortColumn, sortDirection]);

  const contextValue: TableDataContextType<T> = {
    data,
    loading,
    error,
    totalCount,
    filteredData,
    sortColumn,
    sortDirection,
    searchQuery,
    currentPage,
    pageSize,
    hasNextPage,
    hasPreviousPage,
    selectedIds,
    refetch,
    setData,
    setLoading,
    setError,
    setSearchQuery,
    setSortConfig,
    setCurrentPage,
    setPageSize,
    setSelectedIds,
  };

  return (
    <TableDataContext.Provider
      value={contextValue as unknown as TableDataContextType<BaseTableData>}
    >
      {children}
    </TableDataContext.Provider>
  );
}

/**
 * テーブルデータコンテキストを使用するカスタムフック
 */
export function useTableData<
  T extends BaseTableData = BaseTableData,
>(): TableDataContextType<T> {
  const context = useContext(TableDataContext);
  if (context === undefined) {
    throw new Error("useTableData must be used within a TableDataProvider");
  }
  return context as unknown as TableDataContextType<T>;
}

/**
 * テーブルデータコンテキストを安全に使用するカスタムフック
 */
export function useTableDataOptional<
  T extends BaseTableData = BaseTableData,
>(): TableDataContextType<T> {
  const context = useContext(TableDataContext);

  const defaultContext: TableDataContextType<T> = {
    data: [],
    loading: false,
    error: null,
    totalCount: 0,
    filteredData: [],
    sortColumn: undefined,
    sortDirection: undefined,
    searchQuery: undefined,
    currentPage: 1,
    pageSize: 50,
    hasNextPage: false,
    hasPreviousPage: false,
    selectedIds: [],
  };

  return (context as unknown as TableDataContextType<T>) || defaultContext;
}
