const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "/v1";

export interface ApiError {
  code: string;
  message: string;
  details?: Array<{ field: string; message: string }>;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

export interface PaginatedResponse<T> {
  records: T[];
  totalSize: number;
  nextCursor?: string;
}

export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      "Content-Type": "application/json",
    };
  }

  setTenantId(tenantId: string) {
    this.defaultHeaders["X-Tenant-Id"] = tenantId;
  }

  setAuthToken(token: string) {
    this.defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  private async request<T>(
    method: string,
    path: string,
    options?: {
      body?: unknown;
      headers?: Record<string, string>;
      params?: Record<string, string>;
    }
  ): Promise<T> {
    let url = `${this.baseUrl}${path}`;

    if (options?.params) {
      const searchParams = new URLSearchParams(options.params);
      url += `?${searchParams.toString()}`;
    }

    const response = await fetch(url, {
      method,
      headers: {
        ...this.defaultHeaders,
        ...options?.headers,
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const error = new Error(errorBody?.error?.message || `HTTP ${response.status}`);
      (error as Error & { status: number; code: string; details: unknown[] }).status = response.status;
      (error as Error & { code: string }).code = errorBody?.error?.code || "UNKNOWN_ERROR";
      (error as Error & { details: unknown[] }).details = errorBody?.error?.details || [];
      throw error;
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    return this.request<T>("GET", path, { params });
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, { body });
  }

  async patch<T>(
    path: string,
    body: unknown,
    etag?: string
  ): Promise<T> {
    const headers: Record<string, string> = {};
    if (etag) {
      headers["If-Match"] = etag;
    }
    return this.request<T>("PATCH", path, { body, headers });
  }

  async put<T>(
    path: string,
    body: unknown,
    etag?: string
  ): Promise<T> {
    const headers: Record<string, string> = {};
    if (etag) {
      headers["If-Match"] = etag;
    }
    return this.request<T>("PUT", path, { body, headers });
  }

  async delete(path: string): Promise<void> {
    return this.request<void>("DELETE", path);
  }
}

export const apiClient = new ApiClient();
