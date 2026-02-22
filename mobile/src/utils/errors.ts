/**
 * API Error Classes and Error Handling Utilities
 * Provides structured error types for different failure scenarios
 */

import { AxiosError } from 'axios';

/** Error codes used across the app */
export enum ApiErrorCode {
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',

  // Auth errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',

  // Client errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  NOT_FOUND = 'NOT_FOUND',

  // Rate limiting / quota
  RATE_LIMITED = 'RATE_LIMITED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',

  // Server errors
  SERVER_ERROR = 'SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // Unknown
  UNKNOWN = 'UNKNOWN',
}

/**
 * Structured API error with user-friendly messages
 */
export class AppError extends Error {
  public readonly code: ApiErrorCode;
  public readonly statusCode?: number;
  public readonly userMessage: string;
  public readonly retryable: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(params: {
    code: ApiErrorCode;
    message: string;
    userMessage: string;
    statusCode?: number;
    retryable?: boolean;
    details?: Record<string, unknown>;
  }) {
    super(params.message);
    this.name = 'AppError';
    this.code = params.code;
    this.statusCode = params.statusCode;
    this.userMessage = params.userMessage;
    this.retryable = params.retryable ?? false;
    this.details = params.details;
  }
}

/**
 * User-friendly error messages (Russian)
 */
const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  [ApiErrorCode.NETWORK_ERROR]: 'Нет подключения к интернету. Проверьте сеть и попробуйте снова.',
  [ApiErrorCode.TIMEOUT]: 'Сервер не отвечает. Попробуйте позже.',
  [ApiErrorCode.UNAUTHORIZED]: 'Сессия истекла. Войдите снова.',
  [ApiErrorCode.TOKEN_EXPIRED]: 'Сессия истекла. Войдите снова.',
  [ApiErrorCode.VALIDATION_ERROR]: 'Некорректные данные. Проверьте ввод.',
  [ApiErrorCode.BAD_REQUEST]: 'Некорректный запрос. Попробуйте снова.',
  [ApiErrorCode.NOT_FOUND]: 'Запрашиваемый ресурс не найден.',
  [ApiErrorCode.RATE_LIMITED]: 'Слишком много запросов. Подождите немного.',
  [ApiErrorCode.QUOTA_EXCEEDED]: 'Лимит бесплатных запросов исчерпан. Оформите PRO подписку.',
  [ApiErrorCode.SERVER_ERROR]: 'Ошибка сервера. Попробуйте позже.',
  [ApiErrorCode.SERVICE_UNAVAILABLE]: 'Сервис временно недоступен. Попробуйте позже.',
  [ApiErrorCode.UNKNOWN]: 'Произошла неизвестная ошибка. Попробуйте снова.',
};

/**
 * Map HTTP status code to ApiErrorCode
 */
function statusToErrorCode(status: number): ApiErrorCode {
  switch (status) {
    case 400:
      return ApiErrorCode.BAD_REQUEST;
    case 401:
      return ApiErrorCode.UNAUTHORIZED;
    case 403:
      return ApiErrorCode.UNAUTHORIZED;
    case 404:
      return ApiErrorCode.NOT_FOUND;
    case 408:
      return ApiErrorCode.TIMEOUT;
    case 422:
      return ApiErrorCode.VALIDATION_ERROR;
    case 429:
      return ApiErrorCode.RATE_LIMITED;
    case 500:
      return ApiErrorCode.SERVER_ERROR;
    case 502:
    case 503:
    case 504:
      return ApiErrorCode.SERVICE_UNAVAILABLE;
    default:
      return status >= 500 ? ApiErrorCode.SERVER_ERROR : ApiErrorCode.UNKNOWN;
  }
}

/**
 * Check if the error response indicates quota exceeded
 */
function isQuotaExceeded(error: AxiosError): boolean {
  const data = error.response?.data as Record<string, unknown> | undefined;
  if (data) {
    const code = data.code || data.error;
    if (
      code === 'QUOTA_EXCEEDED' ||
      code === 'quota_exceeded' ||
      (typeof data.message === 'string' && data.message.toLowerCase().includes('quota'))
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Parse any error into a structured AppError
 */
export function parseError(error: unknown): AppError {
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }

  // Axios error
  if (error instanceof AxiosError || (error && typeof error === 'object' && 'isAxiosError' in error)) {
    const axiosError = error as AxiosError;

    // Network error (no response)
    if (!axiosError.response) {
      if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
        return new AppError({
          code: ApiErrorCode.TIMEOUT,
          message: `Request timeout: ${axiosError.message}`,
          userMessage: ERROR_MESSAGES[ApiErrorCode.TIMEOUT],
          retryable: true,
        });
      }

      return new AppError({
        code: ApiErrorCode.NETWORK_ERROR,
        message: `Network error: ${axiosError.message}`,
        userMessage: ERROR_MESSAGES[ApiErrorCode.NETWORK_ERROR],
        retryable: true,
      });
    }

    const status = axiosError.response.status;

    // Quota exceeded (special case of 429)
    if (status === 429 && isQuotaExceeded(axiosError)) {
      return new AppError({
        code: ApiErrorCode.QUOTA_EXCEEDED,
        message: 'Quota exceeded',
        userMessage: ERROR_MESSAGES[ApiErrorCode.QUOTA_EXCEEDED],
        statusCode: status,
        retryable: false,
      });
    }

    const code = statusToErrorCode(status);

    return new AppError({
      code,
      message: `HTTP ${status}: ${axiosError.message}`,
      userMessage: ERROR_MESSAGES[code],
      statusCode: status,
      retryable: status >= 500 || status === 408 || status === 429,
      details: axiosError.response.data as Record<string, unknown> | undefined,
    });
  }

  // Standard Error
  if (error instanceof Error) {
    return new AppError({
      code: ApiErrorCode.UNKNOWN,
      message: error.message,
      userMessage: ERROR_MESSAGES[ApiErrorCode.UNKNOWN],
      retryable: false,
    });
  }

  // Unknown error type
  return new AppError({
    code: ApiErrorCode.UNKNOWN,
    message: String(error),
    userMessage: ERROR_MESSAGES[ApiErrorCode.UNKNOWN],
    retryable: false,
  });
}

/**
 * Get user-friendly error message
 */
export function getUserMessage(error: unknown): string {
  const appError = parseError(error);
  return appError.userMessage;
}
