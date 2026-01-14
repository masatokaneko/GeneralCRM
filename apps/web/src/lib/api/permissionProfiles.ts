import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, type PaginatedResponse } from "./client";

const PROFILES_KEY = "permissionProfiles";

export interface PermissionProfile {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface ProfileObjectPermission {
  id?: string;
  profileId: string;
  objectName: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  viewAll: boolean;
  modifyAll: boolean;
}

export interface ProfileFieldPermission {
  id?: string;
  profileId: string;
  objectName: string;
  fieldName: string;
  isReadable: boolean;
  isEditable: boolean;
}

export interface ProfilesListParams {
  activeOnly?: boolean;
}

export function usePermissionProfiles(params?: ProfilesListParams) {
  return useQuery({
    queryKey: [PROFILES_KEY, params],
    queryFn: () =>
      apiClient.get<PaginatedResponse<PermissionProfile>>(
        "/permission-profiles",
        {
          ...(params?.activeOnly && { activeOnly: "true" }),
        }
      ),
  });
}

export function usePermissionProfile(id: string | undefined) {
  return useQuery({
    queryKey: [PROFILES_KEY, id],
    queryFn: () => apiClient.get<PermissionProfile>(`/permission-profiles/${id}`),
    enabled: !!id,
  });
}

export function useProfileObjectPermissions(profileId: string | undefined) {
  return useQuery({
    queryKey: [PROFILES_KEY, profileId, "objectPermissions"],
    queryFn: () =>
      apiClient.get<PaginatedResponse<ProfileObjectPermission>>(
        `/permission-profiles/${profileId}/object-permissions`
      ),
    enabled: !!profileId,
  });
}

export function useProfileFieldPermissions(
  profileId: string | undefined,
  objectName?: string
) {
  return useQuery({
    queryKey: [PROFILES_KEY, profileId, "fieldPermissions", objectName],
    queryFn: () =>
      apiClient.get<PaginatedResponse<ProfileFieldPermission>>(
        `/permission-profiles/${profileId}/field-permissions`,
        {
          ...(objectName && { objectName }),
        }
      ),
    enabled: !!profileId,
  });
}

export interface CreateProfileInput {
  name: string;
  description?: string;
  isActive?: boolean;
}

export function useCreatePermissionProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProfileInput) =>
      apiClient.post<{ id: string }>("/permission-profiles", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROFILES_KEY] });
    },
  });
}

export interface UpdateProfileInput {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export function useUpdatePermissionProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
      etag,
    }: {
      id: string;
      data: UpdateProfileInput;
      etag?: string;
    }) =>
      apiClient.patch<PermissionProfile>(
        `/permission-profiles/${id}`,
        data,
        etag
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [PROFILES_KEY] });
      queryClient.invalidateQueries({ queryKey: [PROFILES_KEY, variables.id] });
    },
  });
}

export function useDeletePermissionProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/permission-profiles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROFILES_KEY] });
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

export function useSetProfileObjectPermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      profileId,
      data,
    }: {
      profileId: string;
      data: SetObjectPermissionInput;
    }) =>
      apiClient.put<ProfileObjectPermission>(
        `/permission-profiles/${profileId}/object-permissions/${data.objectName}`,
        data
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [PROFILES_KEY, variables.profileId, "objectPermissions"],
      });
    },
  });
}

export function useBulkSetProfileObjectPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      profileId,
      permissions,
    }: {
      profileId: string;
      permissions: SetObjectPermissionInput[];
    }) =>
      apiClient.put<ProfileObjectPermission[]>(
        `/permission-profiles/${profileId}/object-permissions`,
        { permissions }
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [PROFILES_KEY, variables.profileId, "objectPermissions"],
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

export function useSetProfileFieldPermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      profileId,
      data,
    }: {
      profileId: string;
      data: SetFieldPermissionInput;
    }) =>
      apiClient.put<ProfileFieldPermission>(
        `/permission-profiles/${profileId}/field-permissions/${data.objectName}/${data.fieldName}`,
        data
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [PROFILES_KEY, variables.profileId, "fieldPermissions"],
      });
    },
  });
}

export function useBulkSetProfileFieldPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      profileId,
      permissions,
    }: {
      profileId: string;
      permissions: SetFieldPermissionInput[];
    }) =>
      apiClient.put<ProfileFieldPermission[]>(
        `/permission-profiles/${profileId}/field-permissions`,
        { permissions }
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [PROFILES_KEY, variables.profileId, "fieldPermissions"],
      });
    },
  });
}

export function useClonePermissionProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sourceId,
      newName,
    }: {
      sourceId: string;
      newName: string;
    }) =>
      apiClient.post<{ id: string }>(`/permission-profiles/${sourceId}/clone`, {
        name: newName,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROFILES_KEY] });
    },
  });
}
