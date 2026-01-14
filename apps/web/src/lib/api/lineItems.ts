import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, type PaginatedResponse } from "./client";

// Types
export interface OpportunityLineItem {
  id: string;
  tenantId: string;
  opportunityId: string;
  pricebookEntryId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  customerUnitPrice?: number;
  discount: number;
  termMonths?: number;
  billingFrequency?: "Monthly" | "Yearly" | "ThreeYear";
  startDate?: string;
  endDate?: string;
  totalPrice: number;
  description?: string;
  sortOrder: number;
  createdAt: string;
  productName?: string;
  productCode?: string;
}

export interface QuoteLineItem {
  id: string;
  tenantId: string;
  quoteId: string;
  productId?: string;
  pricebookEntryId?: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  customerUnitPrice?: number;
  discount: number;
  termMonths?: number;
  billingFrequency?: "Monthly" | "Yearly" | "ThreeYear";
  startDate?: string;
  endDate?: string;
  totalPrice: number;
  sortOrder: number;
  createdAt: string;
  productName?: string;
  productCode?: string;
}

// Query Keys
const OPPORTUNITY_LINE_ITEMS_KEY = "opportunity-line-items";
const QUOTE_LINE_ITEMS_KEY = "quote-line-items";

// Opportunity Line Items Hooks
export function useOpportunityLineItems(opportunityId: string | undefined) {
  return useQuery({
    queryKey: [OPPORTUNITY_LINE_ITEMS_KEY, opportunityId],
    queryFn: () =>
      apiClient.get<PaginatedResponse<OpportunityLineItem>>(
        `/opportunities/${opportunityId}/line-items`
      ),
    enabled: !!opportunityId,
  });
}

export function useCreateOpportunityLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      opportunityId,
      data,
    }: {
      opportunityId: string;
      data: {
        pricebookEntryId: string;
        quantity?: number;
        unitPrice?: number;
        discount?: number;
        description?: string;
        termMonths?: number;
        billingFrequency?: "Monthly" | "Yearly" | "ThreeYear";
        startDate?: string;
      };
    }) =>
      apiClient.post<OpportunityLineItem>(
        `/opportunities/${opportunityId}/line-items`,
        data
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [OPPORTUNITY_LINE_ITEMS_KEY, variables.opportunityId],
      });
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    },
  });
}

export function useUpdateOpportunityLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
      etag,
    }: {
      id: string;
      data: Partial<OpportunityLineItem>;
      etag?: string;
    }) =>
      apiClient.patch<OpportunityLineItem>(
        `/opportunity-line-items/${id}`,
        data,
        etag
      ),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: [OPPORTUNITY_LINE_ITEMS_KEY, result.opportunityId],
      });
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    },
  });
}

export function useDeleteOpportunityLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      opportunityId,
    }: {
      id: string;
      opportunityId: string;
    }) => apiClient.delete(`/opportunity-line-items/${id}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [OPPORTUNITY_LINE_ITEMS_KEY, variables.opportunityId],
      });
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    },
  });
}

// Quote Line Items Hooks
export function useQuoteLineItems(quoteId: string | undefined) {
  return useQuery({
    queryKey: [QUOTE_LINE_ITEMS_KEY, quoteId],
    queryFn: () =>
      apiClient.get<PaginatedResponse<QuoteLineItem>>(
        `/quotes/${quoteId}/line-items`
      ),
    enabled: !!quoteId,
  });
}

export function useCreateQuoteLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      quoteId,
      data,
    }: {
      quoteId: string;
      data: {
        name: string;
        productId?: string;
        pricebookEntryId?: string;
        quantity?: number;
        unitPrice?: number;
        discount?: number;
        description?: string;
        termMonths?: number;
        billingFrequency?: "Monthly" | "Yearly" | "ThreeYear";
        startDate?: string;
      };
    }) =>
      apiClient.post<QuoteLineItem>(`/quotes/${quoteId}/line-items`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [QUOTE_LINE_ITEMS_KEY, variables.quoteId],
      });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
  });
}

export function useUpdateQuoteLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
      etag,
    }: {
      id: string;
      data: Partial<QuoteLineItem>;
      etag?: string;
    }) => apiClient.patch<QuoteLineItem>(`/quote-line-items/${id}`, data, etag),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: [QUOTE_LINE_ITEMS_KEY, result.quoteId],
      });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
  });
}

export function useDeleteQuoteLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, quoteId }: { id: string; quoteId: string }) =>
      apiClient.delete(`/quote-line-items/${id}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [QUOTE_LINE_ITEMS_KEY, variables.quoteId],
      });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
  });
}
