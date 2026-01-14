/**
 * コンテキストのエクスポート集約
 */

// 認証
export { AuthContext, AuthProvider } from "./AuthContext";
export type { AuthProviderProps } from "./AuthContext";

// テーブル - 個別コンテキスト
export {
  TableActionProvider,
  useTableActions,
  useTableActionsOptional,
} from "./TableActionContext";
export type {
  TableActionContextType,
  TableActionProviderProps,
} from "./TableActionContext";

export {
  TableConfigProvider,
  useTableConfig,
  useTableConfigOptional,
} from "./TableConfigContext";
export type {
  TableConfigContextType,
  TableConfigProviderProps,
} from "./TableConfigContext";

export {
  TableDataProvider,
  useTableData,
  useTableDataOptional,
} from "./TableDataContext";
export type {
  TableDataContextType,
  TableDataProviderProps,
} from "./TableDataContext";

// テーブル - 統合プロバイダー
export { TableProvider, useTable } from "./TableProvider";
export type { TableProviderProps } from "./TableProvider";
