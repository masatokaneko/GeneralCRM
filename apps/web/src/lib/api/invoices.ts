import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import type { Invoice, InvoiceLineItem, QueryResponse } from "@/mocks/types";

const INVOICES_KEY = "invoices";
const INVOICE_LINE_ITEMS_KEY = "invoice-line-items";

export interface InvoicesListParams {
  limit?: number;
  cursor?: string;
  sort?: string;
  order?: "asc" | "desc";
  accountId?: string;
  contractId?: string;
  status?: string;
}

// List invoices
export function useInvoices(params?: InvoicesListParams) {
  return useQuery({
    queryKey: [INVOICES_KEY, params],
    queryFn: () => {
      const queryParams: Record<string, string> = {
        limit: String(params?.limit || 50),
      };
      if (params?.cursor) queryParams.cursor = params.cursor;
      if (params?.sort) queryParams.sort = params.sort;
      if (params?.order) queryParams.order = params.order;
      if (params?.accountId) queryParams.accountId = params.accountId;
      if (params?.contractId) queryParams.contractId = params.contractId;
      if (params?.status) queryParams.status = params.status;
      return apiClient.get<QueryResponse<Invoice>>("/invoices", queryParams);
    },
  });
}

// Get invoice by ID
export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: [INVOICES_KEY, id],
    queryFn: () => apiClient.get<Invoice>(`/invoices/${id}`),
    enabled: !!id,
  });
}

// Create invoice
export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Invoice>) =>
      apiClient.post<Invoice>("/invoices", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVOICES_KEY] });
    },
  });
}

// Update invoice
export function useUpdateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data, etag }: { id: string; data: Partial<Invoice>; etag?: string }) =>
      apiClient.patch<Invoice>(`/invoices/${id}`, data, etag),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [INVOICES_KEY] });
      queryClient.invalidateQueries({ queryKey: [INVOICES_KEY, variables.id] });
    },
  });
}

// Delete invoice
export function useDeleteInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVOICES_KEY] });
    },
  });
}

// Send invoice
export function useSendInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<Invoice>(`/invoices/${id}/actions/send`, {}),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [INVOICES_KEY] });
      queryClient.invalidateQueries({ queryKey: [INVOICES_KEY, id] });
    },
  });
}

// Record payment
export interface RecordPaymentInput {
  id: string;
  amount: number;
}

export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, amount }: RecordPaymentInput) =>
      apiClient.post<Invoice>(`/invoices/${id}/actions/record-payment`, { amount }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [INVOICES_KEY] });
      queryClient.invalidateQueries({ queryKey: [INVOICES_KEY, id] });
    },
  });
}

// Mark as overdue
export function useMarkOverdue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<Invoice>(`/invoices/${id}/actions/mark-overdue`, {}),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [INVOICES_KEY] });
      queryClient.invalidateQueries({ queryKey: [INVOICES_KEY, id] });
    },
  });
}

// Cancel invoice
export function useCancelInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<Invoice>(`/invoices/${id}/actions/cancel`, {}),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [INVOICES_KEY] });
      queryClient.invalidateQueries({ queryKey: [INVOICES_KEY, id] });
    },
  });
}

// Void invoice
export function useVoidInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<Invoice>(`/invoices/${id}/actions/void`, {}),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [INVOICES_KEY] });
      queryClient.invalidateQueries({ queryKey: [INVOICES_KEY, id] });
    },
  });
}

// --- Invoice Line Items ---

// Get line items by invoice
export function useInvoiceLineItems(invoiceId: string | undefined) {
  return useQuery({
    queryKey: [INVOICE_LINE_ITEMS_KEY, invoiceId],
    queryFn: () =>
      apiClient.get<QueryResponse<InvoiceLineItem>>(`/invoices/${invoiceId}/line-items`),
    enabled: !!invoiceId,
  });
}

// Create invoice line item
export function useCreateInvoiceLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ invoiceId, data }: { invoiceId: string; data: Partial<InvoiceLineItem> }) =>
      apiClient.post<InvoiceLineItem>(`/invoices/${invoiceId}/line-items`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [INVOICE_LINE_ITEMS_KEY, variables.invoiceId] });
      queryClient.invalidateQueries({ queryKey: [INVOICES_KEY, variables.invoiceId] });
    },
  });
}

// Update invoice line item
export function useUpdateInvoiceLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      invoiceId,
      data,
      etag,
    }: {
      id: string;
      invoiceId: string;
      data: Partial<InvoiceLineItem>;
      etag?: string;
    }) =>
      apiClient.patch<InvoiceLineItem>(`/invoice-line-items/${id}`, data, etag),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [INVOICE_LINE_ITEMS_KEY, variables.invoiceId] });
      queryClient.invalidateQueries({ queryKey: [INVOICES_KEY, variables.invoiceId] });
    },
  });
}

// Delete invoice line item
export function useDeleteInvoiceLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, invoiceId }: { id: string; invoiceId: string }) =>
      apiClient.delete(`/invoice-line-items/${id}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [INVOICE_LINE_ITEMS_KEY, variables.invoiceId] });
      queryClient.invalidateQueries({ queryKey: [INVOICES_KEY, variables.invoiceId] });
    },
  });
}
