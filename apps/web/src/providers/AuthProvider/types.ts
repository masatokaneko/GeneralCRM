export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  tenantId: string;
  role: {
    id: string;
    name: string;
  };
  profile: {
    id: string;
    name: string;
  };
  permissions: Record<string, ObjectPermission>;
}

export interface ObjectPermission {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  viewAll: boolean;
  modifyAll: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;
  error: Error | null;
}

export interface AuthContextValue extends AuthState {
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
  hasPermission: (objectName: string, action: keyof ObjectPermission) => boolean;
}

export interface KeycloakConfig {
  url: string;
  realm: string;
  clientId: string;
}
