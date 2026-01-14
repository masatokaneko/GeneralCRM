import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, type PaginatedResponse } from "./client";
import type { Order, OrderItem } from "@/mocks/types";

const ORDERS_KEY = "orders";
const ORDER_ITEMS_KEY = "orderItems";

export interface OrdersListParams {
  limit?: number;
  cursor?: string;
  accountId?: string;
  opportunityId?: string;
  contractId?: string;
  status?: string;
}

export function useOrders(params?: OrdersListParams) {
  return useQuery({
    queryKey: [ORDERS_KEY, params],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Order>>("/orders", {
        limit: String(params?.limit || 50),
        ...(params?.cursor && { cursor: params.cursor }),
        ...(params?.accountId && { accountId: params.accountId }),
        ...(params?.opportunityId && { opportunityId: params.opportunityId }),
        ...(params?.contractId && { contractId: params.contractId }),
        ...(params?.status && { status: params.status }),
      }),
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: [ORDERS_KEY, id],
    queryFn: () => apiClient.get<Order>(`/orders/${id}`),
    enabled: !!id,
  });
}

export function useOrdersByAccount(accountId: string | undefined) {
  return useQuery({
    queryKey: [ORDERS_KEY, "byAccount", accountId],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Order>>("/orders", {
        accountId: accountId!,
      }),
    enabled: !!accountId,
  });
}

export function useOrdersByOpportunity(opportunityId: string | undefined) {
  return useQuery({
    queryKey: [ORDERS_KEY, "byOpportunity", opportunityId],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Order>>("/orders", {
        opportunityId: opportunityId!,
      }),
    enabled: !!opportunityId,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Order>) =>
      apiClient.post<{ id: string }>("/orders", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
      etag,
    }: {
      id: string;
      data: Partial<Order>;
      etag?: string;
    }) => apiClient.patch<Order>(`/orders/${id}`, data, etag),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
      queryClient.invalidateQueries({
        queryKey: [ORDERS_KEY, variables.id],
      });
    },
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/orders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
    },
  });
}

// Order Actions
export function useActivateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<Order>(`/orders/${id}/actions/activate`, {}),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY, id] });
    },
  });
}

export function useFulfillOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<Order>(`/orders/${id}/actions/fulfill`, {}),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY, id] });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<Order>(`/orders/${id}/actions/cancel`, {}),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY, id] });
    },
  });
}

// Order Items
export function useOrderItems(orderId: string | undefined) {
  return useQuery({
    queryKey: [ORDER_ITEMS_KEY, orderId],
    queryFn: () =>
      apiClient.get<PaginatedResponse<OrderItem>>(`/orders/${orderId}/items`),
    enabled: !!orderId,
  });
}

export function useOrderItem(id: string | undefined) {
  return useQuery({
    queryKey: [ORDER_ITEMS_KEY, "item", id],
    queryFn: () => apiClient.get<OrderItem>(`/order-items/${id}`),
    enabled: !!id,
  });
}

export function useCreateOrderItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      data,
    }: {
      orderId: string;
      data: Partial<OrderItem>;
    }) => apiClient.post<OrderItem>(`/orders/${orderId}/items`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [ORDER_ITEMS_KEY, variables.orderId],
      });
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
    },
  });
}

export function useUpdateOrderItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      orderId,
      data,
      etag,
    }: {
      id: string;
      orderId: string;
      data: Partial<OrderItem>;
      etag?: string;
    }) => apiClient.patch<OrderItem>(`/order-items/${id}`, data, etag),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [ORDER_ITEMS_KEY, variables.orderId],
      });
      queryClient.invalidateQueries({
        queryKey: [ORDER_ITEMS_KEY, "item", variables.id],
      });
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
    },
  });
}

export function useDeleteOrderItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, orderId }: { id: string; orderId: string }) =>
      apiClient.delete(`/order-items/${id}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [ORDER_ITEMS_KEY, variables.orderId],
      });
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
    },
  });
}
