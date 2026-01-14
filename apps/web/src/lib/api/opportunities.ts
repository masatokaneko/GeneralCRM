import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, type PaginatedResponse } from "./client";
import type { Opportunity } from "@/mocks/types";

const OPPORTUNITIES_KEY = "opportunities";

export interface OpportunitiesListParams {
  limit?: number;
  cursor?: string;
  accountId?: string;
  stageName?: string;
}

export function useOpportunities(params?: OpportunitiesListParams) {
  return useQuery({
    queryKey: [OPPORTUNITIES_KEY, params],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Opportunity>>("/opportunities", {
        limit: String(params?.limit || 50),
        ...(params?.cursor && { cursor: params.cursor }),
        ...(params?.accountId && { accountId: params.accountId }),
        ...(params?.stageName && { stageName: params.stageName }),
      }),
  });
}

export function useOpportunity(id: string | undefined) {
  return useQuery({
    queryKey: [OPPORTUNITIES_KEY, id],
    queryFn: () => apiClient.get<Opportunity>(`/opportunities/${id}`),
    enabled: !!id,
  });
}

export function useOpportunitiesByAccount(accountId: string | undefined) {
  return useQuery({
    queryKey: [OPPORTUNITIES_KEY, "byAccount", accountId],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Opportunity>>("/opportunities", {
        accountId: accountId!,
      }),
    enabled: !!accountId,
  });
}

export function useCreateOpportunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Opportunity>) =>
      apiClient.post<{ id: string }>("/opportunities", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [OPPORTUNITIES_KEY] });
    },
  });
}

export function useUpdateOpportunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
      etag,
    }: {
      id: string;
      data: Partial<Opportunity>;
      etag?: string;
    }) =>
      apiClient.patch<Opportunity>(`/opportunities/${id}`, data, etag),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [OPPORTUNITIES_KEY] });
      queryClient.invalidateQueries({
        queryKey: [OPPORTUNITIES_KEY, variables.id],
      });
    },
  });
}

export function useDeleteOpportunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/opportunities/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [OPPORTUNITIES_KEY] });
    },
  });
}

export function useChangeOpportunityStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      stageName,
      etag,
    }: {
      id: string;
      stageName: string;
      etag?: string;
    }) =>
      apiClient.post<Opportunity>(`/opportunities/${id}/stage`, {
        stageName,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [OPPORTUNITIES_KEY] });
      queryClient.invalidateQueries({
        queryKey: [OPPORTUNITIES_KEY, variables.id],
      });
    },
  });
}

export function useCloseOpportunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      isWon,
      lostReason,
    }: {
      id: string;
      isWon: boolean;
      lostReason?: string;
    }) =>
      apiClient.post<Opportunity>(`/opportunities/${id}/close`, {
        isWon,
        ...(lostReason && { lostReason }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [OPPORTUNITIES_KEY] });
      queryClient.invalidateQueries({
        queryKey: [OPPORTUNITIES_KEY, variables.id],
      });
    },
  });
}
