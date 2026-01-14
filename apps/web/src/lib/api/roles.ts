import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, type PaginatedResponse } from "./client";

const ROLES_KEY = "roles";

export interface Role {
  id: string;
  tenantId: string;
  name: string;
  parentRoleId?: string | null;
  parentRoleName?: string | null;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface RoleNode extends Role {
  children?: RoleNode[];
  level?: number;
}

export interface RolesListParams {
  activeOnly?: boolean;
}

export function useRoles(params?: RolesListParams) {
  return useQuery({
    queryKey: [ROLES_KEY, params],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Role>>("/roles", {
        ...(params?.activeOnly && { activeOnly: "true" }),
      }),
  });
}

export function useRoleHierarchy() {
  return useQuery({
    queryKey: [ROLES_KEY, "hierarchy"],
    queryFn: () => apiClient.get<RoleNode[]>("/roles/hierarchy"),
  });
}

export function useRole(id: string | undefined) {
  return useQuery({
    queryKey: [ROLES_KEY, id],
    queryFn: () => apiClient.get<Role>(`/roles/${id}`),
    enabled: !!id,
  });
}

export function useRoleChildren(id: string | undefined) {
  return useQuery({
    queryKey: [ROLES_KEY, id, "children"],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Role>>(`/roles/${id}/children`),
    enabled: !!id,
  });
}

export function useRoleDescendants(id: string | undefined) {
  return useQuery({
    queryKey: [ROLES_KEY, id, "descendants"],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Role>>(`/roles/${id}/descendants`),
    enabled: !!id,
  });
}

export function useRoleUsers(id: string | undefined) {
  return useQuery({
    queryKey: [ROLES_KEY, id, "users"],
    queryFn: () =>
      apiClient.get<
        PaginatedResponse<{ id: string; displayName: string; email: string }>
      >(`/roles/${id}/users`),
    enabled: !!id,
  });
}

export interface CreateRoleInput {
  name: string;
  parentRoleId?: string | null;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRoleInput) =>
      apiClient.post<{ id: string }>("/roles", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ROLES_KEY] });
    },
  });
}

export interface UpdateRoleInput {
  name?: string;
  parentRoleId?: string | null;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
      etag,
    }: {
      id: string;
      data: UpdateRoleInput;
      etag?: string;
    }) => apiClient.patch<Role>(`/roles/${id}`, data, etag),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [ROLES_KEY] });
      queryClient.invalidateQueries({ queryKey: [ROLES_KEY, variables.id] });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/roles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ROLES_KEY] });
    },
  });
}
