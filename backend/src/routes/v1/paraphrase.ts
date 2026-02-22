/**
 * Paraphrase Route - POST /v1/paraphrase
 */

import { FastifyPluginAsync } from 'fastify';
import { createHash } from 'crypto';
import { paraphraseRequestSchema } from '../../schemas/paraphrase.js';
import { paraphrase } from '../../services/paraphrase/service.js';
import { hasQuota, logUsage, getQuotaInfo } from '../../services/quota/service.js';
import logger from '../../services/logging/logger.js';

const paraphraseRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post('/paraphrase', async (request, reply) => {
    const userId = request.userId;

    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    // Validate request body
    const parseResult = paraphraseRequestSchema.safeParse(request.body);
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

    const { text, mode, preserve_english, max_length } = parseResult.data;
    const inputHash = createHash('sha256').update(text).digest('hex').substring(0, 16);

    try {
      // Check quota before proceeding
      const quotaOk = await hasQuota(userId);
      if (!quotaOk) {
        const quotaInfo = await getQuotaInfo(userId);
        logger.warn({
          event: 'quota_exceeded',
          userId,
          tier: quotaInfo.tier,
          dailyUsed: quotaInfo.dailyUsed,
        });
        return reply.status(429).send({ 
          error: 'Quota exceeded',
          message: 'Вы исчерпали дневной лимит бесплатных перефразирований',
          quota: {
            limit: quotaInfo.dailyLimit,
            used: quotaInfo.dailyUsed,
            reset_at: quotaInfo.resetAt.toISOString(),
          },
        });
      }

      // Call paraphrase service
      const result = await paraphrase({
        userId,
        text,
        mode,
        preserveEnglish: preserve_english,
        maxLength: max_length,
      });

      // Log usage after successful paraphrase
      await logUsage(userId, {
        requestId: result.requestId,
        action: 'paraphrase',
        mode,
        inputLength: text.length,
        outputLength: result.outputText.length,
        inputHash,
        totalTokens: result.tokensUsed,
        latencyMs: result.processingTimeMs,
        cached: result.cached,
        success: true,
      });

      return reply.status(200).send({
        request_id: result.requestId,
        input_text: result.inputText,
        output_text: result.outputText,
        diff: result.diff,
        processing_time_ms: result.processingTimeMs,
        warnings: result.warnings.length > 0 ? result.warnings : undefined,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error({
        event: 'paraphrase_error',
        userId,
        error: errorMessage,
      });

      // Log failed attempt
      await logUsage(userId, {
        requestId: 'failed',
        action: 'paraphrase',
        mode,
        inputLength: text.length,
        inputHash,
        success: false,
        errorCode: errorMessage.includes('temporarily unavailable') ? 'SERVICE_UNAVAILABLE' : 'INTERNAL_ERROR',
      });

      if (errorMessage.includes('temporarily unavailable')) {
        return reply.status(503).send({ error: errorMessage });
      }

      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

export default paraphraseRoute;
