"use client";

import * as React from "react";
import type { AuthContextValue, User, ObjectPermission, KeycloakConfig } from "./types";

const defaultAuthContext: AuthContextValue = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  token: null,
  error: null,
  login: async () => {},
  logout: async () => {},
  refreshToken: async () => null,
  hasPermission: () => false,
};

export const AuthContext = React.createContext<AuthContextValue>(defaultAuthContext);

interface AuthProviderProps {
  children: React.ReactNode;
  config?: KeycloakConfig;
  /** Enable mock mode for development without Keycloak */
  mockMode?: boolean;
}

// Mock user for development
const mockUser: User = {
  id: "00000000-0000-0000-0003-000000000003",
  username: "user1",
  email: "user1@example.com",
  displayName: "Taro Yamada",
  tenantId: "00000000-0000-0000-0000-000000000001",
  role: {
    id: "00000000-0000-0000-0002-000000000004",
    name: "Sales Representative",
  },
  profile: {
    id: "00000000-0000-0000-0001-000000000003",
    name: "Sales User",
  },
  permissions: {
    Account: {
      create: true,
      read: true,
      update: true,
      delete: true,
      viewAll: false,
      modifyAll: false,
    },
    Contact: {
      create: true,
      read: true,
      update: true,
      delete: true,
      viewAll: false,
      modifyAll: false,
    },
    Lead: {
      create: true,
      read: true,
      update: true,
      delete: true,
      viewAll: false,
      modifyAll: false,
    },
    Opportunity: {
      create: true,
      read: true,
      update: true,
      delete: true,
      viewAll: false,
      modifyAll: false,
    },
    Quote: {
      create: true,
      read: true,
      update: true,
      delete: true,
      viewAll: false,
      modifyAll: false,
    },
  },
};

export function AuthProvider({
  children,
  config,
  mockMode = process.env.NODE_ENV === "development",
}: AuthProviderProps) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [user, setUser] = React.useState<User | null>(null);
  const [token, setToken] = React.useState<string | null>(null);
  const [error, setError] = React.useState<Error | null>(null);

  // Initialize authentication
  React.useEffect(() => {
    const initAuth = async () => {
      try {
        if (mockMode) {
          // Mock mode: simulate authenticated user
          await new Promise((resolve) => setTimeout(resolve, 500));
          setUser(mockUser);
          setToken("mock-token");
          setIsAuthenticated(true);
        } else {
          // Production mode: initialize Keycloak
          // This requires keycloak-js to be installed
          // const keycloak = new Keycloak(config);
          // const authenticated = await keycloak.init({ onLoad: 'check-sso' });
          // if (authenticated) {
          //   const userInfo = await fetchUserInfo(keycloak.token);
          //   setUser(userInfo);
          //   setToken(keycloak.token);
          //   setIsAuthenticated(true);
          // }
          console.warn("Keycloak integration not yet implemented. Using mock mode.");
          setUser(mockUser);
          setToken("mock-token");
          setIsAuthenticated(true);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Authentication failed"));
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [config, mockMode]);

  const login = React.useCallback(async () => {
    if (mockMode) {
      setUser(mockUser);
      setToken("mock-token");
      setIsAuthenticated(true);
      return;
    }
    // Production: keycloak.login()
    window.location.href = `${config?.url}/realms/${config?.realm}/protocol/openid-connect/auth?client_id=${config?.clientId}&redirect_uri=${encodeURIComponent(window.location.origin)}&response_type=code&scope=openid`;
  }, [config, mockMode]);

  const logout = React.useCallback(async () => {
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);

    if (!mockMode && config) {
      // Production: keycloak.logout()
      window.location.href = `${config.url}/realms/${config.realm}/protocol/openid-connect/logout?redirect_uri=${encodeURIComponent(window.location.origin)}`;
    }
  }, [config, mockMode]);

  const refreshToken = React.useCallback(async (): Promise<string | null> => {
    if (mockMode) {
      return "mock-token-refreshed";
    }
    // Production: keycloak.updateToken()
    return token;
  }, [mockMode, token]);

  const hasPermission = React.useCallback(
    (objectName: string, action: keyof ObjectPermission): boolean => {
      if (!user) return false;
      const permissions = user.permissions[objectName];
      if (!permissions) return false;
      return permissions[action] ?? false;
    },
    [user]
  );

  const contextValue = React.useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      isLoading,
      user,
      token,
      error,
      login,
      logout,
      refreshToken,
      hasPermission,
    }),
    [isAuthenticated, isLoading, user, token, error, login, logout, refreshToken, hasPermission]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}
