import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, type PaginatedResponse } from "./client";

const PERMISSION_SETS_KEY = "permissionSets";

export interface PermissionSet {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  isActive: boolean;
  userCount?: number;
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface UserPermissionSet {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  permissionSetId: string;
  permissionSetName?: string;
  createdAt: string;
  createdBy?: string;
}

export interface PermissionSetObjectPermission {
  id?: string;
  permissionSetId: string;
  objectName: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  viewAll: boolean;
  modifyAll: boolean;
}

export interface PermissionSetFieldPermission {
  id?: string;
  permissionSetId: string;
  objectName: string;
  fieldName: string;
  isReadable: boolean;
  isEditable: boolean;
}

export interface PermissionSetsListParams {
  activeOnly?: boolean;
}

export function usePermissionSets(params?: PermissionSetsListParams) {
  return useQuery({
    queryKey: [PERMISSION_SETS_KEY, params],
    queryFn: () =>
      apiClient.get<PaginatedResponse<PermissionSet>>("/permission-sets", {
        ...(params?.activeOnly && { activeOnly: "true" }),
      }),
  });
}

export function usePermissionSet(id: string | undefined) {
  return useQuery({
    queryKey: [PERMISSION_SETS_KEY, id],
    queryFn: () => apiClient.get<PermissionSet>(`/permission-sets/${id}`),
    enabled: !!id,
  });
}

export function usePermissionSetUsers(permissionSetId: string | undefined) {
  return useQuery({
    queryKey: [PERMISSION_SETS_KEY, permissionSetId, "users"],
    queryFn: () =>
      apiClient.get<PaginatedResponse<UserPermissionSet>>(
        `/permission-sets/${permissionSetId}/users`
      ),
    enabled: !!permissionSetId,
  });
}

export function usePermissionSetObjectPermissions(
  permissionSetId: string | undefined
) {
  return useQuery({
    queryKey: [PERMISSION_SETS_KEY, permissionSetId, "objectPermissions"],
    queryFn: () =>
      apiClient.get<PaginatedResponse<PermissionSetObjectPermission>>(
        `/permission-sets/${permissionSetId}/object-permissions`
      ),
    enabled: !!permissionSetId,
  });
}

export function usePermissionSetFieldPermissions(
  permissionSetId: string | undefined,
  objectName?: string
) {
  return useQuery({
    queryKey: [
      PERMISSION_SETS_KEY,
      permissionSetId,
      "fieldPermissions",
      objectName,
    ],
    queryFn: () =>
      apiClient.get<PaginatedResponse<PermissionSetFieldPermission>>(
        `/permission-sets/${permissionSetId}/field-permissions`,
        {
          ...(objectName && { objectName }),
        }
      ),
    enabled: !!permissionSetId,
  });
}

export interface CreatePermissionSetInput {
  name: string;
  description?: string;
  isActive?: boolean;
}

export function useCreatePermissionSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePermissionSetInput) =>
      apiClient.post<{ id: string }>("/permission-sets", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PERMISSION_SETS_KEY] });
    },
  });
}

export interface UpdatePermissionSetInput {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export function useUpdatePermissionSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
      etag,
    }: {
      id: string;
      data: UpdatePermissionSetInput;
      etag?: string;
    }) =>
      apiClient.patch<PermissionSet>(`/permission-sets/${id}`, data, etag),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [PERMISSION_SETS_KEY] });
      queryClient.invalidateQueries({
        queryKey: [PERMISSION_SETS_KEY, variables.id],
      });
    },
  });
}

export function useDeletePermissionSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/permission-sets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PERMISSION_SETS_KEY] });
    },
  });
}

export function useAssignPermissionSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      permissionSetId,
      userId,
    }: {
      permissionSetId: string;
      userId: string;
    }) =>
      apiClient.post<UserPermissionSet>(
        `/permission-sets/${permissionSetId}/users`,
        { userId }
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [PERMISSION_SETS_KEY, variables.permissionSetId, "users"],
      });
      queryClient.invalidateQueries({ queryKey: [PERMISSION_SETS_KEY] });
    },
  });
}

export function useUnassignPermissionSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      permissionSetId,
      userId,
    }: {
      permissionSetId: string;
      userId: string;
    }) =>
      apiClient.delete(`/permission-sets/${permissionSetId}/users/${userId}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [PERMISSION_SETS_KEY, variables.permissionSetId, "users"],
      });
      queryClient.invalidateQueries({ queryKey: [PERMISSION_SETS_KEY] });
    },
  });
}

export interface SetObjectPermissionInput {
  objectName: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  viewAll?: boolean;
  modifyAll?: boolean;
}

export function useSetPermissionSetObjectPermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      permissionSetId,
      data,
    }: {
      permissionSetId: string;
      data: SetObjectPermissionInput;
    }) =>
      apiClient.put<PermissionSetObjectPermission>(
        `/permission-sets/${permissionSetId}/object-permissions/${data.objectName}`,
        data
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          PERMISSION_SETS_KEY,
          variables.permissionSetId,
          "objectPermissions",
        ],
      });
    },
  });
}

export function useBulkSetPermissionSetObjectPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      permissionSetId,
      permissions,
    }: {
      permissionSetId: string;
      permissions: SetObjectPermissionInput[];
    }) =>
      apiClient.put<PermissionSetObjectPermission[]>(
        `/permission-sets/${permissionSetId}/object-permissions`,
        { permissions }
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          PERMISSION_SETS_KEY,
          variables.permissionSetId,
          "objectPermissions",
        ],
      });
    },
  });
}

export interface SetFieldPermissionInput {
  objectName: string;
  fieldName: string;
  isReadable: boolean;
  isEditable: boolean;
}

export function useSetPermissionSetFieldPermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      permissionSetId,
      data,
    }: {
      permissionSetId: string;
      data: SetFieldPermissionInput;
    }) =>
      apiClient.put<PermissionSetFieldPermission>(
        `/permission-sets/${permissionSetId}/field-permissions/${data.objectName}/${data.fieldName}`,
        data
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          PERMISSION_SETS_KEY,
          variables.permissionSetId,
          "fieldPermissions",
        ],
      });
    },
  });
}

export function useBulkSetPermissionSetFieldPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      permissionSetId,
      permissions,
    }: {
      permissionSetId: string;
      permissions: SetFieldPermissionInput[];
    }) =>
      apiClient.put<PermissionSetFieldPermission[]>(
        `/permission-sets/${permissionSetId}/field-permissions`,
        { permissions }
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          PERMISSION_SETS_KEY,
          variables.permissionSetId,
          "fieldPermissions",
        ],
      });
    },
  });
}
