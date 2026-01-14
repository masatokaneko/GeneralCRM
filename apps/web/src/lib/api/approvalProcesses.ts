import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import type {
  ApprovalProcess,
  ApprovalStep,
  ApprovalCondition,
  ApprovalAction,
  QueryResponse,
} from "@/mocks/types";

// Query params for approval process list
export interface ApprovalProcessListParams {
  objectName?: string;
  isActive?: boolean;
  search?: string;
}

// Get approval processes list
export function useApprovalProcesses(params?: ApprovalProcessListParams) {
  return useQuery({
    queryKey: ["approvalProcesses", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.objectName) searchParams.set("objectName", params.objectName);
      if (params?.isActive !== undefined) searchParams.set("isActive", String(params.isActive));
      if (params?.search) searchParams.set("search", params.search);

      const query = searchParams.toString();
      const url = query ? `/approval-processes?${query}` : "/approval-processes";
      return apiClient.get<QueryResponse<ApprovalProcess>>(url);
    },
  });
}

// Get single approval process
export function useApprovalProcess(id: string) {
  return useQuery({
    queryKey: ["approvalProcesses", id],
    queryFn: () => apiClient.get<ApprovalProcess>(`/approval-processes/${id}`),
    enabled: !!id,
  });
}

// Create approval process
export function useCreateApprovalProcess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<ApprovalProcess>) =>
      apiClient.post<ApprovalProcess>("/approval-processes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvalProcesses"] });
    },
  });
}

// Update approval process
export function useUpdateApprovalProcess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ApprovalProcess> }) =>
      apiClient.patch<ApprovalProcess>(`/approval-processes/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["approvalProcesses"] });
      queryClient.invalidateQueries({ queryKey: ["approvalProcesses", variables.id] });
    },
  });
}

// Delete approval process
export function useDeleteApprovalProcess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/approval-processes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvalProcesses"] });
    },
  });
}

// Toggle approval process active status
export function useToggleApprovalProcess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<ApprovalProcess>(`/approval-processes/${id}/toggle`, {}),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["approvalProcesses"] });
      queryClient.invalidateQueries({ queryKey: ["approvalProcesses", id] });
    },
  });
}

// Clone approval process
export function useCloneApprovalProcess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name?: string }) =>
      apiClient.post<ApprovalProcess>(`/approval-processes/${id}/clone`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvalProcesses"] });
    },
  });
}

// Get available objects for approval processes
export function useApprovalObjects() {
  return useQuery({
    queryKey: ["approvalProcesses", "metadata", "objects"],
    queryFn: () =>
      apiClient.get<{ objects: string[] }>("/approval-processes/metadata/objects"),
  });
}

// Approver types
export interface ApproverOption {
  id: string;
  name: string;
  email?: string;
  role?: string;
}

// Get available approvers
export function useApprovers(type?: "User" | "Queue" | "Role") {
  return useQuery({
    queryKey: ["approvalProcesses", "metadata", "approvers", type],
    queryFn: async () => {
      const url = type
        ? `/approval-processes/metadata/approvers?type=${type}`
        : "/approval-processes/metadata/approvers";
      return apiClient.get<{
        users?: ApproverOption[];
        queues?: ApproverOption[];
        roles?: ApproverOption[];
        approvers?: ApproverOption[];
      }>(url);
    },
  });
}

// Types for approval process form
export interface ApprovalProcessFormData {
  name: string;
  objectName: string;
  isActive: boolean;
  description?: string;
  entryCriteria: ApprovalCondition[];
  filterLogic?: string;
  recordEditability: ApprovalProcess["recordEditability"];
  steps: ApprovalStep[];
  actions: {
    onSubmit: ApprovalAction[];
    onApprove: ApprovalAction[];
    onReject: ApprovalAction[];
  };
}

// Convert form data to API format
export function approvalProcessFormToApi(data: ApprovalProcessFormData): Partial<ApprovalProcess> {
  return {
    name: data.name,
    objectName: data.objectName,
    isActive: data.isActive,
    description: data.description,
    entryCriteria: data.entryCriteria,
    filterLogic: data.filterLogic || undefined,
    recordEditability: data.recordEditability,
    steps: data.steps,
    actions: data.actions,
  };
}

// Convert API data to form format
export function approvalProcessApiToForm(process: ApprovalProcess): ApprovalProcessFormData {
  return {
    name: process.name,
    objectName: process.objectName,
    isActive: process.isActive,
    description: process.description,
    entryCriteria: process.entryCriteria,
    filterLogic: process.filterLogic,
    recordEditability: process.recordEditability,
    steps: process.steps,
    actions: process.actions,
  };
}
