import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, type PaginatedResponse } from "./client";

// Types
export interface Event {
  id: string;
  tenantId: string;
  ownerId?: string;
  subject: string;
  startDateTime: string;
  endDateTime: string;
  isAllDayEvent: boolean;
  location?: string;
  whoType?: "Lead" | "Contact";
  whoId?: string;
  whatType?: "Account" | "Opportunity" | "Quote";
  whatId?: string;
  description?: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  systemModstamp: string;
  ownerName?: string;
  whoName?: string;
  whatName?: string;
}

export interface EventsListParams {
  ownerId?: string;
  whoType?: string;
  whoId?: string;
  whatType?: string;
  whatId?: string;
  startDateFrom?: string;
  startDateTo?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// Query Keys
const EVENTS_KEY = "events";

// Hooks
export function useEvents(params?: EventsListParams) {
  return useQuery({
    queryKey: [EVENTS_KEY, params],
    queryFn: () => {
      const queryParams: Record<string, string> = {};
      if (params?.ownerId) queryParams.ownerId = params.ownerId;
      if (params?.whoType) queryParams.whoType = params.whoType;
      if (params?.whoId) queryParams.whoId = params.whoId;
      if (params?.whatType) queryParams.whatType = params.whatType;
      if (params?.whatId) queryParams.whatId = params.whatId;
      if (params?.startDateFrom) queryParams.startDateFrom = params.startDateFrom;
      if (params?.startDateTo) queryParams.startDateTo = params.startDateTo;
      if (params?.limit !== undefined) queryParams.limit = params.limit.toString();
      if (params?.offset !== undefined) queryParams.offset = params.offset.toString();
      if (params?.sortBy) queryParams.sortBy = params.sortBy;
      if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;
      return apiClient.get<PaginatedResponse<Event>>("/events", queryParams);
    },
  });
}

export function useEvent(id: string | undefined) {
  return useQuery({
    queryKey: [EVENTS_KEY, id],
    queryFn: () => apiClient.get<Event>(`/events/${id}`),
    enabled: !!id,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Event>) => apiClient.post<Event>("/events", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EVENTS_KEY] });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
      etag,
    }: {
      id: string;
      data: Partial<Event>;
      etag?: string;
    }) => apiClient.patch<Event>(`/events/${id}`, data, etag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EVENTS_KEY] });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/events/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EVENTS_KEY] });
    },
  });
}
