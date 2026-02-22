/**
 * Circuit Breaker for LLM Service
 * Prevents cascade failures when LLM service is down
 */

import CircuitBreaker from 'opossum';
import { callLLM, type LLMRequest, type LLMResponse } from './openrouter.js';
import logger from '../logging/logger.js';

// Circuit breaker options
const options = {
  timeout: 30000, // 30 seconds timeout
  errorThresholdPercentage: 50, // Open circuit when 50% of requests fail
  resetTimeout: 30000, // Try again after 30 seconds
  volumeThreshold: 5, // Minimum requests before tripping
};

// Create circuit breaker around LLM call
export const llmCircuitBreaker = new CircuitBreaker(
  async (request: LLMRequest) => callLLM(request),
  options
);

// Event handlers
llmCircuitBreaker.on('open', () => {
  logger.warn({ event: 'circuit_breaker_open', service: 'llm' });
});

llmCircuitBreaker.on('halfOpen', () => {
  logger.info({ event: 'circuit_breaker_half_open', service: 'llm' });
});

llmCircuitBreaker.on('close', () => {
  logger.info({ event: 'circuit_breaker_close', service: 'llm' });
});

llmCircuitBreaker.on('fallback', () => {
  logger.warn({ event: 'circuit_breaker_fallback', service: 'llm' });
});

// Fallback response when circuit is open
llmCircuitBreaker.fallback(() => {
  throw new Error('LLM service temporarily unavailable. Please try again later.');
});

/**
 * Call LLM with circuit breaker protection
 */
export async function callLLMWithBreaker(request: LLMRequest): Promise<LLMResponse> {
  return llmCircuitBreaker.fire(request);
}

export default { callLLMWithBreaker, llmCircuitBreaker };
