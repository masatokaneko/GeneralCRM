"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { SortDirection } from "@/types/baseTable";

/**
 * テーブルアクションのコンテキスト型定義
 * ファイル操作やソート、選択など汎用的なアクションを管理
 */
export interface TableActionContextType<TRow = unknown> {
  // 汎用的な行クリックハンドラー
  onRowClick?: (item: TRow) => void;
  onMoreClick?: (item: TRow) => void;

  // ソート関連
  onSort?: (column: string, direction: SortDirection) => void;

  // 選択関連
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  onClearSelection?: () => void;

  // カスタムアクション（アプリケーション固有のアクションを追加可能）
  customActions?: Record<string, (item: TRow) => void>;
}

/**
 * テーブルアクションコンテキスト
 */
const TableActionContext = createContext<TableActionContextType | undefined>(
  undefined,
);

/**
 * TableActionProvider プロパティ
 */
export interface TableActionProviderProps<TRow = unknown>
  extends Omit<TableActionContextType<TRow>, "selectedIds"> {
  children: ReactNode;
  selectedIds?: string[];
}

/**
 * テーブルアクションプロバイダー
 */
export function TableActionProvider<TRow = unknown>({
  children,
  selectedIds = [],
  onRowClick,
  onMoreClick,
  onSort,
  onSelectionChange,
  onClearSelection,
  customActions,
}: TableActionProviderProps<TRow>) {
  const contextValue: TableActionContextType<TRow> = {
    selectedIds,
    onRowClick,
    onMoreClick,
    onSort,
    onSelectionChange,
    onClearSelection,
    customActions,
  };

  return (
    <TableActionContext.Provider value={contextValue as TableActionContextType}>
      {children}
    </TableActionContext.Provider>
  );
}

/**
 * テーブルアクションコンテキストを使用するカスタムフック
 */
export function useTableActions<TRow = unknown>(): TableActionContextType<TRow> {
  const context = useContext(TableActionContext);
  if (context === undefined) {
    throw new Error(
      "useTableActions must be used within a TableActionProvider",
    );
  }
  return context as TableActionContextType<TRow>;
}

/**
 * テーブルアクションコンテキストを安全に使用するカスタムフック
 * プロバイダーの外で使用された場合でもエラーにならない
 */
export function useTableActionsOptional<TRow = unknown>(): TableActionContextType<TRow> {
  const context = useContext(TableActionContext);
  return (context || {}) as TableActionContextType<TRow>;
}
