import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, type PaginatedResponse } from "./client";

const REPORTS_KEY = "reports";

// Report definition type
export interface ReportDefinition {
  id: string;
  name: string;
  description?: string;
  baseObject: string;
  reportType: "Tabular" | "Summary" | "Matrix";
  definition: ReportQueryDefinition;
  chartConfig?: ChartConfig;
  folderId?: string;
  isPublic: boolean;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  systemModstamp: string;
}

export interface ReportQueryDefinition {
  select: string[];
  filters?: ReportFilter[];
  orderBy?: { field: string; direction: "ASC" | "DESC" }[];
  groupBy?: string[];
  aggregations?: { field: string; function: string; alias?: string }[];
  limit?: number;
}

export interface ReportFilter {
  field: string;
  operator: string;
  value: unknown;
}

export interface ChartConfig {
  type: "bar" | "line" | "pie" | "donut" | "funnel";
  xAxisField?: string;
  yAxisField?: string;
  groupField?: string;
  showLegend?: boolean;
  showValues?: boolean;
  colors?: string[];
}

export interface ReportRun {
  id: string;
  reportId: string;
  status: "Pending" | "Running" | "Completed" | "Failed";
  startedAt: string;
  completedAt?: string;
  rowCount?: number;
  resultData?: Record<string, unknown>[];
  errorMessage?: string;
  runBy: string;
}

export interface ReportRunResult {
  run: ReportRun;
  data: Record<string, unknown>[];
  totalSize: number;
}

export interface ReportsListParams {
  limit?: number;
  cursor?: string;
  search?: string;
  folderId?: string;
  reportType?: string;
  baseObject?: string;
}

// List reports
export function useReports(params?: ReportsListParams) {
  return useQuery({
    queryKey: [REPORTS_KEY, params],
    queryFn: () =>
      apiClient.get<PaginatedResponse<ReportDefinition>>("/reports", {
        limit: String(params?.limit || 50),
        ...(params?.cursor && { cursor: params.cursor }),
        ...(params?.search && { search: params.search }),
        ...(params?.folderId && { folderId: params.folderId }),
        ...(params?.reportType && { reportType: params.reportType }),
        ...(params?.baseObject && { baseObject: params.baseObject }),
      }),
  });
}

// Get single report
export function useReport(id: string | undefined) {
  return useQuery({
    queryKey: [REPORTS_KEY, id],
    queryFn: () => apiClient.get<ReportDefinition>(`/reports/${id}`),
    enabled: !!id,
  });
}

// Create report
export function useCreateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<ReportDefinition>) =>
      apiClient.post<ReportDefinition>("/reports", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REPORTS_KEY] });
    },
  });
}

// Update report
export function useUpdateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
      etag,
    }: {
      id: string;
      data: Partial<ReportDefinition>;
      etag?: string;
    }) => apiClient.patch<ReportDefinition>(`/reports/${id}`, data, etag),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [REPORTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [REPORTS_KEY, variables.id] });
    },
  });
}

// Delete report
export function useDeleteReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/reports/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REPORTS_KEY] });
    },
  });
}

// Run report
export function useRunReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      parameters,
    }: {
      id: string;
      parameters?: Record<string, unknown>;
    }) => apiClient.post<ReportRunResult>(`/reports/${id}/run`, { parameters }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [REPORTS_KEY, variables.id, "runs"] });
    },
  });
}

// Get report run history
export function useReportRuns(reportId: string | undefined, limit?: number) {
  return useQuery({
    queryKey: [REPORTS_KEY, reportId, "runs", limit],
    queryFn: () =>
      apiClient.get<{ runs: ReportRun[] }>(`/reports/${reportId}/runs`, {
        limit: String(limit || 10),
      }),
    enabled: !!reportId,
  });
}

// Get specific run result
export function useReportRun(reportId: string | undefined, runId: string | undefined) {
  return useQuery({
    queryKey: [REPORTS_KEY, reportId, "runs", runId],
    queryFn: () => apiClient.get<ReportRun>(`/reports/${reportId}/runs/${runId}`),
    enabled: !!reportId && !!runId,
  });
}
