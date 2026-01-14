import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import type {
  Territory,
  TerritoryUserAssignment,
  TerritoryAccountAssignment,
  TerritoryAssignmentRule,
  QueryResponse,
} from "@/mocks/types";

// Query params for territory list
export interface TerritoryListParams {
  view?: "tree" | "list";
  parentId?: string;
  search?: string;
}

// Get territories list
export function useTerritories(params?: TerritoryListParams) {
  return useQuery({
    queryKey: ["territories", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.view) searchParams.set("view", params.view);
      if (params?.parentId) searchParams.set("parentId", params.parentId);
      if (params?.search) searchParams.set("search", params.search);

      const query = searchParams.toString();
      const url = query ? `/territories?${query}` : "/territories";
      return apiClient.get<QueryResponse<Territory> | { tree: Territory[]; totalSize: number }>(url);
    },
  });
}

// Get territories as tree
export function useTerritoryTree() {
  return useQuery({
    queryKey: ["territories", "tree"],
    queryFn: () =>
      apiClient.get<{ tree: Territory[]; totalSize: number }>("/territories?view=tree"),
  });
}

// Get single territory
export function useTerritory(id: string) {
  return useQuery({
    queryKey: ["territories", id],
    queryFn: () => apiClient.get<Territory>(`/territories/${id}`),
    enabled: !!id,
  });
}

// Create territory
export function useCreateTerritory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Territory>) =>
      apiClient.post<Territory>("/territories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["territories"] });
    },
  });
}

// Update territory
export function useUpdateTerritory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Territory> }) =>
      apiClient.patch<Territory>(`/territories/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["territories"] });
      queryClient.invalidateQueries({ queryKey: ["territories", variables.id] });
    },
  });
}

// Delete territory
export function useDeleteTerritory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/territories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["territories"] });
    },
  });
}

// User Assignments
export function useTerritoryUsers(territoryId: string) {
  return useQuery({
    queryKey: ["territories", territoryId, "users"],
    queryFn: () =>
      apiClient.get<QueryResponse<TerritoryUserAssignment>>(
        `/territories/${territoryId}/users`
      ),
    enabled: !!territoryId,
  });
}

export function useAddTerritoryUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      territoryId,
      userId,
      accessLevel,
    }: {
      territoryId: string;
      userId: string;
      accessLevel: "Read" | "ReadWrite";
    }) =>
      apiClient.post<TerritoryUserAssignment>(`/territories/${territoryId}/users`, {
        userId,
        accessLevel,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["territories", variables.territoryId, "users"],
      });
      queryClient.invalidateQueries({ queryKey: ["territories"] });
    },
  });
}

export function useRemoveTerritoryUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      territoryId,
      assignmentId,
    }: {
      territoryId: string;
      assignmentId: string;
    }) => apiClient.delete(`/territories/${territoryId}/users/${assignmentId}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["territories", variables.territoryId, "users"],
      });
      queryClient.invalidateQueries({ queryKey: ["territories"] });
    },
  });
}

// Account Assignments
export function useTerritoryAccounts(territoryId: string) {
  return useQuery({
    queryKey: ["territories", territoryId, "accounts"],
    queryFn: () =>
      apiClient.get<QueryResponse<TerritoryAccountAssignment>>(
        `/territories/${territoryId}/accounts`
      ),
    enabled: !!territoryId,
  });
}

export function useAddTerritoryAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      territoryId,
      accountId,
    }: {
      territoryId: string;
      accountId: string;
    }) =>
      apiClient.post<TerritoryAccountAssignment>(
        `/territories/${territoryId}/accounts`,
        { accountId }
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["territories", variables.territoryId, "accounts"],
      });
      queryClient.invalidateQueries({ queryKey: ["territories"] });
    },
  });
}

export function useRemoveTerritoryAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      territoryId,
      assignmentId,
    }: {
      territoryId: string;
      assignmentId: string;
    }) => apiClient.delete(`/territories/${territoryId}/accounts/${assignmentId}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["territories", variables.territoryId, "accounts"],
      });
      queryClient.invalidateQueries({ queryKey: ["territories"] });
    },
  });
}

// Assignment Rules
export function useTerritoryRules(territoryId: string) {
  return useQuery({
    queryKey: ["territories", territoryId, "rules"],
    queryFn: () =>
      apiClient.get<QueryResponse<TerritoryAssignmentRule>>(
        `/territories/${territoryId}/rules`
      ),
    enabled: !!territoryId,
  });
}

export function useCreateTerritoryRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      territoryId,
      data,
    }: {
      territoryId: string;
      data: Partial<TerritoryAssignmentRule>;
    }) =>
      apiClient.post<TerritoryAssignmentRule>(
        `/territories/${territoryId}/rules`,
        data
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["territories", variables.territoryId, "rules"],
      });
    },
  });
}

export function useUpdateTerritoryRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      territoryId,
      ruleId,
      data,
    }: {
      territoryId: string;
      ruleId: string;
      data: Partial<TerritoryAssignmentRule>;
    }) =>
      apiClient.patch<TerritoryAssignmentRule>(
        `/territories/${territoryId}/rules/${ruleId}`,
        data
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["territories", variables.territoryId, "rules"],
      });
    },
  });
}

export function useDeleteTerritoryRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      territoryId,
      ruleId,
    }: {
      territoryId: string;
      ruleId: string;
    }) => apiClient.delete(`/territories/${territoryId}/rules/${ruleId}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["territories", variables.territoryId, "rules"],
      });
    },
  });
}

// Run assignment rules
export function useRunTerritoryRules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (territoryId: string) =>
      apiClient.post<{
        message: string;
        accountsAssigned: number;
        accountsUpdated: number;
        errors: number;
      }>(`/territories/${territoryId}/rules/run`, {}),
    onSuccess: (_, territoryId) => {
      queryClient.invalidateQueries({
        queryKey: ["territories", territoryId, "accounts"],
      });
      queryClient.invalidateQueries({ queryKey: ["territories"] });
    },
  });
}

// Get available users for assignment
export function useAvailableUsers() {
  return useQuery({
    queryKey: ["territories", "metadata", "available-users"],
    queryFn: () =>
      apiClient.get<{
        users: { id: string; name: string; email: string; role: string }[];
      }>("/territories/metadata/available-users"),
  });
}

// Types for territory form
export interface TerritoryFormData {
  name: string;
  parentTerritoryId?: string;
  description?: string;
  isActive: boolean;
}

// Convert form data to API format
export function territoryFormToApi(data: TerritoryFormData): Partial<Territory> {
  return {
    name: data.name,
    parentTerritoryId: data.parentTerritoryId || undefined,
    description: data.description,
    isActive: data.isActive,
  };
}

// Convert API data to form format
export function territoryApiToForm(territory: Territory): TerritoryFormData {
  return {
    name: territory.name,
    parentTerritoryId: territory.parentTerritoryId,
    description: territory.description,
    isActive: territory.isActive,
  };
}
