import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";

/**
 * APIクライアント設定
 */
export interface ApiClientConfig {
  /** ベースURL */
  baseURL?: string;
  /** タイムアウト（ミリ秒） */
  timeout?: number;
  /** クロスオリジンでCookieを含める */
  withCredentials?: boolean;
  /** デフォルトヘッダー */
  headers?: Record<string, string>;
  /** 認証エラー時のリダイレクトURL */
  authErrorRedirectUrl?: string;
  /** デバッグモード（詳細ログ出力） */
  debug?: boolean;
}

/**
 * デフォルト設定
 */
const DEFAULT_CONFIG: Required<ApiClientConfig> = {
  baseURL: "",
  timeout: 30000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  authErrorRedirectUrl: "/login",
  debug: process.env.NODE_ENV === "development",
};

/**
 * 安全に環境変数にアクセスするヘルパー関数
 * クライアント側でサーバーサイド環境変数にアクセスしようとした場合のエラーを防ぐ
 */
const safeGetEnv = (key: string): string | undefined => {
  if (typeof window === "undefined") {
    // サーバーサイド
    return process.env[key];
  }
  // クライアント側 - NEXT_PUBLIC_プレフィックスのみ
  if (key.startsWith("NEXT_PUBLIC_")) {
    return process.env[key];
  }
  return undefined;
};

/**
 * URLを取得（環境変数から動的に）
 */
const getBaseURL = (configBaseURL?: string): string => {
  if (configBaseURL) {
    return configBaseURL;
  }

  const isServer = typeof window === "undefined";

  if (isServer) {
    const apiBaseUrl = safeGetEnv("API_BASE_URL");
    if (apiBaseUrl) {
      return apiBaseUrl;
    }
    if (process.env.NODE_ENV === "development") {
      return "http://localhost:3015/api/v1";
    }
    return "";
  }

  // Client
  const publicApiBaseUrl = safeGetEnv("NEXT_PUBLIC_API_BASE_URL");
  if (publicApiBaseUrl) {
    return publicApiBaseUrl;
  }
  return "";
};

/**
 * APIクライアントを作成
 */
export function createApiClient(
  config: ApiClientConfig = {},
): AxiosInstance {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  const client = axios.create({
    baseURL: getBaseURL(mergedConfig.baseURL),
    timeout: mergedConfig.timeout,
    withCredentials: mergedConfig.withCredentials,
    headers: mergedConfig.headers,
  });

  // リクエストインターセプター
  client.interceptors.request.use(
    async (requestConfig: InternalAxiosRequestConfig) => {
      const isServer = typeof window === "undefined";

      // Server Componentの場合、Next.jsのCookieを転送
      if (isServer) {
        try {
          const { cookies } = await import("next/headers");
          const cookieStore = await cookies();
          const cookieHeader = cookieStore.toString();

          if (cookieHeader) {
            requestConfig.headers.Cookie = cookieHeader;
          }
        } catch {
          // Next.js以外の環境では無視
        }
      }

      // デバッグログ
      if (mergedConfig.debug) {
        console.log("📤 API Request:", {
          environment: isServer ? "Server" : "Client",
          method: requestConfig.method?.toUpperCase(),
          url: requestConfig.url,
          baseURL: requestConfig.baseURL,
        });
      }

      return requestConfig;
    },
    (error: AxiosError) => {
      if (mergedConfig.debug) {
        console.error("📤 API Request Error:", error);
      }
      return Promise.reject(error);
    },
  );

  // レスポンスインターセプター
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      if (mergedConfig.debug) {
        console.log("📥 API Response:", {
          status: response.status,
          url: response.config.url,
        });
      }
      return response;
    },
    (error: AxiosError) => {
      if (mergedConfig.debug) {
        console.error("📥 API Response Error:", {
          message: error.message,
          status: error.response?.status,
          url: error.config?.url,
        });
      }

      // 認証エラー処理
      const status = error.response?.status;
      if ((status === 401 || status === 403) && typeof window !== "undefined") {
        const currentPath = window.location.pathname;
        const isAuthPage = /^\/(login|authorization|error)(\/|$)/.test(
          currentPath,
        );

        if (mergedConfig.authErrorRedirectUrl && !isAuthPage) {
          window.location.href = mergedConfig.authErrorRedirectUrl;
        }
      }

      return Promise.reject(error);
    },
  );

  return client;
}

/**
 * デフォルトAPIクライアントインスタンス
 */
export const apiClient = createApiClient();

/**
 * APIリクエスト用のヘルパー関数
 */
export const api = {
  get: <T = unknown>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> => apiClient.get<T>(url, config),

  post: <T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> => apiClient.post<T>(url, data, config),

  put: <T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> => apiClient.put<T>(url, data, config),

  delete: <T = unknown>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> => apiClient.delete<T>(url, config),

  patch: <T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> => apiClient.patch<T>(url, data, config),
};

/**
 * Orval API互換のmutator関数
 */
export const orvalApi = async <T = unknown>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> => {
  const { url, method, params, data } = config;
  const response = await apiClient({
    url,
    method,
    params,
    data,
    ...options,
  });
  return response.data;
};

export default apiClient;
