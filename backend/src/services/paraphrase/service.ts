/**
 * Paraphrase Service
 * Main service that orchestrates paraphrasing workflow
 * 
 * Server Responsibilities:
 * 1. JWT validation (handled by auth plugin)
 * 2. Subscription verification
 * 3. Quota management & rate limiting
 * 4. PII masking before LLM
 * 5. Text hash for deduplication
 * 6. LLM proxy (all calls through backend)
 * 7. Diff generation
 * 8. Token accounting
 * 9. Metadata-only logging
 */

import { randomUUID } from 'crypto';
import { createHash } from 'crypto';
import { maskPII, unmaskPII } from '../pii/masker.js';
import { callLLMWithBreaker } from '../llm/circuit-breaker.js';
import { computeDiff, type DiffSegment } from './diff.js';
import { getCachedResult, setCachedResult } from '../cache/paraphrase-cache.js';
import logger from '../logging/logger.js';
import type { ParaphraseMode } from '../llm/prompts.js';

export interface ParaphraseInput {
  userId: string;
  text: string;
  mode: ParaphraseMode;
  preserveEnglish?: boolean;
  maxLength?: number;
}

export interface ParaphraseOutput {
  requestId: string;
  inputText: string;
  outputText: string;
  diff: DiffSegment[];
  processingTimeMs: number;
  warnings: string[];
  tokensUsed: number;
  cached: boolean;
}

/**
 * Main paraphrase function
 * Handles full workflow with PII masking and caching
 */
export async function paraphrase(input: ParaphraseInput): Promise<ParaphraseOutput> {
  const startTime = Date.now();
  const requestId = randomUUID();
  const warnings: string[] = [];
  const inputHash = hashText(input.text);

  // Log request metadata (NO raw text)
  logger.info({
    event: 'paraphrase_start',
    requestId,
    userId: input.userId,
    mode: input.mode,
    textLength: input.text.length,
    textHash: inputHash,
  });

  // Step 0: Check cache
  const cachedResult = await getCachedResult(input.text, input.mode);
  if (cachedResult) {
    const diff = computeDiff(input.text, cachedResult.outputText);
    const processingTimeMs = Date.now() - startTime;

    logger.info({
      event: 'paraphrase_cached',
      requestId,
      userId: input.userId,
      mode: input.mode,
      processingTimeMs,
    });

    return {
      requestId,
      inputText: input.text,
      outputText: cachedResult.outputText,
      diff,
      processingTimeMs,
      warnings,
      tokensUsed: 0, // No tokens used for cached result
      cached: true,
    };
  }

  // Step 1: Mask PII
  const maskingResult = maskPII(input.text);
  if (maskingResult.replacements.length > 0) {
    logger.info({
      event: 'pii_masked',
      requestId,
      maskedCount: maskingResult.replacements.length,
      types: [...new Set(maskingResult.replacements.map((r) => r.type))],
    });
    warnings.push(`Замаскировано ${maskingResult.replacements.length} персональных данных`);
  }

  // Step 2: Call LLM with masked text
  const llmResponse = await callLLMWithBreaker({
    text: maskingResult.maskedText,
    mode: input.mode,
    maxLength: input.maxLength,
  });

  // Step 3: Unmask PII in response
  let outputText = llmResponse.outputText;
  if (maskingResult.replacements.length > 0) {
    outputText = unmaskPII(outputText, maskingResult.replacements);
  }

  // Step 4: Preserve English words if enabled
  if (input.preserveEnglish) {
    outputText = preserveEnglishWords(input.text, outputText);
  }

  // Step 5: Compute diff
  const diff = computeDiff(input.text, outputText);

  const processingTimeMs = Date.now() - startTime;

  // Step 6: Cache result (async, don't wait)
  setCachedResult(
    input.text,
    input.mode,
    outputText,
    llmResponse.model,
    llmResponse.totalTokens
  ).catch(() => {});

  // Log completion (NO raw text)
  logger.info({
    event: 'paraphrase_complete',
    requestId,
    userId: input.userId,
    mode: input.mode,
    inputLength: input.text.length,
    outputLength: outputText.length,
    processingTimeMs,
    model: llmResponse.model,
    tokensUsed: llmResponse.totalTokens,
  });

  return {
    requestId,
    inputText: input.text,
    outputText,
    diff,
    processingTimeMs,
    warnings,
    tokensUsed: llmResponse.totalTokens,
    cached: false,
  };
}

/**
 * Hash text for deduplication/caching
 */
function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex').substring(0, 16);
}

/**
 * Preserve English words from input in output
 */
function preserveEnglishWords(input: string, output: string): string {
  const englishPattern = /\b[a-zA-Z][a-zA-Z0-9]*\b/g;
  const englishWords = new Set(input.match(englishPattern) || []);

  if (englishWords.size === 0) return output;

  // Find English words in output and ensure they match input
  // This is a simplified implementation
  let result = output;

  for (const word of englishWords) {
    const pattern = new RegExp(`\\b${word}\\b`, 'gi');
    result = result.replace(pattern, word);
  }

  return result;
}

export default { paraphrase };
