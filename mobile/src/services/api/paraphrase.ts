/**
 * Paraphrase API Service
 * Handles paraphrase requests to backend with retry and error handling
 */

import { apiPost, apiGet } from './client';
import { RetryConfig } from '@/utils/retry';
import { useSettingsStore } from '@/stores/useSettingsStore';

export type ParaphraseMode =
  | 'paraphrase'
  | 'shorten'
  | 'expand'
  | 'formal'
  | 'friendly'
  | 'confident'
  | 'professional'
  | 'colloquial'
  | 'empathetic';

export interface ParaphraseRequest {
  text: string;
  mode: ParaphraseMode;
  preserveEnglish?: boolean;
  maxLength?: number;
}

export interface DiffSegment {
  type: 'delete' | 'insert' | 'equal';
  start: number;
  end: number;
  text: string;
}

export interface ParaphraseResponse {
  requestId: string;
  inputText: string;
  outputText: string;
  diff: DiffSegment[];
  processingTimeMs: number;
  warnings?: string[];
}

/** LLM calls can be slow — use longer timeout, fewer retries */
const LLM_RETRY_CONFIG: Partial<RetryConfig> = {
  maxRetries: 1,
  baseDelay: 2000,
  maxDelay: 10000,
};

/**
 * Send paraphrase request to backend
 * Backend handles: JWT validation, PII masking, quota check, LLM call
 */
export async function paraphraseText(
  request: ParaphraseRequest
): Promise<ParaphraseResponse> {
  // Block cloud calls when local-only mode is enabled
  if (!useSettingsStore.getState().cloudEnabled) {
    throw new Error('Облачное перефразирование отключено. Включите его в настройках.');
  }

  const raw = await apiPost<any>(
    '/v1/paraphrase',
    {
      text: request.text,
      mode: request.mode,
      preserve_english: request.preserveEnglish ?? true,
      max_length: request.maxLength,
    },
    { timeout: 120000 }, // 120s timeout — LLM calls can be slow
    LLM_RETRY_CONFIG
  );

  // Map from backend (snake_case) or Edge Function (camelCase/different keys)
  return {
    requestId: raw.request_id ?? '',
    inputText: raw.input_text ?? raw.original ?? '',
    outputText: raw.output_text ?? raw.paraphrased ?? '',
    diff: raw.diff ?? [],
    processingTimeMs: raw.processing_time_ms ?? 0,
    warnings: raw.warnings,
  };
}

/**
 * Send grammar check request to backend
 */
export async function checkText(
  request: ParaphraseRequest
): Promise<ParaphraseResponse> {
  // Block cloud calls when local-only mode is enabled
  if (!useSettingsStore.getState().cloudEnabled) {
    throw new Error('Облачное перефразирование отключено. Включите его в настройках.');
  }

  const raw = await apiPost<any>(
    '/v1/check',
    {
      text: request.text,
      mode: request.mode,
      preserve_english: request.preserveEnglish ?? true,
    },
    undefined,
    LLM_RETRY_CONFIG
  );

  return {
    requestId: raw.request_id ?? '',
    inputText: raw.input_text ?? raw.original ?? '',
    outputText: raw.output_text ?? raw.corrected ?? '',
    diff: raw.diff ?? [],
    processingTimeMs: raw.processing_time_ms ?? 0,
    warnings: raw.warnings,
  };
}

/**
 * Get remaining quota for current user
 */
export interface QuotaResponse {
  used: number;
  limit: number;
  resetAt: string | null;
  tier: 'free' | 'pro';
}

export async function getQuota(): Promise<QuotaResponse> {
  return apiGet<QuotaResponse>('/v1/user/quota');
}
