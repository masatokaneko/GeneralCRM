"use client";

import * as React from "react";
import { AuthContext } from "./AuthContext";
import type { AuthContextValue } from "./types";

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

/** Hook to check if user has specific permission */
export function usePermission(objectName: string, action: "create" | "read" | "update" | "delete") {
  const { hasPermission, isAuthenticated, isLoading } = useAuth();

  return {
    hasPermission: hasPermission(objectName, action),
    isAuthenticated,
    isLoading,
  };
}

/** Hook to require authentication - redirects to login if not authenticated */
export function useRequireAuth() {
  const { isAuthenticated, isLoading, login } = useAuth();

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      login();
    }
  }, [isAuthenticated, isLoading, login]);

  return { isAuthenticated, isLoading };
}
