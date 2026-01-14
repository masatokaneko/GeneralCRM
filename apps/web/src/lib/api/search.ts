import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";

export interface SearchResult {
  id: string;
  objectType: "Account" | "Contact" | "Lead" | "Opportunity" | "Quote";
  name: string;
  subtitle?: string;
  matchedField?: string;
  matchedValue?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  totalSize: number;
  query: string;
}

export function useGlobalSearch(query: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["search", query],
    queryFn: () =>
      apiClient.get<SearchResponse>("/search", {
        q: query,
      }),
    enabled: options?.enabled !== false && query.length >= 2,
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useSearchByObject(
  objectType: string,
  query: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ["search", objectType, query],
    queryFn: () =>
      apiClient.get<SearchResponse>(`/search/${objectType}`, {
        q: query,
      }),
    enabled: options?.enabled !== false && query.length >= 2,
    staleTime: 1000 * 60,
  });
}
