import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, type PaginatedResponse } from "./client";
import type { Contact } from "@/mocks/types";

const CONTACTS_KEY = "contacts";

export interface ContactsListParams {
  limit?: number;
  cursor?: string;
  accountId?: string;
}

export function useContacts(params?: ContactsListParams) {
  return useQuery({
    queryKey: [CONTACTS_KEY, params],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Contact>>("/contacts", {
        limit: String(params?.limit || 50),
        ...(params?.cursor && { cursor: params.cursor }),
        ...(params?.accountId && { accountId: params.accountId }),
      }),
  });
}

export function useContact(id: string | undefined) {
  return useQuery({
    queryKey: [CONTACTS_KEY, id],
    queryFn: () => apiClient.get<Contact>(`/contacts/${id}`),
    enabled: !!id,
  });
}

export function useContactsByAccount(accountId: string | undefined) {
  return useQuery({
    queryKey: [CONTACTS_KEY, "byAccount", accountId],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Contact>>("/contacts", {
        accountId: accountId!,
      }),
    enabled: !!accountId,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Contact>) =>
      apiClient.post<{ id: string }>("/contacts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONTACTS_KEY] });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
      etag,
    }: {
      id: string;
      data: Partial<Contact>;
      etag?: string;
    }) => apiClient.patch<Contact>(`/contacts/${id}`, data, etag),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [CONTACTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [CONTACTS_KEY, variables.id] });
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/contacts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONTACTS_KEY] });
    },
  });
}
