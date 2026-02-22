/**
 * useApi Hook
 * Provides loading/error state management for async API calls
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { parseError, AppError, ApiErrorCode } from '@/utils/errors';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: AppError | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
  /** Execute the API call */
  execute: (...args: unknown[]) => Promise<T | null>;
  /** Reset to initial state */
  reset: () => void;
  /** Whether the error is quota exceeded */
  isQuotaExceeded: boolean;
  /** Whether the error is a network issue */
  isNetworkError: boolean;
}

/**
 * Hook for executing API calls with loading/error state management
 *
 * @example
 * ```tsx
 * const { data, loading, error, execute } = useApi(paraphraseText);
 *
 * const handleParaphrase = () => {
 *   execute({ text: 'Привет', mode: 'formal' });
 * };
 *
 * if (loading) return <Spinner />;
 * if (error) return <Text>{error.userMessage}</Text>;
 * ```
 */
export function useApi<T, TArgs extends unknown[] = unknown[]>(
  apiFunction: (...args: TArgs) => Promise<T>
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  // Track if component is mounted to avoid state updates after unmount
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(
    async (...args: unknown[]): Promise<T | null> => {
      if (!mountedRef.current) return null;

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const result = await apiFunction(...(args as TArgs));

        if (mountedRef.current) {
          setState({ data: result, loading: false, error: null });
        }

        return result;
      } catch (err) {
        const appError = parseError(err);

        if (mountedRef.current) {
          setState((prev) => ({ ...prev, loading: false, error: appError }));
        }

        return null;
      }
    },
    [apiFunction]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
    isQuotaExceeded: state.error?.code === ApiErrorCode.QUOTA_EXCEEDED,
    isNetworkError: state.error?.code === ApiErrorCode.NETWORK_ERROR,
  };
}
