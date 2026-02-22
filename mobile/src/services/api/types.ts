/**
 * API Types
 * Shared types for API requests and responses
 */

// Error response from backend
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Generic API response wrapper
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: ApiError;
}

// Re-export from other API modules
export * from './paraphrase';

// Re-export error utilities for convenience
export { AppError, ApiErrorCode, parseError, getUserMessage } from '@/utils/errors';
export { withRetry } from '@/utils/retry';
export { apiGet, apiPost, apiPut, apiDelete } from './client';
