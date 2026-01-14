"use client";

import { useRouter } from "next/navigation";
import type React from "react";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  User,
  Session,
  AuthError,
  AuthContextType,
  AuthApiAdapter,
} from "@/types/auth";

/**
 * 認証コンテキスト
 */
export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

/**
 * 認証プロバイダーのプロパティ
 */
export interface AuthProviderProps {
  children: React.ReactNode;
  /** 認証API実装（注入） */
  authApi?: AuthApiAdapter;
  /** ログインページURL */
  loginUrl?: string;
  /** エラーページURL */
  errorUrl?: string;
  /** 初期ユーザー情報（SSRから渡す場合） */
  initialUser?: User | null;
}

/**
 * デフォルトの認証APIアダプター（スタブ）
 * 実際のアプリケーションではカスタム実装を注入
 */
const defaultAuthApi: AuthApiAdapter = {
  getUser: async () => null,
  login: async () => ({ authenticated: false }),
  logout: async () => ({ data: null }),
};

/**
 * 汎用認証プロバイダー
 *
 * @example
 * ```tsx
 * // カスタムAPI実装を注入
 * const myAuthApi: AuthApiAdapter = {
 *   getUser: async () => { ... },
 *   login: async (redirectUrl) => { ... },
 *   logout: async () => { ... },
 * };
 *
 * <AuthProvider authApi={myAuthApi}>
 *   {children}
 * </AuthProvider>
 * ```
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  authApi = defaultAuthApi,
  loginUrl = "/login",
  errorUrl = "/error",
  initialUser = null,
}) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(initialUser);
  const [isLoading, setIsLoading] = useState(!initialUser);
  const [error, setError] = useState<AuthError | null>(null);

  const checkSession = useCallback(async () => {
    try {
      setIsLoading(true);
      const userData = await authApi.getUser();
      setUser(userData);
      setError(null);
    } catch (err) {
      console.error("セッション確認エラー:", err);
      setUser(null);
      setError({
        code: "SESSION_CHECK_FAILED",
        message: "セッション確認に失敗しました",
      });
    } finally {
      setIsLoading(false);
    }
  }, [authApi]);

  const login = useCallback(
    async (redirectUrl?: string) => {
      try {
        setIsLoading(true);
        const response = await authApi.login(redirectUrl);

        if (response.redirectUrl) {
          router.push(response.redirectUrl);
        } else if (response.user) {
          setUser(response.user);
        }
      } catch (err) {
        console.error("ログインエラー:", err);
        setError({
          code: "LOGIN_FAILED",
          message: "ログインに失敗しました",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [authApi, router],
  );

  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      await authApi.logout();
      setUser(null);
      setError(null);
      router.push(loginUrl);
    } catch (err) {
      console.error("ログアウトエラー:", err);
      setUser(null);
      setError({
        code: "LOGOUT_FAILED",
        message: "ログアウト処理に失敗しました",
      });
      router.push(`${errorUrl}?reason=logout_failed`);
    } finally {
      setIsLoading(false);
    }
  }, [authApi, router, loginUrl, errorUrl]);

  // 初期ロード時にセッション確認
  useEffect(() => {
    if (!initialUser) {
      checkSession();
    }
  }, [initialUser, checkSession]);

  const session: Session = useMemo(
    () => ({
      user,
      authenticated: user !== null,
    }),
    [user],
  );

  const value = useMemo(
    () => ({
      user,
      session,
      isLoading,
      error,
      login,
      logout,
      checkSession,
    }),
    [user, session, isLoading, error, login, logout, checkSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
