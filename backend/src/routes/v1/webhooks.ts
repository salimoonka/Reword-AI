/**
 * YooKassa Webhook Route
 * Handles payment notifications from YooKassa
 * POST /v1/webhooks/yookassa
 */

import { FastifyPluginAsync } from 'fastify';
import { createHmac } from 'crypto';
import { supabaseAdmin } from '../../services/supabase/client.js';
import { updateSubscription } from '../../services/subscription/service.js';
import logger from '../../services/logging/logger.js';
import config from '../../config.js';

// YooKassa official notification IP ranges (https://yookassa.ru/developers/using-api/webhooks)
const YOOKASSA_IP_RANGES = [
  '185.71.76.',
  '185.71.77.',
  '77.75.153.',
  '77.75.156.',
  '77.75.157.',
  '2a02:5180:',
];

/**
 * Verify the webhook originated from YooKassa by checking the source IP.
 * Returns true when the IP belongs to a known YooKassa range or when
 * running behind a trusted proxy that sets X-Forwarded-For.
 */
function isYooKassaIP(ip: string | undefined): boolean {
  if (!ip) return false;
  // Strip IPv6-mapped IPv4 prefix
  const normalizedIp = ip.replace('::ffff:', '');
  return YOOKASSA_IP_RANGES.some((prefix) => normalizedIp.startsWith(prefix));
}

/**
 * Verify YooKassa webhook notification authenticity using HMAC-SHA256.
 * YooKassa signs the request body with the secret key from the shop settings.
 */
function verifyYooKassaSignature(
  rawBody: string,
  signature: string | undefined,
  secretKey: string
): boolean {
  if (!signature || !secretKey) return false;
  const expectedSignature = createHmac('sha256', secretKey)
    .update(rawBody)
    .digest('hex');
  // Timing-safe comparison
  if (signature.length !== expectedSignature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < signature.length; i++) {
    mismatch |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }
  return mismatch === 0;
}

// Webhook event types from YooKassa
interface YooKassaWebhookBody {
  type: 'notification';
  event: string;
  object: {
    id: string;
    status: string;
    amount: {
      value: string;
      currency: string;
    };
    metadata?: Record<string, string>;
    payment_method?: {
      type: string;
      id: string;
    };
    paid: boolean;
    test: boolean;
  };
}

// Plan to period mapping
const PLAN_PERIODS: Record<string, number> = {
  pro_monthly: 30,
  pro_yearly: 365,
};

const webhooksRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post('/webhooks/yookassa', {
    config: {
      // Skip auth for webhooks — verified by IP / idempotency
      skipAuth: true,
    },
    schema: {
      body: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          event: { type: 'string' },
          object: { type: 'object' },
        },
      },
    },
    handler: async (request, reply) => {
      // ── Security: verify webhook authenticity ──────────────────
      const callerIp = request.ip;
      const signature = request.headers['x-yookassa-signature'] as string | undefined;
      const secretKey = config.yookassa.secretKey;

      // 1. IP allow-list check (primary defence)
      if (config.nodeEnv === 'production' && !isYooKassaIP(callerIp)) {
        logger.warn({
          event: 'yookassa_webhook_rejected_ip',
          ip: callerIp,
        });
        return reply.status(403).send({ error: 'Forbidden' });
      }

      // 2. HMAC signature check (secondary defence, when secret is configured)
      if (secretKey) {
        const rawBody = JSON.stringify(request.body);
        if (!verifyYooKassaSignature(rawBody, signature, secretKey)) {
          logger.warn({
            event: 'yookassa_webhook_invalid_signature',
            ip: callerIp,
          });
          return reply.status(403).send({ error: 'Invalid signature' });
        }
      }

      const body = request.body as YooKassaWebhookBody;

      logger.info({
        event: 'yookassa_webhook_received',
        webhookEvent: body.event,
        paymentId: body.object?.id,
        status: body.object?.status,
      });

      // Only process payment.succeeded events
      if (body.event !== 'payment.succeeded') {
        // Log other events but return OK
        logger.info({
          event: 'yookassa_webhook_ignored',
          webhookEvent: body.event,
          paymentId: body.object?.id,
        });
        return reply.status(200).send({ status: 'ok' });
      }

      const payment = body.object;
      const paymentId = payment.id;
      const userId = payment.metadata?.user_id;
      const plan = payment.metadata?.plan;

      if (!userId || !plan) {
        logger.error({
          event: 'yookassa_webhook_missing_metadata',
          paymentId,
          metadata: payment.metadata,
        });
        return reply.status(200).send({ status: 'ok' });
      }

      try {
        // 1. Idempotency check — skip if already processed
        const { data: existingPayment } = await supabaseAdmin
          .from('external_payments')
          .select('processed')
          .eq('yookassa_payment_id', paymentId)
          .single();

        if (existingPayment?.processed) {
          logger.info({
            event: 'yookassa_webhook_already_processed',
            paymentId,
            userId,
          });
          return reply.status(200).send({ status: 'ok' });
        }

        // 2. Update external_payments record
        await supabaseAdmin
          .from('external_payments')
          .update({
            yookassa_status: 'succeeded',
            webhook_received_at: new Date().toISOString(),
            webhook_event: body.event,
            processed: true,
            processed_at: new Date().toISOString(),
          })
          .eq('yookassa_payment_id', paymentId);

        // 3. Activate subscription
        const periodDays = PLAN_PERIODS[plan] || 30;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + periodDays);

        const success = await updateSubscription(userId, {
          status: 'active',
          plan: plan as 'pro_monthly' | 'pro_yearly',
          store: 'external',
          storeProductId: `yookassa_${plan}`,
          storeTransactionId: paymentId,
          expiresAt,
          priceAmount: parseFloat(payment.amount.value),
          priceCurrency: payment.amount.currency,
        });

        if (success) {
          logger.info({
            event: 'yookassa_subscription_activated',
            userId,
            plan,
            paymentId,
            expiresAt: expiresAt.toISOString(),
          });
        } else {
          logger.error({
            event: 'yookassa_subscription_activation_failed',
            userId,
            plan,
            paymentId,
          });
        }

        return reply.status(200).send({ status: 'ok' });
      } catch (error) {
        logger.error({
          event: 'yookassa_webhook_error',
          paymentId,
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        // Return 200 to prevent YooKassa from retrying
        // (we log the error for manual investigation)
        return reply.status(200).send({ status: 'error' });
      }
    },
  });
};

export default webhooksRoute;
