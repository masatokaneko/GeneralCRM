"use client";

import { useContext } from "react";
import { AuthContext } from "@/contexts/AuthContext";
import type { AuthContextType } from "@/types/auth";

/**
 * 認証フック
 *
 * AuthContextにアクセスするためのカスタムフック
 *
 * @example
 * ```tsx
 * const { user, isLoading, login, logout } = useAuth();
 *
 * if (isLoading) return <Loading />;
 * if (!user) return <LoginPrompt onLogin={login} />;
 *
 * return <Dashboard user={user} onLogout={logout} />;
 * ```
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

/**
 * 認証フック（オプショナル版）
 * プロバイダーの外で使用された場合でもエラーにならない
 */
export function useAuthOptional(): AuthContextType | null {
  const context = useContext(AuthContext);
  return context ?? null;
}

/**
 * 認証済みかどうかを確認するフック
 */
export function useIsAuthenticated(): boolean {
  const context = useContext(AuthContext);
  return context?.session.authenticated ?? false;
}
