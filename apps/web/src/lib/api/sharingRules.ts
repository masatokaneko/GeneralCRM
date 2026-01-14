import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, type PaginatedResponse } from "./client";

const SHARING_RULES_KEY = "sharingRules";
const PUBLIC_GROUPS_KEY = "publicGroups";

export type SharingRuleType = "OwnerBased" | "CriteriaBased";
export type SharingSourceType = "Role" | "RoleAndSubordinates" | "PublicGroup";
export type SharingTargetType =
  | "Role"
  | "RoleAndSubordinates"
  | "PublicGroup"
  | "User";
export type SharingAccessLevel = "Read" | "ReadWrite";

export interface SharingRule {
  id: string;
  tenantId: string;
  name: string;
  objectName: string;
  ruleType: SharingRuleType;
  description?: string;
  isActive: boolean;
  sourceType?: SharingSourceType;
  sourceId?: string;
  sourceName?: string;
  targetType: SharingTargetType;
  targetId: string;
  targetName?: string;
  accessLevel: SharingAccessLevel;
  filterCriteria?: Record<string, unknown>;
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface SharingRulesListParams {
  objectName?: string;
  activeOnly?: boolean;
}

export function useSharingRules(params?: SharingRulesListParams) {
  return useQuery({
    queryKey: [SHARING_RULES_KEY, params],
    queryFn: () =>
      apiClient.get<PaginatedResponse<SharingRule>>("/sharing-rules", {
        ...(params?.objectName && { objectName: params.objectName }),
        ...(params?.activeOnly && { activeOnly: "true" }),
      }),
  });
}

export function useSharingRule(id: string | undefined) {
  return useQuery({
    queryKey: [SHARING_RULES_KEY, id],
    queryFn: () => apiClient.get<SharingRule>(`/sharing-rules/${id}`),
    enabled: !!id,
  });
}

export interface CreateSharingRuleInput {
  name: string;
  objectName: string;
  ruleType: SharingRuleType;
  description?: string;
  isActive?: boolean;
  sourceType?: SharingSourceType;
  sourceId?: string;
  targetType: SharingTargetType;
  targetId: string;
  accessLevel?: SharingAccessLevel;
  filterCriteria?: Record<string, unknown>;
}

export function useCreateSharingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSharingRuleInput) =>
      apiClient.post<{ id: string }>("/sharing-rules", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHARING_RULES_KEY] });
    },
  });
}

export interface UpdateSharingRuleInput {
  name?: string;
  description?: string;
  isActive?: boolean;
  sourceType?: SharingSourceType;
  sourceId?: string;
  targetType?: SharingTargetType;
  targetId?: string;
  accessLevel?: SharingAccessLevel;
  filterCriteria?: Record<string, unknown>;
}

export function useUpdateSharingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
      etag,
    }: {
      id: string;
      data: UpdateSharingRuleInput;
      etag?: string;
    }) => apiClient.patch<SharingRule>(`/sharing-rules/${id}`, data, etag),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [SHARING_RULES_KEY] });
      queryClient.invalidateQueries({
        queryKey: [SHARING_RULES_KEY, variables.id],
      });
    },
  });
}

export function useDeleteSharingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/sharing-rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHARING_RULES_KEY] });
    },
  });
}

// === Public Groups ===

export type GroupMemberType = "User" | "Role" | "RoleAndSubordinates" | "Group";

export interface PublicGroup {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  isActive: boolean;
  doesIncludeBosses: boolean;
  memberCount?: number;
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface PublicGroupMember {
  id: string;
  tenantId: string;
  groupId: string;
  memberType: GroupMemberType;
  memberId: string;
  memberName?: string;
  createdAt: string;
  createdBy?: string;
}

export interface PublicGroupsListParams {
  activeOnly?: boolean;
}

export function usePublicGroups(params?: PublicGroupsListParams) {
  return useQuery({
    queryKey: [PUBLIC_GROUPS_KEY, params],
    queryFn: () =>
      apiClient.get<PaginatedResponse<PublicGroup>>("/public-groups", {
        ...(params?.activeOnly && { activeOnly: "true" }),
      }),
  });
}

export function usePublicGroup(id: string | undefined) {
  return useQuery({
    queryKey: [PUBLIC_GROUPS_KEY, id],
    queryFn: () => apiClient.get<PublicGroup>(`/public-groups/${id}`),
    enabled: !!id,
  });
}

export function usePublicGroupMembers(groupId: string | undefined) {
  return useQuery({
    queryKey: [PUBLIC_GROUPS_KEY, groupId, "members"],
    queryFn: () =>
      apiClient.get<PaginatedResponse<PublicGroupMember>>(
        `/public-groups/${groupId}/members`
      ),
    enabled: !!groupId,
  });
}

export interface CreatePublicGroupInput {
  name: string;
  description?: string;
  isActive?: boolean;
  doesIncludeBosses?: boolean;
}

export function useCreatePublicGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePublicGroupInput) =>
      apiClient.post<{ id: string }>("/public-groups", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PUBLIC_GROUPS_KEY] });
    },
  });
}

export interface UpdatePublicGroupInput {
  name?: string;
  description?: string;
  isActive?: boolean;
  doesIncludeBosses?: boolean;
}

export function useUpdatePublicGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePublicGroupInput }) =>
      apiClient.patch<PublicGroup>(`/public-groups/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [PUBLIC_GROUPS_KEY] });
      queryClient.invalidateQueries({
        queryKey: [PUBLIC_GROUPS_KEY, variables.id],
      });
    },
  });
}

export function useDeletePublicGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/public-groups/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PUBLIC_GROUPS_KEY] });
    },
  });
}

export interface AddGroupMemberInput {
  memberType: GroupMemberType;
  memberId: string;
}

export function useAddGroupMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, data }: { groupId: string; data: AddGroupMemberInput }) =>
      apiClient.post<PublicGroupMember>(
        `/public-groups/${groupId}/members`,
        data
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [PUBLIC_GROUPS_KEY, variables.groupId, "members"],
      });
      queryClient.invalidateQueries({ queryKey: [PUBLIC_GROUPS_KEY] });
    },
  });
}

export function useRemoveGroupMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      memberType,
      memberId,
    }: {
      groupId: string;
      memberType: string;
      memberId: string;
    }) =>
      apiClient.delete(
        `/public-groups/${groupId}/members/${memberType}/${memberId}`
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [PUBLIC_GROUPS_KEY, variables.groupId, "members"],
      });
      queryClient.invalidateQueries({ queryKey: [PUBLIC_GROUPS_KEY] });
    },
  });
}
