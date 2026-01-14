import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, type PaginatedResponse } from "./client";
import type { Campaign, CampaignMember } from "@/mocks/types";

const CAMPAIGNS_KEY = "campaigns";
const CAMPAIGN_MEMBERS_KEY = "campaignMembers";

export interface CampaignsListParams {
  limit?: number;
  cursor?: string;
  status?: Campaign["status"];
  type?: Campaign["type"];
  isActive?: boolean;
}

// List campaigns
export function useCampaigns(params?: CampaignsListParams) {
  return useQuery({
    queryKey: [CAMPAIGNS_KEY, params],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Campaign>>("/campaigns", {
        limit: String(params?.limit || 50),
        ...(params?.cursor && { cursor: params.cursor }),
        ...(params?.status && { status: params.status }),
        ...(params?.type && { type: params.type }),
        ...(params?.isActive !== undefined && { isActive: String(params.isActive) }),
      }),
  });
}

// Get single campaign
export function useCampaign(id: string | undefined) {
  return useQuery({
    queryKey: [CAMPAIGNS_KEY, id],
    queryFn: () => apiClient.get<Campaign>(`/campaigns/${id}`),
    enabled: !!id,
  });
}

// Create campaign
export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Campaign>) =>
      apiClient.post<{ id: string }>("/campaigns", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CAMPAIGNS_KEY] });
    },
  });
}

// Update campaign
export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
      etag,
    }: {
      id: string;
      data: Partial<Campaign>;
      etag?: string;
    }) => apiClient.patch<Campaign>(`/campaigns/${id}`, data, etag),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [CAMPAIGNS_KEY] });
      queryClient.invalidateQueries({
        queryKey: [CAMPAIGNS_KEY, variables.id],
      });
    },
  });
}

// Delete campaign
export function useDeleteCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/campaigns/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CAMPAIGNS_KEY] });
    },
  });
}

// Get campaign members
export function useCampaignMembers(campaignId: string | undefined) {
  return useQuery({
    queryKey: [CAMPAIGN_MEMBERS_KEY, campaignId],
    queryFn: () =>
      apiClient.get<PaginatedResponse<CampaignMember>>(
        `/campaigns/${campaignId}/members`
      ),
    enabled: !!campaignId,
  });
}

// Add campaign member
export function useAddCampaignMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      campaignId,
      data,
    }: {
      campaignId: string;
      data: { leadId?: string; contactId?: string; status?: CampaignMember["status"] };
    }) => apiClient.post<CampaignMember>(`/campaigns/${campaignId}/members`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [CAMPAIGN_MEMBERS_KEY, variables.campaignId],
      });
      queryClient.invalidateQueries({
        queryKey: [CAMPAIGNS_KEY, variables.campaignId],
      });
    },
  });
}

// Update campaign member status
export function useUpdateCampaignMemberStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      campaignId,
      memberId,
      status,
    }: {
      campaignId: string;
      memberId: string;
      status: CampaignMember["status"];
    }) =>
      apiClient.patch<CampaignMember>(`/campaign-members/${memberId}`, {
        status,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [CAMPAIGN_MEMBERS_KEY, variables.campaignId],
      });
    },
  });
}

// Remove campaign member
export function useRemoveCampaignMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      campaignId,
      memberId,
    }: {
      campaignId: string;
      memberId: string;
    }) => apiClient.delete(`/campaign-members/${memberId}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [CAMPAIGN_MEMBERS_KEY, variables.campaignId],
      });
      queryClient.invalidateQueries({
        queryKey: [CAMPAIGNS_KEY, variables.campaignId],
      });
    },
  });
}

// Campaign statistics
export interface CampaignStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalBudget: number;
  totalActualCost: number;
  totalRevenue: number;
  roi: number;
}

export function useCampaignStats() {
  return useQuery({
    queryKey: [CAMPAIGNS_KEY, "stats"],
    queryFn: () => apiClient.get<CampaignStats>("/campaigns/stats"),
  });
}
