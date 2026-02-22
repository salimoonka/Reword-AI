/**
 * Tests for useApi hook
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useApi } from '@/hooks/useApi';

// Mock the errors module
jest.mock('@/utils/errors', () => {
  const ApiErrorCode = {
    NETWORK_ERROR: 'NETWORK_ERROR',
    TIMEOUT: 'TIMEOUT',
    UNAUTHORIZED: 'UNAUTHORIZED',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    BAD_REQUEST: 'BAD_REQUEST',
    NOT_FOUND: 'NOT_FOUND',
    RATE_LIMITED: 'RATE_LIMITED',
    QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
    SERVER_ERROR: 'SERVER_ERROR',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    UNKNOWN: 'UNKNOWN',
  };

  class AppError extends Error {
    code: string;
    userMessage: string;
    retryable: boolean;
    statusCode?: number;

    constructor(params: {
      code: string;
      message: string;
      userMessage: string;
      statusCode?: number;
      retryable?: boolean;
    }) {
      super(params.message);
      this.code = params.code;
      this.userMessage = params.userMessage;
      this.retryable = params.retryable ?? false;
      this.statusCode = params.statusCode;
    }
  }

  function parseError(err: unknown) {
    if (err instanceof AppError) return err;
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new AppError({
      code: ApiErrorCode.UNKNOWN,
      message,
      userMessage: 'Произошла ошибка',
    });
  }

  return { ApiErrorCode, AppError, parseError };
});

describe('useApi', () => {
  it('should start with initial state', () => {
    const apiFn = jest.fn();
    const { result } = renderHook(() => useApi(apiFn));

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isQuotaExceeded).toBe(false);
    expect(result.current.isNetworkError).toBe(false);
  });

  it('should set loading during execution', async () => {
    let resolveFn: (val: string) => void;
    const apiFn = jest.fn(
      () => new Promise<string>((resolve) => { resolveFn = resolve; })
    );

    const { result } = renderHook(() => useApi(apiFn));

    let promise: Promise<string | null>;
    act(() => {
      promise = result.current.execute();
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveFn!('result');
      await promise;
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe('result');
  });

  it('should handle successful execution', async () => {
    const apiFn = jest.fn(() => Promise.resolve({ text: 'Результат' }));

    const { result } = renderHook(() => useApi(apiFn));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.data).toEqual({ text: 'Результат' });
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('should handle errors', async () => {
    const apiFn = jest.fn(() => Promise.reject(new Error('Network failed')));

    const { result } = renderHook(() => useApi(apiFn));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeTruthy();
    expect(result.current.loading).toBe(false);
  });

  it('should reset state', async () => {
    const apiFn = jest.fn(() => Promise.resolve('data'));

    const { result } = renderHook(() => useApi(apiFn));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.data).toBe('data');

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});
