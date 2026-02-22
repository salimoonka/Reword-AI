/**
 * Check Route - POST /v1/check
 * Server-side grammar and spelling check
 */

import { FastifyPluginAsync } from 'fastify';
import { createHash } from 'crypto';
import { z } from 'zod';
import { maskPII, unmaskPII } from '../../services/pii/masker.js';
import { callLLMWithBreaker } from '../../services/llm/circuit-breaker.js';
import { computeDiff, type DiffSegment } from '../../services/paraphrase/diff.js';
import { hasQuota, logUsage, getQuotaInfo } from '../../services/quota/service.js';
import logger from '../../services/logging/logger.js';

// Request schema
const checkRequestSchema = z.object({
  text: z
    .string()
    .min(1, 'Text is required')
    .max(10000, 'Text must be less than 10000 characters'),
});

const checkRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post('/check', async (request, reply) => {
    const userId = request.userId;

    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    // Validate request body
    const parseResult = checkRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      logger.warn({
        event: 'validation_error',
        userId,
        errors: parseResult.error.issues,
      });
      return reply.status(400).send({
        error: 'Validation error',
        details: parseResult.error.issues,
      });
    }

    const { text } = parseResult.data;
    const inputHash = createHash('sha256').update(text).digest('hex').substring(0, 16);
    const startTime = Date.now();

    try {
      // Check quota before proceeding
      const quotaOk = await hasQuota(userId);
      if (!quotaOk) {
        const quotaInfo = await getQuotaInfo(userId);
        return reply.status(429).send({
          error: 'Quota exceeded',
          message: 'Вы исчерпали дневной лимит',
          quota: {
            limit: quotaInfo.dailyLimit,
            used: quotaInfo.dailyUsed,
            reset_at: quotaInfo.resetAt.toISOString(),
          },
        });
      }

      // Mask PII before sending to LLM
      const maskingResult = maskPII(text);

      // Call LLM for grammar check
      const llmResponse = await callLLMWithBreaker({
        text: maskingResult.maskedText,
        mode: 'formal', // Use formal mode for grammar check
        maxLength: text.length + 500, // Allow slight expansion for corrections
      });

      // Unmask PII in response
      let correctedText = llmResponse.outputText;
      if (maskingResult.replacements.length > 0) {
        correctedText = unmaskPII(correctedText, maskingResult.replacements);
      }

      // Compute diff between original and corrected
      const diff = computeDiff(text, correctedText);

      // Count corrections (non-equal segments)
      const corrections = diff.filter(
        (segment: DiffSegment) => segment.type !== 'equal'
      );

      const processingTimeMs = Date.now() - startTime;

      // Log usage
      await logUsage(userId, {
        requestId: inputHash,
        action: 'check',
        inputLength: text.length,
        outputLength: correctedText.length,
        inputHash,
        totalTokens: llmResponse.totalTokens,
        latencyMs: processingTimeMs,
        cached: false,
        success: true,
      });

      logger.info({
        event: 'check_complete',
        userId,
        inputLength: text.length,
        correctionsCount: corrections.length,
        processingTimeMs,
      });

      return reply.status(200).send({
        request_id: inputHash,
        input_text: text,
        output_text: correctedText,
        corrected_text: correctedText,
        diff,
        corrections_count: corrections.length,
        processing_time_ms: processingTimeMs,
        has_errors: corrections.length > 0,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error({
        event: 'check_error',
        userId,
        error: errorMessage,
      });

      // Log failed attempt
      await logUsage(userId, {
        requestId: 'failed',
        action: 'check',
        inputLength: text.length,
        inputHash,
        success: false,
        errorCode: errorMessage.includes('temporarily unavailable')
          ? 'SERVICE_UNAVAILABLE'
          : 'INTERNAL_ERROR',
      });

      if (errorMessage.includes('temporarily unavailable')) {
        return reply.status(503).send({ error: errorMessage });
      }

      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

export default checkRoute;
