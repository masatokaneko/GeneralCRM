import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, type PaginatedResponse } from "./client";
import type { Quote } from "@/mocks/types";

const QUOTES_KEY = "quotes";

export interface QuotesListParams {
  limit?: number;
  cursor?: string;
  opportunityId?: string;
  status?: string;
}

export function useQuotes(params?: QuotesListParams) {
  return useQuery({
    queryKey: [QUOTES_KEY, params],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Quote>>("/quotes", {
        limit: String(params?.limit || 50),
        ...(params?.cursor && { cursor: params.cursor }),
        ...(params?.opportunityId && { opportunityId: params.opportunityId }),
        ...(params?.status && { status: params.status }),
      }),
  });
}

export function useQuote(id: string | undefined) {
  return useQuery({
    queryKey: [QUOTES_KEY, id],
    queryFn: () => apiClient.get<Quote>(`/quotes/${id}`),
    enabled: !!id,
  });
}

export function useQuotesByOpportunity(opportunityId: string | undefined) {
  return useQuery({
    queryKey: [QUOTES_KEY, "byOpportunity", opportunityId],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Quote>>("/quotes", {
        opportunityId: opportunityId!,
      }),
    enabled: !!opportunityId,
  });
}

export function useCreateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Quote>) =>
      apiClient.post<{ id: string }>("/quotes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUOTES_KEY] });
    },
  });
}

export function useUpdateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
      etag,
    }: {
      id: string;
      data: Partial<Quote>;
      etag?: string;
    }) => apiClient.patch<Quote>(`/quotes/${id}`, data, etag),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUOTES_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUOTES_KEY, variables.id] });
    },
  });
}

export function useDeleteQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/quotes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUOTES_KEY] });
    },
  });
}

export function useSetPrimaryQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, opportunityId }: { id: string; opportunityId: string }) =>
      apiClient.post<Quote>(`/quotes/${id}/set-primary`, { opportunityId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUOTES_KEY] });
      queryClient.invalidateQueries({ queryKey: ["opportunities", variables.opportunityId] });
    },
  });
}

export function useChangeQuoteStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: "Draft" | "Presented" | "Accepted" | "Rejected";
    }) => apiClient.post<Quote>(`/quotes/${id}/status`, { status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUOTES_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUOTES_KEY, variables.id] });
    },
  });
}
