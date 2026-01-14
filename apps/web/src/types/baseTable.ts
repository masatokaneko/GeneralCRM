/**
 * BaseTable コンポーネント用の型定義
 * テーブル構造共通化のためのベース型を提供
 */
import type React from "react";
import type { CellValue, TableColumnConfig } from "./table";

/**
 * ベーステーブルに必須のデータプロパティ
 */
export interface BaseTableData {
  /** 一意の識別子 */
  id: string;
  /** 任意のキーと値のペア - さまざまな型（string, number, boolean, ReactNode など）を許容 */
  [key: string]: CellValue | unknown;
}

/**
 * ソートの方向を定義
 */
export type SortDirection = "asc" | "desc";

/**
 * ソート設定
 */
export interface SortConfig {
  /** ソート対象のキー */
  key: string;
  /** ソートの方向 */
  direction: SortDirection;
}

/**
 * テーブル基本設定
 */
export interface BaseTableConfig {
  /** 列定義 */
  columns: TableColumnConfig[];
  /** ソート機能を有効化するフラグ */
  enableSort?: boolean;
  /** 行選択機能を有効化するフラグ */
  enableSelect?: boolean;
  /** ヘッダー固定を有効化するフラグ */
  stickyHeader?: boolean;
  /** レスポンシブ対応を有効化するフラグ */
  responsive?: boolean;
  /** 縞模様(stripe)を表示するフラグ */
  enableStripe?: boolean;
}

/**
 * テーブル状態管理
 */
export interface BaseTableState<T extends BaseTableData = BaseTableData> {
  /** テーブルデータ */
  data: T[];
  /** ローディング状態 */
  loading?: boolean;
  /** エラーメッセージ */
  error?: string | null;
  /** ソート設定 */
  sortConfig?: SortConfig | null;
  /** 選択されているアイテムID */
  selectedIds?: string[];
}

/**
 * 検証状態
 */
export interface ValidationState {
  /** 検証ステータス */
  status: "idle" | "pending" | "executing" | "completed" | "failed";
  /** 検証結果（completedの場合のみ） */
  result?: "success" | "error";
}

/**
 * BaseTable共通Props
 */
export interface BaseTableCommonProps<
  _T extends BaseTableData = BaseTableData,
> {
  /** テーブル列定義（必須） */
  columns: TableColumnConfig[];
  /** カスタムクラス名 */
  className?: string;

  // 以下の設定は全てContextから取得可能（propsで指定すればオーバーライド）
  /** ローディング状態 */
  loading?: boolean;
  /** エラーメッセージ */
  error?: string | null;
  /** 空データ時のメッセージ */
  emptyMessage?: string;
  /** ヘッダー固定を有効化 */
  stickyHeader?: boolean;
  /** 縞模様(stripe)を有効化 */
  enableStripe?: boolean;
  /** ソート機能を有効化 */
  enableSort?: boolean;
  /** 選択機能を有効化 */
  enableSelect?: boolean;
  /** コンパクトモード */
  compact?: boolean;
  /** カスタム列幅 */
  customColumnWidths?: Record<string, string>;
  /** 行ごとの検証状態マップ（オプショナル） */
  validationStates?: Record<string, ValidationState>;
}

/**
 * BaseTableコンポーネントのProps
 */
export interface BaseTableProps<T extends BaseTableData = BaseTableData>
  extends BaseTableCommonProps<T> {
  /** 仮想化機能を有効化（オプショナル、デフォルト: false） */
  enableVirtualization?: boolean;
  /** テーブル行データ（仮想化無効時は必須） */
  data?: T[];
  /** 仮想化設定 */
  virtualizationConfig?: {
    /** 行の高さ（固定値） */
    itemHeight?: number;
    /** オーバースキャン数 */
    overscan?: number;
    /** 行高さ推定関数 */
    estimateSize?: (index: number) => number;
  };
  /** 無限スクロール機能を有効化 */
  enableInfiniteScroll?: boolean;
  /** 無限スクロール設定 */
  infiniteScrollConfig?: {
    /** TanStack Query統合 */
    queryKey?: string[] | (string | number)[];
    /** 初期ページパラメータ */
    initialPageParam?: unknown;
    /** 次ページパラメータ取得関数 */
    getNextPageParam?: (
      lastPage: unknown,
      allPages: unknown[],
      lastPageParam: unknown,
      allPageParams: unknown[],
    ) => unknown;
    /** ロード開始トリガーポイント */
    loadMoreTriggerPoint?: number;
    /** データ取得関数（無限スクロール用） */
    infiniteQueryFn?: (params: {
      pageParam: unknown;
      signal?: AbortSignal;
    }) => Promise<unknown>;
  };
}

/**
 * BaseTableHeaderコンポーネントのProps
 */
export interface BaseTableHeaderProps {
  /** テーブル列定義 */
  columns: TableColumnConfig[];
  /** 選択機能を有効化 */
  enableSelect?: boolean;
  /** ソート機能を有効化 */
  enableSort?: boolean;
  /** 現在のソートカラム */
  sortColumn?: string;
  /** ソート方向 */
  sortDirection?: SortDirection;
  /** ソート変更ハンドラー */
  onSort?: (column: string, direction: SortDirection) => void;
  /** すべての行選択状態 */
  allRowsSelected?: boolean;
  /** 一部の行のみ選択状態 */
  someRowsSelected?: boolean;
  /** すべての行の選択切替ハンドラー */
  onSelectAll?: (selected: boolean) => void;
  /** カスタムクラス名 */
  className?: string;
  /** カスタム列幅 */
  customColumnWidths?: Record<string, string>;
}

/**
 * BaseTableBodyコンポーネントのProps
 */
export interface BaseTableBodyProps<T extends BaseTableData = BaseTableData> {
  /** テーブル列定義 */
  columns: TableColumnConfig[];
  /** テーブル行データ */
  data: T[];
  /** ローディング状態 */
  loading?: boolean;
  /** エラーメッセージ */
  error?: string | null;
  /** 空データ時のメッセージ */
  emptyMessage?: string;
  /** 選択機能を有効化 */
  enableSelect?: boolean;
  /** 縞模様(stripe)を有効化 */
  enableStripe?: boolean;
  /** カスタムクラス名 */
  className?: string;
  /** カスタム列幅 */
  customColumnWidths?: Record<string, string>;
  /** 行ごとの検証状態マップ（オプショナル） */
  validationStates?: Record<string, ValidationState>;
}

/**
 * BaseTableRowコンポーネントのProps
 */
export interface BaseTableRowProps<T extends BaseTableData = BaseTableData> {
  /** 行データ */
  item: T;
  /** テーブル列定義 */
  columns: TableColumnConfig[];
  /** 行インデックス */
  index: number;
  /** 選択機能を有効化 */
  enableSelect?: boolean;
  /** 選択状態 */
  selected?: boolean;
  /** 縞模様(stripe)を有効化 */
  enableStripe?: boolean;
  /** カスタムクラス名 */
  className?: string;
  /** カスタム列幅 */
  customColumnWidths?: Record<string, string>;
  /** 検証状態（オプショナル） */
  validationState?: ValidationState;
}

/**
 * BaseTableCellコンポーネントのProps
 */
export interface BaseTableCellProps {
  /** セル内のコンテンツ */
  children: React.ReactNode;
  /** カスタムクラス名 */
  className?: string;
  /** 列の幅 */
  width?: string;
  /** テキスト位置 */
  align?: "left" | "center" | "right";
  /** 伸縮可能な列かどうか（flex-1を適用） */
  flexible?: boolean;
}

/**
 * BaseTableStates（ローディング・エラー・空状態）コンポーネントのProps
 */
export interface BaseTableStatesProps {
  /** ローディング状態 */
  loading?: boolean;
  /** エラーメッセージ */
  error?: string | null;
  /** 空データ状態 */
  isEmpty?: boolean;
  /** 空データ時のメッセージ */
  emptyMessage?: string;
  /** ヘッダーコンポーネント */
  headerComponent?: React.ReactNode;
  /** カスタムクラス名 */
  className?: string;
}
