import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "./client";

const QUERY_KEY = "query";

// Query request types
export interface WhereClause {
  field: string;
  operator:
    | "eq"
    | "ne"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "like"
    | "ilike"
    | "in"
    | "notIn"
    | "isNull"
    | "isNotNull";
  value?: unknown;
}

export interface OrderBySpec {
  field: string;
  direction: "ASC" | "DESC";
}

export interface AggregationSpec {
  field: string;
  function: "count" | "sum" | "avg" | "min" | "max";
  alias?: string;
}

export interface QueryRequest {
  objectName: string;
  select: string[];
  where?: WhereClause[];
  orderBy?: OrderBySpec[];
  groupBy?: string[];
  aggregations?: AggregationSpec[];
  limit?: number;
  offset?: number;
}

export interface QueryResult {
  records: Record<string, unknown>[];
  totalSize: number;
}

export interface QueryableObject {
  name: string;
  label: string;
  fields: string[];
}

export interface FieldMetadata {
  name: string;
  label: string;
  type: string;
  referenceTo?: string;
}

// Execute query
export function useExecuteQuery() {
  return useMutation({
    mutationFn: (request: QueryRequest) =>
      apiClient.post<QueryResult>("/query/execute", request),
  });
}

// Get queryable objects
export function useQueryableObjects() {
  return useQuery({
    queryKey: [QUERY_KEY, "objects"],
    queryFn: () =>
      apiClient.get<{ objects: QueryableObject[] }>("/query/objects"),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get field metadata for an object
export function useObjectFields(objectName: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, "objects", objectName, "fields"],
    queryFn: () =>
      apiClient.get<{ fields: FieldMetadata[] }>(`/query/objects/${objectName}/fields`),
    enabled: !!objectName,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
