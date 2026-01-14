import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, type PaginatedResponse } from "./client";
import type { Account } from "@/mocks/types";

const ACCOUNTS_KEY = "accounts";

export interface AccountsListParams {
  limit?: number;
  cursor?: string;
  type?: string;
}

export function useAccounts(params?: AccountsListParams) {
  return useQuery({
    queryKey: [ACCOUNTS_KEY, params],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Account>>("/accounts", {
        limit: String(params?.limit || 50),
        ...(params?.cursor && { cursor: params.cursor }),
        ...(params?.type && { type: params.type }),
      }),
  });
}

export function useAccount(id: string | undefined) {
  return useQuery({
    queryKey: [ACCOUNTS_KEY, id],
    queryFn: () => apiClient.get<Account>(`/accounts/${id}`),
    enabled: !!id,
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Account>) =>
      apiClient.post<{ id: string }>("/accounts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ACCOUNTS_KEY] });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
      etag,
    }: {
      id: string;
      data: Partial<Account>;
      etag?: string;
    }) => apiClient.patch<Account>(`/accounts/${id}`, data, etag),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [ACCOUNTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [ACCOUNTS_KEY, variables.id] });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/accounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ACCOUNTS_KEY] });
    },
  });
}
