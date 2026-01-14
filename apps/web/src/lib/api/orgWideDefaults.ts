import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, type PaginatedResponse } from "./client";

const OWD_KEY = "orgWideDefaults";

export type OWDAccessLevel =
  | "Private"
  | "PublicReadOnly"
  | "PublicReadWrite"
  | "ControlledByParent";

export interface OrgWideDefault {
  id: string;
  tenantId: string;
  objectName: string;
  internalAccess: OWDAccessLevel;
  externalAccess?: OWDAccessLevel;
  grantAccessUsingHierarchies: boolean;
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
  updatedBy?: string;
}

export function useOrgWideDefaults() {
  return useQuery({
    queryKey: [OWD_KEY],
    queryFn: () =>
      apiClient.get<PaginatedResponse<OrgWideDefault>>("/org-wide-defaults"),
  });
}

export function useOrgWideDefault(objectName: string | undefined) {
  return useQuery({
    queryKey: [OWD_KEY, objectName],
    queryFn: () =>
      apiClient.get<OrgWideDefault>(`/org-wide-defaults/${objectName}`),
    enabled: !!objectName,
  });
}

export interface UpdateOWDInput {
  internalAccess?: OWDAccessLevel;
  externalAccess?: OWDAccessLevel;
  grantAccessUsingHierarchies?: boolean;
}

export function useUpdateOrgWideDefault() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      objectName,
      data,
    }: {
      objectName: string;
      data: UpdateOWDInput;
    }) =>
      apiClient.patch<OrgWideDefault>(
        `/org-wide-defaults/${objectName}`,
        data
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [OWD_KEY] });
      queryClient.invalidateQueries({
        queryKey: [OWD_KEY, variables.objectName],
      });
    },
  });
}

export function useBulkUpdateOrgWideDefaults() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      updates: Array<{ objectName: string } & UpdateOWDInput>
    ) => apiClient.put<OrgWideDefault[]>("/org-wide-defaults/bulk", { updates }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [OWD_KEY] });
    },
  });
}

export function useInitializeOrgWideDefaults() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiClient.post<{ message: string }>("/org-wide-defaults/initialize", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [OWD_KEY] });
    },
  });
}
