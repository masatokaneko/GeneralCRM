import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, type PaginatedResponse } from "./client";

// Types
export interface Task {
  id: string;
  tenantId: string;
  ownerId?: string;
  subject: string;
  status: "NotStarted" | "InProgress" | "Completed" | "WaitingOnSomeoneElse" | "Deferred";
  priority: "High" | "Normal" | "Low";
  activityDate?: string;
  dueDate?: string;
  completedAt?: string;
  whoType?: "Lead" | "Contact";
  whoId?: string;
  whatType?: "Account" | "Opportunity" | "Quote";
  whatId?: string;
  description?: string;
  isClosed: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  systemModstamp: string;
  ownerName?: string;
  whoName?: string;
  whatName?: string;
}

export interface TasksListParams {
  status?: string;
  priority?: string;
  ownerId?: string;
  whoType?: string;
  whoId?: string;
  whatType?: string;
  whatId?: string;
  isClosed?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// Query Keys
const TASKS_KEY = "tasks";

// Hooks
export function useTasks(params?: TasksListParams) {
  return useQuery({
    queryKey: [TASKS_KEY, params],
    queryFn: () => {
      const queryParams: Record<string, string> = {};
      if (params?.status) queryParams.status = params.status;
      if (params?.priority) queryParams.priority = params.priority;
      if (params?.ownerId) queryParams.ownerId = params.ownerId;
      if (params?.whoType) queryParams.whoType = params.whoType;
      if (params?.whoId) queryParams.whoId = params.whoId;
      if (params?.whatType) queryParams.whatType = params.whatType;
      if (params?.whatId) queryParams.whatId = params.whatId;
      if (params?.isClosed !== undefined) queryParams.isClosed = params.isClosed.toString();
      if (params?.limit !== undefined) queryParams.limit = params.limit.toString();
      if (params?.offset !== undefined) queryParams.offset = params.offset.toString();
      if (params?.sortBy) queryParams.sortBy = params.sortBy;
      if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;
      return apiClient.get<PaginatedResponse<Task>>("/tasks", queryParams);
    },
  });
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: [TASKS_KEY, id],
    queryFn: () => apiClient.get<Task>(`/tasks/${id}`),
    enabled: !!id,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Task>) => apiClient.post<Task>("/tasks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
      etag,
    }: {
      id: string;
      data: Partial<Task>;
      etag?: string;
    }) => apiClient.patch<Task>(`/tasks/${id}`, data, etag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY] });
    },
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.post<Task>(`/tasks/${id}/complete`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY] });
    },
  });
}
