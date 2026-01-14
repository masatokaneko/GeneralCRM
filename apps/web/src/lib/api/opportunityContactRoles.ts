import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, type PaginatedResponse } from "./client";

// Types
export interface OpportunityContactRole {
  id: string;
  tenantId: string;
  opportunityId: string;
  contactId: string;
  role: "DecisionMaker" | "Influencer" | "Evaluator" | "Executive" | "User" | "Other";
  isPrimary: boolean;
  influenceLevel?: number;
  stance?: "Support" | "Neutral" | "Oppose";
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  isDeleted: boolean;
  systemModstamp: string;
  // Joined fields
  contactName?: string;
  contactEmail?: string;
  contactTitle?: string;
}

// Query Keys
const OPPORTUNITY_CONTACT_ROLES_KEY = "opportunity-contact-roles";

// Hooks
export function useOpportunityContactRoles(opportunityId: string | undefined) {
  return useQuery({
    queryKey: [OPPORTUNITY_CONTACT_ROLES_KEY, opportunityId],
    queryFn: () =>
      apiClient.get<PaginatedResponse<OpportunityContactRole>>(
        `/opportunities/${opportunityId}/contact-roles`
      ),
    enabled: !!opportunityId,
  });
}

export function useContactOpportunityRoles(contactId: string | undefined) {
  return useQuery({
    queryKey: ["contact-opportunity-roles", contactId],
    queryFn: () =>
      apiClient.get<PaginatedResponse<OpportunityContactRole>>(
        `/contacts/${contactId}/opportunity-roles`
      ),
    enabled: !!contactId,
  });
}

export function useOpportunityContactRole(id: string | undefined) {
  return useQuery({
    queryKey: [OPPORTUNITY_CONTACT_ROLES_KEY, "detail", id],
    queryFn: () =>
      apiClient.get<OpportunityContactRole>(`/opportunity-contact-roles/${id}`),
    enabled: !!id,
  });
}

export function useCreateOpportunityContactRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      opportunityId,
      data,
    }: {
      opportunityId: string;
      data: {
        contactId: string;
        role: OpportunityContactRole["role"];
        isPrimary?: boolean;
        influenceLevel?: number;
        stance?: OpportunityContactRole["stance"];
      };
    }) =>
      apiClient.post<OpportunityContactRole>(
        `/opportunities/${opportunityId}/contact-roles`,
        data
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [OPPORTUNITY_CONTACT_ROLES_KEY, variables.opportunityId],
      });
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    },
  });
}

export function useUpdateOpportunityContactRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
      etag,
    }: {
      id: string;
      data: Partial<Pick<OpportunityContactRole, "role" | "isPrimary" | "influenceLevel" | "stance">>;
      etag?: string;
    }) =>
      apiClient.patch<OpportunityContactRole>(
        `/opportunity-contact-roles/${id}`,
        data,
        etag
      ),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: [OPPORTUNITY_CONTACT_ROLES_KEY, result.opportunityId],
      });
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    },
  });
}

export function useSetPrimaryContactRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiClient.post<OpportunityContactRole>(
        `/opportunity-contact-roles/${id}/set-primary`,
        {}
      ),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: [OPPORTUNITY_CONTACT_ROLES_KEY, result.opportunityId],
      });
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    },
  });
}

export function useDeleteOpportunityContactRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      opportunityId,
    }: {
      id: string;
      opportunityId: string;
    }) => apiClient.delete(`/opportunity-contact-roles/${id}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [OPPORTUNITY_CONTACT_ROLES_KEY, variables.opportunityId],
      });
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    },
  });
}
