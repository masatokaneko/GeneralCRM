import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, type PaginatedResponse } from "./client";

export interface Pricebook {
  id: string;
  tenantId: string;
  ownerId: string;
  name: string;
  description?: string;
  isActive: boolean;
  isStandard: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  systemModstamp: string;
}

export interface PricebookEntry {
  id: string;
  tenantId: string;
  ownerId: string;
  pricebookId: string;
  productId: string;
  unitPrice: number;
  isActive: boolean;
  useStandardPrice: boolean;
  productName?: string;
  pricebookName?: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  systemModstamp: string;
}

const PRICEBOOKS_KEY = "pricebooks";
const PRICEBOOK_ENTRIES_KEY = "pricebook-entries";

export interface PricebooksListParams {
  limit?: number;
  cursor?: string;
  isActive?: boolean;
}

export function usePricebooks(params?: PricebooksListParams) {
  return useQuery({
    queryKey: [PRICEBOOKS_KEY, params],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Pricebook>>("/pricebooks", {
        limit: String(params?.limit || 50),
        ...(params?.cursor && { cursor: params.cursor }),
        ...(params?.isActive !== undefined && { isActive: String(params.isActive) }),
      }),
  });
}

export function usePricebook(id: string | undefined) {
  return useQuery({
    queryKey: [PRICEBOOKS_KEY, id],
    queryFn: () => apiClient.get<Pricebook>(`/pricebooks/${id}`),
    enabled: !!id,
  });
}

export function useCreatePricebook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Pricebook>) =>
      apiClient.post<Pricebook>("/pricebooks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PRICEBOOKS_KEY] });
    },
  });
}

export function useUpdatePricebook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
      etag,
    }: {
      id: string;
      data: Partial<Pricebook>;
      etag?: string;
    }) => apiClient.patch<Pricebook>(`/pricebooks/${id}`, data, etag),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [PRICEBOOKS_KEY] });
      queryClient.invalidateQueries({ queryKey: [PRICEBOOKS_KEY, variables.id] });
    },
  });
}

export function useDeletePricebook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/pricebooks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PRICEBOOKS_KEY] });
    },
  });
}

// Pricebook Entry hooks
export interface PricebookEntriesListParams {
  limit?: number;
  cursor?: string;
  pricebookId?: string;
  productId?: string;
}

export function usePricebookEntries(params?: PricebookEntriesListParams) {
  return useQuery({
    queryKey: [PRICEBOOK_ENTRIES_KEY, params],
    queryFn: () =>
      apiClient.get<PaginatedResponse<PricebookEntry>>("/pricebook-entries", {
        limit: String(params?.limit || 50),
        ...(params?.cursor && { cursor: params.cursor }),
        ...(params?.pricebookId && { pricebookId: params.pricebookId }),
        ...(params?.productId && { productId: params.productId }),
      }),
  });
}

export function usePricebookEntry(id: string | undefined) {
  return useQuery({
    queryKey: [PRICEBOOK_ENTRIES_KEY, id],
    queryFn: () => apiClient.get<PricebookEntry>(`/pricebook-entries/${id}`),
    enabled: !!id,
  });
}

export function useCreatePricebookEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<PricebookEntry>) =>
      apiClient.post<PricebookEntry>("/pricebook-entries", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PRICEBOOK_ENTRIES_KEY] });
    },
  });
}

export function useUpdatePricebookEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
      etag,
    }: {
      id: string;
      data: Partial<PricebookEntry>;
      etag?: string;
    }) => apiClient.patch<PricebookEntry>(`/pricebook-entries/${id}`, data, etag),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [PRICEBOOK_ENTRIES_KEY] });
      queryClient.invalidateQueries({ queryKey: [PRICEBOOK_ENTRIES_KEY, variables.id] });
    },
  });
}

export function useDeletePricebookEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/pricebook-entries/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PRICEBOOK_ENTRIES_KEY] });
    },
  });
}
