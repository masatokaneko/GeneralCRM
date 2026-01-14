import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, type PaginatedResponse } from "./client";
import type { Contract, ContractLineItem } from "@/mocks/types";

const CONTRACTS_KEY = "contracts";
const CONTRACT_LINE_ITEMS_KEY = "contractLineItems";

export interface ContractsListParams {
  limit?: number;
  cursor?: string;
  accountId?: string;
  status?: string;
  contractType?: string;
}

export function useContracts(params?: ContractsListParams) {
  return useQuery({
    queryKey: [CONTRACTS_KEY, params],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Contract>>("/contracts", {
        limit: String(params?.limit || 50),
        ...(params?.cursor && { cursor: params.cursor }),
        ...(params?.accountId && { accountId: params.accountId }),
        ...(params?.status && { status: params.status }),
        ...(params?.contractType && { contractType: params.contractType }),
      }),
  });
}

export function useContract(id: string | undefined) {
  return useQuery({
    queryKey: [CONTRACTS_KEY, id],
    queryFn: () => apiClient.get<Contract>(`/contracts/${id}`),
    enabled: !!id,
  });
}

export function useContractsByAccount(accountId: string | undefined) {
  return useQuery({
    queryKey: [CONTRACTS_KEY, "byAccount", accountId],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Contract>>("/contracts", {
        accountId: accountId!,
      }),
    enabled: !!accountId,
  });
}

export function useCreateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Contract>) =>
      apiClient.post<{ id: string }>("/contracts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONTRACTS_KEY] });
    },
  });
}

export function useUpdateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
      etag,
    }: {
      id: string;
      data: Partial<Contract>;
      etag?: string;
    }) => apiClient.patch<Contract>(`/contracts/${id}`, data, etag),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [CONTRACTS_KEY] });
      queryClient.invalidateQueries({
        queryKey: [CONTRACTS_KEY, variables.id],
      });
    },
  });
}

export function useDeleteContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/contracts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONTRACTS_KEY] });
    },
  });
}

// Contract Actions
export function useSubmitContractForApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<Contract>(`/contracts/${id}/actions/submit-for-approval`, {}),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [CONTRACTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [CONTRACTS_KEY, id] });
    },
  });
}

export function useActivateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<Contract>(`/contracts/${id}/actions/activate`, {}),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [CONTRACTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [CONTRACTS_KEY, id] });
    },
  });
}

export function useTerminateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiClient.post<Contract>(`/contracts/${id}/actions/terminate`, { reason }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [CONTRACTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [CONTRACTS_KEY, id] });
    },
  });
}

export function useExpireContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<Contract>(`/contracts/${id}/actions/expire`, {}),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [CONTRACTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [CONTRACTS_KEY, id] });
    },
  });
}

export function useRenewContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      renewalData,
    }: {
      id: string;
      renewalData?: Partial<Contract>;
    }) => apiClient.post<Contract>(`/contracts/${id}/actions/renew`, renewalData || {}),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [CONTRACTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [CONTRACTS_KEY, id] });
    },
  });
}

// Contract Line Items
export function useContractLineItems(contractId: string | undefined) {
  return useQuery({
    queryKey: [CONTRACT_LINE_ITEMS_KEY, contractId],
    queryFn: () =>
      apiClient.get<PaginatedResponse<ContractLineItem>>(
        `/contracts/${contractId}/line-items`
      ),
    enabled: !!contractId,
  });
}

export function useContractLineItem(id: string | undefined) {
  return useQuery({
    queryKey: [CONTRACT_LINE_ITEMS_KEY, "item", id],
    queryFn: () => apiClient.get<ContractLineItem>(`/contract-line-items/${id}`),
    enabled: !!id,
  });
}

export function useCreateContractLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      contractId,
      data,
    }: {
      contractId: string;
      data: Partial<ContractLineItem>;
    }) =>
      apiClient.post<ContractLineItem>(
        `/contracts/${contractId}/line-items`,
        data
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [CONTRACT_LINE_ITEMS_KEY, variables.contractId],
      });
      queryClient.invalidateQueries({ queryKey: [CONTRACTS_KEY] });
    },
  });
}

export function useUpdateContractLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      contractId,
      data,
      etag,
    }: {
      id: string;
      contractId: string;
      data: Partial<ContractLineItem>;
      etag?: string;
    }) => apiClient.patch<ContractLineItem>(`/contract-line-items/${id}`, data, etag),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [CONTRACT_LINE_ITEMS_KEY, variables.contractId],
      });
      queryClient.invalidateQueries({
        queryKey: [CONTRACT_LINE_ITEMS_KEY, "item", variables.id],
      });
      queryClient.invalidateQueries({ queryKey: [CONTRACTS_KEY] });
    },
  });
}

export function useDeleteContractLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, contractId }: { id: string; contractId: string }) =>
      apiClient.delete(`/contract-line-items/${id}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [CONTRACT_LINE_ITEMS_KEY, variables.contractId],
      });
      queryClient.invalidateQueries({ queryKey: [CONTRACTS_KEY] });
    },
  });
}
