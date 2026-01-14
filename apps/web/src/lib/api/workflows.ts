import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import type {
  WorkflowRule,
  WorkflowCondition,
  WorkflowAction,
  QueryResponse,
} from "@/mocks/types";

// Query params for workflow list
export interface WorkflowListParams {
  objectName?: string;
  isActive?: boolean;
  search?: string;
}

// Get workflows list
export function useWorkflows(params?: WorkflowListParams) {
  return useQuery({
    queryKey: ["workflows", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.objectName) searchParams.set("objectName", params.objectName);
      if (params?.isActive !== undefined) searchParams.set("isActive", String(params.isActive));
      if (params?.search) searchParams.set("search", params.search);

      const query = searchParams.toString();
      const url = query ? `/workflows?${query}` : "/workflows";
      return apiClient.get<QueryResponse<WorkflowRule>>(url);
    },
  });
}

// Get single workflow
export function useWorkflow(id: string) {
  return useQuery({
    queryKey: ["workflows", id],
    queryFn: () => apiClient.get<WorkflowRule>(`/workflows/${id}`),
    enabled: !!id,
  });
}

// Create workflow
export function useCreateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<WorkflowRule>) =>
      apiClient.post<WorkflowRule>("/workflows", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
  });
}

// Update workflow
export function useUpdateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<WorkflowRule> }) =>
      apiClient.patch<WorkflowRule>(`/workflows/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      queryClient.invalidateQueries({ queryKey: ["workflows", variables.id] });
    },
  });
}

// Delete workflow
export function useDeleteWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/workflows/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
  });
}

// Toggle workflow active status
export function useToggleWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<WorkflowRule>(`/workflows/${id}/toggle`, {}),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      queryClient.invalidateQueries({ queryKey: ["workflows", id] });
    },
  });
}

// Get available objects for workflows
export function useWorkflowObjects() {
  return useQuery({
    queryKey: ["workflows", "metadata", "objects"],
    queryFn: () =>
      apiClient.get<{ objects: string[] }>("/workflows/metadata/objects"),
  });
}

// Get fields for a specific object
export function useWorkflowObjectFields(objectName: string) {
  return useQuery({
    queryKey: ["workflows", "metadata", "fields", objectName],
    queryFn: () =>
      apiClient.get<{
        objectName: string;
        fields: { name: string; label: string; type: string }[];
      }>(`/workflows/metadata/fields/${objectName}`),
    enabled: !!objectName,
  });
}

// Types for workflow form
export interface WorkflowFormData {
  name: string;
  objectName: string;
  triggerType: WorkflowRule["triggerType"];
  evaluationCriteria: WorkflowRule["evaluationCriteria"];
  isActive: boolean;
  description?: string;
  conditions: WorkflowCondition[];
  filterLogic?: string;
  actions: WorkflowAction[];
}

// Convert form data to API format
export function workflowFormToApi(data: WorkflowFormData): Partial<WorkflowRule> {
  return {
    name: data.name,
    objectName: data.objectName,
    triggerType: data.triggerType,
    evaluationCriteria: data.evaluationCriteria,
    isActive: data.isActive,
    description: data.description,
    conditions: data.conditions,
    filterLogic: data.filterLogic || undefined,
    actions: data.actions,
  };
}

// Convert API data to form format
export function workflowApiToForm(rule: WorkflowRule): WorkflowFormData {
  return {
    name: rule.name,
    objectName: rule.objectName,
    triggerType: rule.triggerType,
    evaluationCriteria: rule.evaluationCriteria,
    isActive: rule.isActive,
    description: rule.description,
    conditions: rule.conditions,
    filterLogic: rule.filterLogic,
    actions: rule.actions,
  };
}
