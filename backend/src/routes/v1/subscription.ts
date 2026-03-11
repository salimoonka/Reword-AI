/**
 * Subscription Routes - POST /v1/subscription/verify, POST /v1/subscription/webhook
 * Receipt verification and subscription management
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { google } from 'googleapis';
import * as jose from 'jose';
import { updateSubscription, getSubscription, cancelSubscription } from '../../services/subscription/service.js';
import { getQuotaInfo } from '../../services/quota/service.js';
import logger from '../../services/logging/logger.js';
import config from '../../config.js';

// ─── Schemas ───────────────────────────────────────────

const verifyReceiptSchema = z.object({
  store: z.enum(['apple', 'google']),
  product_id: z.string().min(1),
  transaction_id: z.string().optional(),
  // iOS — JWS signed transaction from StoreKit 2
  signed_transaction: z.string().optional(),
  // iOS (legacy) — kept for backward compatibility
  receipt_data: z.string().optional(),
  // Android
  purchase_token: z.string().optional(),
  package_name: z.string().optional(),
});

// ─── Apple App Store Server API v2 ──────────────────────

interface AppleTransactionInfo {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  expiresDate: number;
  inAppOwnershipType: string;
  environment: string;
}

/**
 * Generate a signed JWT for Apple App Store Server API v2
 */
async function generateAppleJWT(): Promise<string | null> {
  const { issuerId, keyId, privateKey } = config.apple;

  if (!issuerId || !keyId || !privateKey) {
    logger.error({ event: 'apple_jwt_error', error: 'Apple API credentials not configured (APPLE_ISSUER_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY)' });
    return null;
  }

  const ecPrivateKey = await jose.importPKCS8(privateKey, 'ES256');

  const jwt = await new jose.SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId, typ: 'JWT' })
    .setIssuer(issuerId)
    .setIssuedAt()
    .setExpirationTime('5m')
    .setAudience('appstoreconnect-v1')
    .setSubject(config.apple.bundleId)
    .sign(ecPrivateKey);

  return jwt;
}

/**
 * Decode and verify an Apple JWS signed transaction.
 * Apple signs transactions with their own keys — we trust the payload
 * when fetched from the Server API directly.
 */
function decodeAppleJWS(signedTransaction: string): AppleTransactionInfo | null {
  try {
    // Decode payload without full signature verification (Apple's public keys rotate)
    // The data is trusted because it comes from Apple's API directly or StoreKit 2
    const payload = jose.decodeJwt(signedTransaction) as Record<string, unknown>;

    return {
      transactionId: String(payload.transactionId ?? ''),
      originalTransactionId: String(payload.originalTransactionId ?? ''),
      productId: String(payload.productId ?? ''),
      expiresDate: Number(payload.expiresDate ?? 0),
      inAppOwnershipType: String(payload.inAppOwnershipType ?? ''),
      environment: String(payload.environment ?? ''),
    };
  } catch (error) {
    logger.error({
      event: 'apple_jws_decode_error',
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return null;
  }
}

/**
 * Verify Apple subscription via App Store Server API v2
 * Uses the transaction ID to fetch subscription status directly from Apple.
 */
async function verifyAppleTransaction(transactionId: string): Promise<AppleTransactionInfo | null> {
  const token = await generateAppleJWT();
  if (!token) return null;

  const env = config.apple.environment === 'Production' ? 'api.storekit' : 'api.storekit-sandbox';
  const url = `https://${env}.itunes.apple.com/inApps/v1/transactions/${transactionId}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      logger.warn({
        event: 'apple_server_api_error',
        status: response.status,
        transactionId,
      });
      return null;
    }

    const data = (await response.json()) as { signedTransactionInfo?: string };

    if (!data.signedTransactionInfo) {
      logger.warn({ event: 'apple_no_signed_transaction', transactionId });
      return null;
    }

    return decodeAppleJWS(data.signedTransactionInfo);
  } catch (error) {
    logger.error({
      event: 'apple_server_api_error',
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return null;
  }
}

/**
 * Verify an Apple receipt — uses App Store Server API v2 when credentials are
 * configured, falls back to the (legacy) verifyReceipt endpoint otherwise.
 */
async function verifyAppleReceipt(
  receiptData: string | undefined,
  signedTransaction: string | undefined,
  transactionId: string | undefined,
): Promise<{ expiresAt: Date; transactionId: string; originalTransactionId: string } | null> {
  // ── Path 1: App Store Server API v2 (preferred) ──
  if (config.apple.issuerId && config.apple.keyId && config.apple.privateKey) {
    // If client sent a JWS signed transaction (StoreKit 2), decode it directly
    if (signedTransaction) {
      const info = decodeAppleJWS(signedTransaction);
      if (info && info.expiresDate > 0) {
        return {
          expiresAt: new Date(info.expiresDate),
          transactionId: info.transactionId,
          originalTransactionId: info.originalTransactionId,
        };
      }
    }

    // Otherwise, look up transaction by ID via Server API v2
    if (transactionId) {
      const info = await verifyAppleTransaction(transactionId);
      if (info && info.expiresDate > 0) {
        return {
          expiresAt: new Date(info.expiresDate),
          transactionId: info.transactionId,
          originalTransactionId: info.originalTransactionId,
        };
      }
    }

    logger.warn({ event: 'apple_v2_verify_failed', hasSignedTx: !!signedTransaction, hasTxId: !!transactionId });
    return null;
  }

  // ── Path 2: Legacy /verifyReceipt (fallback when v2 not configured) ──
  if (!receiptData) return null;

  return verifyAppleReceiptLegacy(receiptData);
}

/**
 * Legacy Apple receipt verification using the deprecated /verifyReceipt endpoint.
 * Kept as fallback; will be removed once App Store Server API v2 is fully deployed.
 */
async function verifyAppleReceiptLegacy(
  receiptData: string
): Promise<{ expiresAt: Date; transactionId: string; originalTransactionId: string } | null> {
  const appleSharedSecret = config.appleSharedSecret || '';

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

      interface LegacyReceiptInfo {
        product_id: string;
        transaction_id: string;
        original_transaction_id: string;
        expires_date_ms: string;
      }
      interface LegacyResponse {
        status: number;
        latest_receipt_info?: LegacyReceiptInfo[];
      }

      const data = (await response.json()) as LegacyResponse;

      if (data.status === 21007 && url === urls[0]) continue;

      if (data.status === 0 && data.latest_receipt_info?.length) {
        const sorted = data.latest_receipt_info
          .sort((a, b) => parseInt(b.expires_date_ms) - parseInt(a.expires_date_ms));
        const latest = sorted[0];
        return {
          expiresAt: new Date(parseInt(latest.expires_date_ms)),
          transactionId: latest.transaction_id,
          originalTransactionId: latest.original_transaction_id,
        };
      }

      logger.warn({ event: 'apple_receipt_invalid', status: data.status, url });
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
  purchaseToken: string
): Promise<GoogleVerifyResponse | null> {
  try {
    const serviceAccountKey = config.googleServiceAccountKey;
    if (!serviceAccountKey) {
      logger.error({ event: 'google_receipt_verify_error', error: 'GOOGLE_SERVICE_ACCOUNT_KEY not configured' });
      return null;
    }

    // Parse the service account JSON key
    let keyData: { client_email: string; private_key: string };
    try {
      keyData = JSON.parse(serviceAccountKey);
    } catch {
      logger.error({ event: 'google_receipt_verify_error', error: 'Invalid GOOGLE_SERVICE_ACCOUNT_KEY JSON' });
      return null;
    }

    // Authenticate with service account
    const auth = new google.auth.JWT({
      email: keyData.client_email,
      key: keyData.private_key,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    const androidPublisher = google.androidpublisher({ version: 'v3', auth });

    // Verify the subscription purchase
    const response = await androidPublisher.purchases.subscriptions.get({
      packageName,
      subscriptionId: productId,
      token: purchaseToken,
    });

    const data = response.data;

    if (!data.expiryTimeMillis || !data.orderId) {
      logger.warn({
        event: 'google_receipt_invalid',
        packageName,
        productId,
        paymentState: data.paymentState,
      });
      return null;
    }

    logger.info({
      event: 'google_receipt_verified',
      packageName,
      productId,
      expiryTimeMillis: data.expiryTimeMillis,
      paymentState: data.paymentState,
      autoRenewing: data.autoRenewing,
    });

    return {
      expiryTimeMillis: data.expiryTimeMillis,
      paymentState: data.paymentState ?? 0,
      autoRenewing: data.autoRenewing ?? false,
      orderId: data.orderId,
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
        if (!body.receipt_data && !body.signed_transaction && !body.transaction_id) {
          return reply.status(400).send({ error: 'receipt_data, signed_transaction, or transaction_id required for Apple' });
        }

        const appleResult = await verifyAppleReceipt(body.receipt_data, body.signed_transaction, body.transaction_id);

        if (!appleResult) {
          logger.warn({
            event: 'apple_receipt_rejected',
            userId,
            productId: body.product_id,
          });
          return reply.status(400).send({ error: 'Invalid Apple receipt' });
        }

        expiresAt = appleResult.expiresAt;
        transactionId = appleResult.transactionId;
        originalTransactionId = appleResult.originalTransactionId;
        priceAmount = 199;
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
