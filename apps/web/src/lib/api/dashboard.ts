import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";

const DASHBOARD_KEY = "dashboard";

// Dashboard KPIs response
export interface DashboardKPIs {
  totalAccounts: number;
  totalLeads: number;
  openOpportunities: number;
  pipelineAmount: number;
  wonThisMonth: {
    count: number;
    amount: number;
  };
}

// Pipeline by stage response
export interface PipelineStage {
  stage: string;
  count: number;
  amount: number;
}

export interface PipelineResponse {
  stages: PipelineStage[];
}

// Recent activities response
export interface RecentActivity {
  id: string;
  name: string;
  type: "account" | "contact" | "lead" | "opportunity";
  updatedAt: string;
}

export interface ActivitiesResponse {
  activities: RecentActivity[];
}

// Opportunities by owner response
export interface OpportunityByOwner {
  ownerId: string;
  count: number;
  totalAmount: number;
  avgAmount: number;
}

export interface OpportunitiesByOwnerResponse {
  byOwner: OpportunityByOwner[];
}

// Closing soon opportunities
export interface ClosingSoonOpportunity {
  id: string;
  name: string;
  accountId: string;
  stageName: string;
  amount: number;
  closeDate: string;
  probability: number;
}

export interface ClosingSoonResponse {
  opportunities: ClosingSoonOpportunity[];
  totalSize: number;
}

// Dashboard KPIs
export function useDashboardKPIs() {
  return useQuery({
    queryKey: [DASHBOARD_KEY, "kpis"],
    queryFn: () => apiClient.get<DashboardKPIs>("/dashboard/kpis"),
    refetchInterval: 60 * 1000, // Refresh every minute
  });
}

// Pipeline by stage
export function usePipeline() {
  return useQuery({
    queryKey: [DASHBOARD_KEY, "pipeline"],
    queryFn: () => apiClient.get<PipelineResponse>("/dashboard/pipeline"),
    refetchInterval: 60 * 1000,
  });
}

// Recent activities
export function useRecentActivities(limit?: number) {
  return useQuery({
    queryKey: [DASHBOARD_KEY, "activities", limit],
    queryFn: () =>
      apiClient.get<ActivitiesResponse>("/dashboard/activities", {
        ...(limit && { limit: String(limit) }),
      }),
    refetchInterval: 30 * 1000, // Refresh every 30 seconds
  });
}

// Opportunities by owner
export function useOpportunitiesByOwner() {
  return useQuery({
    queryKey: [DASHBOARD_KEY, "opportunities-by-owner"],
    queryFn: () =>
      apiClient.get<OpportunitiesByOwnerResponse>("/dashboard/opportunities-by-owner"),
    refetchInterval: 60 * 1000,
  });
}

// Opportunities closing soon
export function useClosingSoonOpportunities(days?: number, limit?: number) {
  return useQuery({
    queryKey: [DASHBOARD_KEY, "closing-soon", days, limit],
    queryFn: () =>
      apiClient.get<ClosingSoonResponse>("/dashboard/closing-soon", {
        ...(days && { days: String(days) }),
        ...(limit && { limit: String(limit) }),
      }),
    refetchInterval: 60 * 1000,
  });
}
