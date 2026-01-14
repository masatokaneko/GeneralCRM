/**
 * テーブル列設定の型定義
 * 汎用テーブルコンポーネント用の基本型を提供
 */
import type React from "react";

/**
 * テーブルセル内で表示可能な値の型
 * string, number, boolean, date, ReactNode などを許容
 */
export type CellValue =
  | string
  | number
  | boolean
  | Date
  | React.ReactNode
  | null
  | undefined;

/**
 * テーブル列の設定
 */
export interface TableColumnConfig {
  /** 列のキー（プロパティ名） */
  key: string;
  /** 表示ラベル（文字列またはReactNode - ツールチップなどの表示に対応） */
  label: React.ReactNode;
  /** 幅クラス（Tailwind CSS） - width, min-width, max-widthなどを含む */
  width: string;
  /** その他の共通スタイル（高さ、余白、色など） */
  className?: string;
  /** ソート可能かどうか */
  sortable?: boolean;
  /** テキスト位置 */
  align?: "left" | "center" | "right";
  /** カスタムレンダリング関数 - SVGアイコンや特殊なフォーマットの表示に対応 */
  renderFn?: (
    value: CellValue,
    rowData: Record<string, unknown>,
  ) => React.ReactNode;
  /** 伸縮可能な列かどうか（flex-1を適用） - 通常は1列目の識別名に使用 */
  flexible?: boolean;
}

/**
 * カスタム列幅の設定
 */
export interface TableColumnWidths {
  [key: string]: string;
}

/**
 * 従来のテーブル列定義（互換性維持用）
 */
export interface TableColumn<T> {
  key: keyof T;
  label: string;
  width?: number | string;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
}

/**
 * 共通セルスタイル
 * CSSクラス名を一元管理
 */
export const COMMON_CELL_STYLES = {
  header: "table-header",
  headerButton: "table-header-button",
  cell: "table-cell",
  cellMuted: "table-cell-muted",
  row: "table-row",
  rowSelected: "table-row-selected",
  content: "table-content",
} as const;

/**
 * テーブルデータの基本型
 */
export interface TableData {
  id: string | number;
  [key: string]: unknown;
}

/**
 * ソート設定
 */
export interface SortConfig<T> {
  column: keyof T;
  direction: "asc" | "desc";
}
