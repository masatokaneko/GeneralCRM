import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, type PaginatedResponse } from "./client";

export interface Product {
  id: string;
  tenantId: string;
  ownerId: string;
  name: string;
  productCode?: string;
  description?: string;
  family?: string;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  systemModstamp: string;
}

const PRODUCTS_KEY = "products";

export interface ProductsListParams {
  limit?: number;
  cursor?: string;
  family?: string;
  isActive?: boolean;
}

export function useProducts(params?: ProductsListParams) {
  return useQuery({
    queryKey: [PRODUCTS_KEY, params],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Product>>("/products", {
        limit: String(params?.limit || 50),
        ...(params?.cursor && { cursor: params.cursor }),
        ...(params?.family && { family: params.family }),
        ...(params?.isActive !== undefined && { isActive: String(params.isActive) }),
      }),
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: [PRODUCTS_KEY, id],
    queryFn: () => apiClient.get<Product>(`/products/${id}`),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Product>) =>
      apiClient.post<Product>("/products", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PRODUCTS_KEY] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
      etag,
    }: {
      id: string;
      data: Partial<Product>;
      etag?: string;
    }) => apiClient.patch<Product>(`/products/${id}`, data, etag),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [PRODUCTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [PRODUCTS_KEY, variables.id] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PRODUCTS_KEY] });
    },
  });
}
