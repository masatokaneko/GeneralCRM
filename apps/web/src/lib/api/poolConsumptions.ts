import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import type { PoolConsumption, QueryResponse } from "@/mocks/types";

const POOL_CONSUMPTIONS_KEY = "pool-consumptions";

// List pending consumptions (for approval queue)
export function usePendingPoolConsumptions() {
  return useQuery({
    queryKey: [POOL_CONSUMPTIONS_KEY, "pending"],
    queryFn: () =>
      apiClient.get<QueryResponse<PoolConsumption>>("/pool-consumptions/pending"),
  });
}

// Get consumption by ID
export function usePoolConsumption(id: string | undefined) {
  return useQuery({
    queryKey: [POOL_CONSUMPTIONS_KEY, id],
    queryFn: () => apiClient.get<PoolConsumption>(`/pool-consumptions/${id}`),
    enabled: !!id,
  });
}

// List consumptions by contract line item
export function usePoolConsumptionsByLineItem(contractLineItemId: string | undefined) {
  return useQuery({
    queryKey: [POOL_CONSUMPTIONS_KEY, "by-line-item", contractLineItemId],
    queryFn: () =>
      apiClient.get<QueryResponse<PoolConsumption>>(
        `/contract-line-items/${contractLineItemId}/consumptions`
      ),
    enabled: !!contractLineItemId,
  });
}

// List consumptions by contract
export function usePoolConsumptionsByContract(contractId: string | undefined) {
  return useQuery({
    queryKey: [POOL_CONSUMPTIONS_KEY, "by-contract", contractId],
    queryFn: () =>
      apiClient.get<QueryResponse<PoolConsumption>>(
        `/contracts/${contractId}/consumptions`
      ),
    enabled: !!contractId,
  });
}

// Create consumption request
export interface CreatePoolConsumptionInput {
  contractLineItemId: string;
  consumptionDate: string;
  quantity?: number;
  unitPrice?: number;
  amount?: number;
  description?: string;
  externalReference?: string;
}

export function useCreatePoolConsumption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePoolConsumptionInput) =>
      apiClient.post<PoolConsumption>("/pool-consumptions", data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [POOL_CONSUMPTIONS_KEY] });
      queryClient.invalidateQueries({
        queryKey: ["contract-line-items", variables.contractLineItemId]
      });
    },
  });
}

// Approve consumption
export function useApprovePoolConsumption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<PoolConsumption>(`/pool-consumptions/${id}/actions/approve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [POOL_CONSUMPTIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: ["contract-line-items"] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
  });
}

// Reject consumption
export interface RejectPoolConsumptionInput {
  id: string;
  reason: string;
}

export function useRejectPoolConsumption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: RejectPoolConsumptionInput) =>
      apiClient.post<PoolConsumption>(`/pool-consumptions/${id}/actions/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [POOL_CONSUMPTIONS_KEY] });
    },
  });
}

// Cancel consumption
export function useCancelPoolConsumption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<PoolConsumption>(`/pool-consumptions/${id}/actions/cancel`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [POOL_CONSUMPTIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: ["contract-line-items"] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
  });
}

// Delete consumption (only Pending)
export function useDeletePoolConsumption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/pool-consumptions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [POOL_CONSUMPTIONS_KEY] });
    },
  });
}
