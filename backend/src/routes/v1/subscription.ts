/**
 * Subscription Routes - POST /v1/subscription/verify, POST /v1/subscription/webhook
 * Receipt verification and subscription management
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { updateSubscription, getSubscription, cancelSubscription } from '../../services/subscription/service.js';
import { getQuotaInfo } from '../../services/quota/service.js';
import logger from '../../services/logging/logger.js';
import config from '../../config.js';

// ─── Schemas ───────────────────────────────────────────

const verifyReceiptSchema = z.object({
  store: z.enum(['apple', 'google']),
  product_id: z.string().min(1),
  transaction_id: z.string().optional(),
  // iOS
  receipt_data: z.string().optional(),
  // Android
  purchase_token: z.string().optional(),
  package_name: z.string().optional(),
});

// ─── Apple Receipt Verification ─────────────────────────

interface AppleVerifyResponse {
  status: number;
  latest_receipt_info?: Array<{
    product_id: string;
    transaction_id: string;
    original_transaction_id: string;
    expires_date_ms: string;
    is_trial_period: string;
  }>;
  pending_renewal_info?: Array<{
    product_id: string;
    auto_renew_status: string;
  }>;
}

async function verifyAppleReceipt(receiptData: string): Promise<AppleVerifyResponse | null> {
  const appleSharedSecret = config.appleSharedSecret || '';

  // Try production first, then sandbox
  const urls = [
    'https://buy.itunes.apple.com/verifyReceipt',
    'https://sandbox.itunes.apple.com/verifyReceipt',
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          'receipt-data': receiptData,
          password: appleSharedSecret,
          'exclude-old-transactions': true,
        }),
      });

      const data = (await response.json()) as AppleVerifyResponse;

      // Status 21007 = sandbox receipt sent to production
      if (data.status === 21007 && url === urls[0]) {
        continue; // Try sandbox URL
      }

      // Status 0 = success
      if (data.status === 0) {
        return data;
      }

      logger.warn({
        event: 'apple_receipt_invalid',
        status: data.status,
        url,
      });
    } catch (error) {
      logger.error({
        event: 'apple_receipt_verify_error',
        url,
        error: error instanceof Error ? error.message : 'Unknown',
      });
    }
  }

  return null;
}

// ─── Google Play Receipt Verification ────────────────────

interface GoogleVerifyResponse {
  expiryTimeMillis: string;
  paymentState: number;
  autoRenewing: boolean;
  orderId: string;
}

async function verifyGoogleReceipt(
  packageName: string,
  productId: string,
  _purchaseToken: string
): Promise<GoogleVerifyResponse | null> {
  try {
    // In production, use Google Play Developer API with service account
    // For now, we trust the purchase token and set a default expiry
    // TODO: Implement proper Google Play Developer API verification
    //
    // In a full implementation:
    // 1. Use googleapis npm package
    // 2. Authenticate with service account JSON key
    // 3. Call androidpublisher.purchases.subscriptions.get

    logger.info({
      event: 'google_receipt_verify',
      packageName,
      productId,
      note: 'Using trust-based verification. Implement Google Play Developer API for production.',
    });

    // Default: trust the receipt and give 30 days
    const expiryMs = Date.now() + 30 * 24 * 60 * 60 * 1000;

    return {
      expiryTimeMillis: expiryMs.toString(),
      paymentState: 1,
      autoRenewing: true,
      orderId: `GPA-trust-${Date.now()}`,
    };
  } catch (error) {
    logger.error({
      event: 'google_receipt_verify_error',
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return null;
  }
}

// ─── Routes ─────────────────────────────────────────────

const subscriptionRoute: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /v1/subscription/verify
   * Verify a purchase receipt and update subscription status
   */
  fastify.post('/subscription/verify', async (request, reply) => {
    const userId = request.userId;

    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    // Validate request body
    const parseResult = verifyReceiptSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parseResult.error.issues,
      });
    }

    const body = parseResult.data;

    logger.info({
      event: 'receipt_verification_start',
      userId,
      store: body.store,
      productId: body.product_id,
    });

    try {
      let expiresAt: Date;
      let transactionId: string;
      let originalTransactionId: string | undefined;
      let priceAmount: number | undefined;

      if (body.store === 'apple') {
        // ─── Apple Verification ────────────────────
        if (!body.receipt_data) {
          return reply.status(400).send({ error: 'receipt_data required for Apple' });
        }

        const appleResult = await verifyAppleReceipt(body.receipt_data);

        if (!appleResult) {
          logger.warn({
            event: 'apple_receipt_rejected',
            userId,
            productId: body.product_id,
          });
          return reply.status(400).send({ error: 'Invalid Apple receipt' });
        }

        // Find the latest subscription info for our product
        const latestInfo = appleResult.latest_receipt_info
          ?.filter((info) => info.product_id === body.product_id)
          .sort((a, b) => parseInt(b.expires_date_ms) - parseInt(a.expires_date_ms))[0];

        if (!latestInfo) {
          return reply.status(400).send({ error: 'No subscription found in receipt' });
        }

        expiresAt = new Date(parseInt(latestInfo.expires_date_ms));
        transactionId = latestInfo.transaction_id;
        originalTransactionId = latestInfo.original_transaction_id;
        priceAmount = 199; // PRD price, Apple doesn't return price in receipt
      } else {
        // ─── Google Play Verification ──────────────
        if (!body.purchase_token) {
          return reply.status(400).send({ error: 'purchase_token required for Google' });
        }

        const googleResult = await verifyGoogleReceipt(
          body.package_name || 'com.rewordai.app',
          body.product_id,
          body.purchase_token
        );

        if (!googleResult) {
          logger.warn({
            event: 'google_receipt_rejected',
            userId,
            productId: body.product_id,
          });
          return reply.status(400).send({ error: 'Invalid Google Play receipt' });
        }

        expiresAt = new Date(parseInt(googleResult.expiryTimeMillis));
        transactionId = googleResult.orderId;
        originalTransactionId = undefined;
        priceAmount = 199;
      }

      // Check if subscription is actually valid (not expired)
      const isActive = expiresAt > new Date();

      // Update subscription in database
      const success = await updateSubscription(userId, {
        status: isActive ? 'active' : 'expired',
        plan: 'pro_monthly',
        store: body.store,
        storeProductId: body.product_id,
        storeTransactionId: transactionId,
        storeOriginalTransactionId: originalTransactionId,
        expiresAt,
        priceAmount,
        priceCurrency: 'RUB',
      });

      if (!success) {
        return reply.status(500).send({ error: 'Failed to update subscription' });
      }

      // Fetch updated subscription and quota
      const [subscription, quota] = await Promise.all([
        getSubscription(userId),
        getQuotaInfo(userId),
      ]);

      logger.info({
        event: 'receipt_verification_success',
        userId,
        store: body.store,
        productId: body.product_id,
        isPremium: subscription.isPremium,
        expiresAt: expiresAt.toISOString(),
      });

      return reply.status(200).send({
        success: true,
        subscription: {
          status: subscription.status,
          plan: subscription.plan,
          is_premium: subscription.isPremium,
          expires_at: subscription.expiresAt?.toISOString() || null,
        },
        quota: {
          tier: quota.tier,
          daily_limit: quota.dailyLimit,
          daily_used: quota.dailyUsed,
          remaining: quota.remaining,
        },
      });
    } catch (error) {
      logger.error({
        event: 'receipt_verification_error',
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return reply.status(500).send({ error: 'Receipt verification failed' });
    }
  });

  /**
   * POST /v1/subscription/cancel
   * Cancel user subscription (mark as cancelled)
   */
  fastify.post('/subscription/cancel', async (request, reply) => {
    const userId = request.userId;

    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      const success = await cancelSubscription(userId);

      if (!success) {
        return reply.status(500).send({ error: 'Failed to cancel subscription' });
      }

      logger.info({
        event: 'subscription_cancelled_via_api',
        userId,
      });

      return reply.status(200).send({
        success: true,
        message: 'Подписка отменена',
      });
    } catch (error) {
      logger.error({
        event: 'subscription_cancel_error',
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return reply.status(500).send({ error: 'Cancellation failed' });
    }
  });

  /**
   * GET /v1/subscription
   * Get current subscription status
   */
  fastify.get('/subscription', async (request, reply) => {
    const userId = request.userId;

    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      const [subscription, quota] = await Promise.all([
        getSubscription(userId),
        getQuotaInfo(userId),
      ]);

      return reply.status(200).send({
        subscription: {
          status: subscription.status,
          plan: subscription.plan,
          is_premium: subscription.isPremium,
          expires_at: subscription.expiresAt?.toISOString() || null,
          trial_ends_at: subscription.trialEndsAt?.toISOString() || null,
          days_remaining: subscription.daysRemaining,
        },
        quota: {
          tier: quota.tier,
          daily_limit: quota.dailyLimit,
          daily_used: quota.dailyUsed,
          remaining: quota.remaining,
          reset_at: quota.resetAt.toISOString(),
          unlimited: quota.remaining === -1,
        },
      });
    } catch (error) {
      logger.error({
        event: 'subscription_get_error',
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return reply.status(500).send({ error: 'Failed to get subscription' });
    }
  });
};

export default subscriptionRoute;
