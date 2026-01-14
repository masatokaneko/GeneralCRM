/**
 * 認証関連の型定義
 * 汎用的な認証状態管理のための型を提供
 */

/**
 * ユーザー情報型
 * アプリケーション固有のフィールドは拡張して使用
 */
export interface User {
  /** ユーザーID */
  id: string;
  /** メールアドレス */
  email: string;
  /** 表示名 */
  name?: string;
  /** 作成日時 */
  createdAt?: string;
  /** 更新日時 */
  updatedAt?: string;
  /** テナントID（マルチテナント対応） */
  tenantId?: string;
  /** ユーザーロール */
  roles?: string[];
}

/**
 * セッション型
 * 認証状態とユーザー情報を管理
 */
export interface Session {
  /** ユーザー情報 */
  user: User | null;
  /** 認証済みフラグ */
  authenticated: boolean;
}

/**
 * 認証エラーの詳細情報
 */
export interface AuthErrorDetail {
  /** 認証エラーの理由 */
  reason:
  | "expired_token"
  | "invalid_token"
  | "missing_token"
  | "insufficient_scope"
  | "unknown";
  /** トークンの有効期限（期限切れの場合） */
  expiredAt?: string;
}

/**
 * 認証エラー型
 */
export interface AuthError {
  /** エラーコード */
  code: string;
  /** エラーメッセージ */
  message: string;
  /** エラー詳細情報 */
  details?: AuthErrorDetail;
}

/**
 * ログインレスポンス型
 */
export interface LoginResponse {
  /** 認証済みフラグ */
  authenticated: boolean;
  /** ユーザー情報 */
  user?: User;
  /** リダイレクトURL */
  redirectUrl?: string;
}

/**
 * ログアウトレスポンス型
 */
export interface LogoutResponse {
  /** ハイパーメディアリンク */
  _links?: {
    login?: {
      href: string;
    };
  };
  /** レスポンスデータ（ログアウト時はnull） */
  data: null;
  /** メタ情報 */
  meta?: {
    /** 操作結果メッセージ */
    message?: string;
    /** 実行された操作 */
    operation?: "delete";
    /** レスポンス生成時刻 */
    timestamp?: string;
  };
}

/**
 * 認証コンテキストの型
 */
export interface AuthContextType {
  /** ユーザー情報 */
  user: User | null;
  /** セッション情報 */
  session: Session;
  /** ローディング状態 */
  isLoading: boolean;
  /** エラー情報 */
  error: AuthError | null;
  /** ログイン処理 */
  login: (redirectUrl?: string) => Promise<void>;
  /** ログアウト処理 */
  logout: () => Promise<void>;
  /** セッション確認 */
  checkSession: () => Promise<void>;
}

/**
 * 認証API抽象インターフェース
 * アプリケーション固有の認証APIを注入可能にする
 */
export interface AuthApiAdapter {
  /** ユーザー情報取得 */
  getUser: () => Promise<User | null>;
  /** ログイン処理 */
  login: (redirectUrl?: string) => Promise<LoginResponse>;
  /** ログアウト処理 */
  logout: () => Promise<LogoutResponse>;
}
