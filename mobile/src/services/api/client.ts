/**
 * API Client - Axios configuration with retry & error handling
 * Configured for backend communication
 */

import axios, {
  AxiosInstance,
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useUserStore } from '@/stores/useUserStore';
import { withRetry, RetryConfig } from '@/utils/retry';
import { parseError, AppError, ApiErrorCode } from '@/utils/errors';

// API Base URL - will be configured via environment
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// Check if we're in development mode (Expo Go / local dev server)
const IS_DEV = __DEV__ || process.env.NODE_ENV === 'development';

// Log API configuration in dev
if (IS_DEV) {
  console.log('[API Client] Base URL:', API_BASE_URL);
  console.log('[API Client] Dev Mode:', IS_DEV);
}

// Supabase anon key — included for Edge Functions gateway compatibility.
// When using a direct Fastify backend (recommended), this header is harmless.
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Create Axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 seconds timeout for LLM calls
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(SUPABASE_ANON_KEY ? { apikey: SUPABASE_ANON_KEY } : {}),
  },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // In production, NEVER send X-Dev-Mode so real JWT auth is used
    if (IS_DEV && config.headers) {
      config.headers['X-Dev-Mode'] = 'true';
    }

    const token = await SecureStore.getItemAsync('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (IS_DEV) {
      console.log('[API Request]', config.method?.toUpperCase(), config.url);
    }

    return config;
  },
  (error: AxiosError) => {
    console.error('[API Request Error]', error.message);
    return Promise.reject(error);
  }
);

// Track if we're currently refreshing to avoid loops
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeToRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

// Response interceptor - handle errors with token refresh
apiClient.interceptors.response.use(
  (response) => {
    if (IS_DEV) {
      console.log('[API Response]', response.status, response.config.url);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 - try to refresh token (avoid infinite loops)
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;

        try {
          const refreshToken = await SecureStore.getItemAsync('refresh_token');

          if (refreshToken) {
            // Refresh via Supabase client directly (no backend endpoint needed)
            const { supabase } = await import('@/services/supabase/client');
            const { data, error: refreshErr } = await supabase.auth.refreshSession({
              refresh_token: refreshToken,
            });

            if (refreshErr || !data.session) {
              throw new Error(refreshErr?.message || 'Session refresh failed');
            }

            const access_token = data.session.access_token;
            const newRefreshToken = data.session.refresh_token;

            await SecureStore.setItemAsync('access_token', access_token);
            if (newRefreshToken) {
              await SecureStore.setItemAsync('refresh_token', newRefreshToken);
            }

            useUserStore.getState().setTokens(access_token, newRefreshToken || refreshToken);
            onRefreshed(access_token);
            isRefreshing = false;

            // Retry original request with new token
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${access_token}`;
            }
            return apiClient(originalRequest);
          } else {
            // No refresh token — logout
            useUserStore.getState().logout();
          }
        } catch (refreshError) {
          isRefreshing = false;
          refreshSubscribers = [];
          useUserStore.getState().logout();
          return Promise.reject(refreshError);
        }
      } else {
        // Another refresh is in progress — queue this request
        return new Promise((resolve) => {
          subscribeToRefresh((token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(apiClient(originalRequest));
          });
        });
      }
    }

    // Parse into AppError for consistent error handling
    const appError = parseError(error);

    if (IS_DEV) {
      console.error('[API Error]', appError.code, appError.message);
    }

    return Promise.reject(appError);
  }
);

/**
 * Default retry configuration for API calls
 */
const API_RETRY_CONFIG: Partial<RetryConfig> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 8000,
  backoffFactor: 2,
  jitter: true,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  onRetry: (attempt, error, delay) => {
    if (IS_DEV) {
      const code = error instanceof AppError ? error.code : 'UNKNOWN';
      console.log(`[API Retry] Attempt ${attempt}, code=${code}, delay=${Math.round(delay)}ms`);
    }
  },
};

/**
 * Make a GET request with automatic retry
 */
export async function apiGet<T>(
  url: string,
  config?: AxiosRequestConfig,
  retryConfig?: Partial<RetryConfig>
): Promise<T> {
  const response = await withRetry(
    () => apiClient.get<T>(url, config),
    { ...API_RETRY_CONFIG, ...retryConfig }
  );
  return response.data;
}

/**
 * Make a POST request with automatic retry
 */
export async function apiPost<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
  retryConfig?: Partial<RetryConfig>
): Promise<T> {
  const response = await withRetry(
    () => apiClient.post<T>(url, data, config),
    { ...API_RETRY_CONFIG, ...retryConfig }
  );
  return response.data;
}

/**
 * Make a PUT request with automatic retry
 */
export async function apiPut<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
  retryConfig?: Partial<RetryConfig>
): Promise<T> {
  const response = await withRetry(
    () => apiClient.put<T>(url, data, config),
    { ...API_RETRY_CONFIG, ...retryConfig }
  );
  return response.data;
}

/**
 * Make a DELETE request with automatic retry
 */
export async function apiDelete<T>(
  url: string,
  config?: AxiosRequestConfig,
  retryConfig?: Partial<RetryConfig>
): Promise<T> {
  const response = await withRetry(
    () => apiClient.delete<T>(url, config),
    { ...API_RETRY_CONFIG, ...retryConfig }
  );
  return response.data;
}

export default apiClient;
