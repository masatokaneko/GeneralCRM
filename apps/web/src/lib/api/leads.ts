import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, type PaginatedResponse } from "./client";
import type { Lead } from "@/mocks/types";

const LEADS_KEY = "leads";

export interface LeadsListParams {
  limit?: number;
  cursor?: string;
  status?: string;
}

export function useLeads(params?: LeadsListParams) {
  return useQuery({
    queryKey: [LEADS_KEY, params],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Lead>>("/leads", {
        limit: String(params?.limit || 50),
        ...(params?.cursor && { cursor: params.cursor }),
        ...(params?.status && { status: params.status }),
      }),
  });
}

export function useLead(id: string | undefined) {
  return useQuery({
    queryKey: [LEADS_KEY, id],
    queryFn: () => apiClient.get<Lead>(`/leads/${id}`),
    enabled: !!id,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Lead>) =>
      apiClient.post<{ id: string }>("/leads", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LEADS_KEY] });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
      etag,
    }: {
      id: string;
      data: Partial<Lead>;
      etag?: string;
    }) => apiClient.patch<Lead>(`/leads/${id}`, data, etag),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [LEADS_KEY] });
      queryClient.invalidateQueries({ queryKey: [LEADS_KEY, variables.id] });
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/leads/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LEADS_KEY] });
    },
  });
}

export interface ConvertLeadParams {
  createAccount?: boolean;
  existingAccountId?: string;
  createOpportunity?: boolean;
  opportunityName?: string;
}

export function useConvertLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, params }: { id: string; params: ConvertLeadParams }) =>
      apiClient.post<{
        accountId: string;
        contactId: string;
        opportunityId?: string;
      }>(`/leads/${id}/convert`, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LEADS_KEY] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    },
  });
}
