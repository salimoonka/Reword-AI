/**
 * Retry Utility with Exponential Backoff
 * Used for API calls and other operations that may fail transiently
 */

export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries: number;
  /** Base delay in ms between retries (default: 1000) */
  baseDelay: number;
  /** Maximum delay in ms (default: 10000) */
  maxDelay: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoffFactor: number;
  /** Whether to add jitter to prevent thundering herd (default: true) */
  jitter: boolean;
  /** HTTP status codes that should trigger a retry */
  retryableStatuses: number[];
  /** Callback invoked before each retry attempt */
  onRetry?: (attempt: number, error: unknown, delay: number) => void;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  jitter: true,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

/**
 * Calculate delay for a given retry attempt with optional jitter
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.baseDelay * Math.pow(config.backoffFactor, attempt);
  const clampedDelay = Math.min(exponentialDelay, config.maxDelay);

  if (config.jitter) {
    // Full jitter: random value between 0 and clampedDelay
    return Math.random() * clampedDelay;
  }

  return clampedDelay;
}

/**
 * Check if an error is retryable based on its HTTP status or nature
 */
export function isRetryableError(error: unknown, config: RetryConfig): boolean {
  // Network errors (no response) are always retryable
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: string }).code;
    if (code === 'ECONNABORTED' || code === 'ERR_NETWORK' || code === 'ETIMEDOUT') {
      return true;
    }
  }

  // Check HTTP status codes
  if (error && typeof error === 'object' && 'response' in error) {
    const status = (error as { response?: { status?: number } }).response?.status;
    if (status && config.retryableStatuses.includes(status)) {
      return true;
    }
  }

  return false;
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute an async function with retry logic and exponential backoff
 *
 * @example
 * ```ts
 * const result = await withRetry(
 *   () => apiClient.post('/v1/paraphrase', data),
 *   { maxRetries: 3, onRetry: (attempt, err) => console.log(`Retry ${attempt}`) }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  partialConfig?: Partial<RetryConfig>
): Promise<T> {
  const config: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...partialConfig };

  let lastError: unknown;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on the last attempt
      if (attempt === config.maxRetries) {
        break;
      }

      // Don't retry non-retryable errors
      if (!isRetryableError(error, config)) {
        break;
      }

      const delay = calculateDelay(attempt, config);

      if (config.onRetry) {
        config.onRetry(attempt + 1, error, delay);
      }

      await sleep(delay);
    }
  }

  throw lastError;
}
