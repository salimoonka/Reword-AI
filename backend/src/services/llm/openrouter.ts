/**
 * OpenRouter LLM Integration
 * Server-side proxy for LLM calls - NO API KEYS ON CLIENT
 * Optimized for SPEED with quality fallback
 */

import OpenAI from 'openai';
import config from '../../config.js';
import logger from '../logging/logger.js';
import { buildPrompt, SYSTEM_PROMPT, type ParaphraseMode } from './prompts.js';

// OpenRouter client (OpenAI-compatible API)
const openrouter = new OpenAI({
  apiKey: config.openRouter.apiKey,
  baseURL: config.openRouter.baseUrl,
  timeout: 45000, // 45 second timeout per LLM call
  defaultHeaders: {
    'HTTP-Referer': 'https://rewordai.app',
    'X-Title': 'Reword AI',
  },
});

/**
 * Model Priority (fastest to best quality):
 * 1. DeepSeek Chat (very fast, good quality, cheap)
 * 2. DeepSeek R1 Free (free but rate limited)
 * 3. GPT-4o-mini as ultimate fallback
 */
const PRIMARY_MODEL = 'deepseek/deepseek-chat'; // Fast and cheap: $0.14/M input, $0.28/M output
const FALLBACK_MODEL = 'deepseek/deepseek-r1-0528:free'; // Free but rate-limited
const ULTIMATE_FALLBACK = 'openai/gpt-4o-mini'; // Reliable fallback

export interface LLMRequest {
  text: string;
  mode: ParaphraseMode;
  maxLength?: number;
}

export interface LLMResponse {
  outputText: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  processingTimeMs: number;
}

/**
 * Call LLM for paraphrasing - optimized for speed
 */
export async function callLLM(request: LLMRequest): Promise<LLMResponse> {
  const startTime = Date.now();
  const userPrompt = buildPrompt(request.text, request.mode);
  
  // Calculate reasonable max tokens based on input (2x input length, min 256, max 1024)
  const estimatedTokens = Math.ceil(request.text.length / 4);
  const maxTokens = Math.min(1024, Math.max(256, estimatedTokens * 2));

  try {
    const response = await openrouter.chat.completions.create({
      model: PRIMARY_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3, // Slightly higher for natural variation
      max_tokens: maxTokens,
      top_p: 0.95,
    });

    const outputText = response.choices[0]?.message?.content || '';
    const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    logger.info({
      event: 'llm_call_success',
      model: PRIMARY_MODEL,
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      processingTimeMs: Date.now() - startTime,
    });

    return {
      outputText: cleanOutput(outputText),
      model: PRIMARY_MODEL,
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    logger.warn({
      event: 'llm_primary_failed',
      model: PRIMARY_MODEL,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Try fallback models
    return callFallbackLLM(request, userPrompt, maxTokens, startTime);
  }
}

/**
 * Fallback chain for reliability
 */
async function callFallbackLLM(
  _request: LLMRequest, 
  userPrompt: string, 
  maxTokens: number,
  startTime: number
): Promise<LLMResponse> {
  // Try models in order
  const fallbackModels = [FALLBACK_MODEL, ULTIMATE_FALLBACK];
  
  for (const model of fallbackModels) {
    try {
      const response = await openrouter.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: maxTokens,
        top_p: 0.95,
      });

      const outputText = response.choices[0]?.message?.content || '';
      const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

      logger.info({
        event: 'llm_fallback_success',
        model,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        processingTimeMs: Date.now() - startTime,
      });

      return {
        outputText: cleanOutput(outputText),
        model,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      logger.warn({
        event: 'llm_fallback_failed',
        model,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Continue to next fallback
    }
  }

  logger.error({
    event: 'llm_all_models_failed',
    processingTimeMs: Date.now() - startTime,
  });

  throw new Error('LLM service unavailable');
}

/**
 * Clean LLM output - aggressively strip any meta-commentary
 */
function cleanOutput(text: string): string {
  let cleaned = text.trim();

  // Remove leading intro lines like "Вот более тёплый вариант:" etc.
  // Match any line that looks like an intro (contains "вот", "вариант", "результат", etc.) followed by colon/newline
  cleaned = cleaned.replace(
    /^(?:вот[^\n]*?(?:вариант|текст|версия)[^\n]*?[:：]\s*\n?)/i,
    '',
  ).trim();

  // Remove common leading prefixes
  cleaned = cleaned.replace(
    /^(?:Перефразированный текст|Результат|Вот перефразированный текст|Вот (?:более )?[\wа-яё]+ (?:и )?[\wа-яё]* ?вариант|Вот результат|Вот текст)\s*[:：]\s*/i,
    '',
  ).trim();

  // Remove trailing meta-commentary (lines starting with common commentary patterns)
  // e.g. "Так звучит мягче, заботливее..." or "Надеюсь, поможет"
  cleaned = cleaned.replace(
    /\n\s*(?:Так (?:звучит|выглядит|получается)|Надеюсь|Этот вариант|Данный вариант|Я (?:постарал|изменил|переписал)|P\.?S\.?|Примечание)[^\n]*$/gi,
    '',
  ).trim();

  // Remove surrounding quotes
  cleaned = cleaned.replace(/^["'«]|["'»]$/g, '').trim();

  // Remove trailing emoji-only lines
  cleaned = cleaned.replace(/\n\s*[\p{Emoji}\s]+$/u, '').trim();

  return cleaned;
}

export default { callLLM };
