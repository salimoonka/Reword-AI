/**
 * Subscription Service
 * Manages user subscription status and verification
 */

import { supabaseAdmin } from '../supabase/client.js';
import logger from '../logging/logger.js';
import type { Subscription, SubscriptionStatus, SubscriptionPlan } from '../../types/database.js';

export interface SubscriptionInfo {
  userId: string;
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  isPremium: boolean;
  expiresAt: Date | null;
  trialEndsAt: Date | null;
  daysRemaining: number | null;
}

/**
 * Get user subscription information
 */
export async function getSubscription(userId: string): Promise<SubscriptionInfo> {
  try {
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      // Return default free subscription if not found
      return {
        userId,
        status: 'free',
        plan: 'free',
        isPremium: false,
        expiresAt: null,
        trialEndsAt: null,
        daysRemaining: null,
      };
    }

    const subscription = data as Subscription;
    const now = new Date();
    
    // Check if subscription is active
    let isPremium = false;
    let daysRemaining: number | null = null;

    if (subscription.status === 'active') {
      if (subscription.expires_at) {
        const expiresAt = new Date(subscription.expires_at);
        isPremium = expiresAt > now;
        daysRemaining = isPremium 
          ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : 0;
      } else {
        // No expiry date = unlimited
        isPremium = true;
      }
    } else if (subscription.status === 'trial') {
      if (subscription.trial_ends_at) {
        const trialEnds = new Date(subscription.trial_ends_at);
        isPremium = trialEnds > now;
        daysRemaining = isPremium
          ? Math.ceil((trialEnds.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : 0;
      }
    }

    return {
      userId,
      status: subscription.status,
      plan: subscription.plan,
      isPremium,
      expiresAt: subscription.expires_at ? new Date(subscription.expires_at) : null,
      trialEndsAt: subscription.trial_ends_at ? new Date(subscription.trial_ends_at) : null,
      daysRemaining,
    };
  } catch (error) {
    logger.error({
      event: 'subscription_get_error',
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    // Return free tier on error
    return {
      userId,
      status: 'free',
      plan: 'free',
      isPremium: false,
      expiresAt: null,
      trialEndsAt: null,
      daysRemaining: null,
    };
  }
}

/**
 * Verify and update subscription from App Store / Google Play receipt
 * This should be called after successful IAP verification
 */
export async function updateSubscription(
  userId: string,
  params: {
    status: SubscriptionStatus;
    plan: SubscriptionPlan;
    store: 'apple' | 'google' | 'external';
    storeProductId: string;
    storeTransactionId: string;
    storeOriginalTransactionId?: string;
    expiresAt: Date;
    priceAmount?: number;
    priceCurrency?: string;
  }
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('subscriptions')
      .upsert({
        user_id: userId,
        status: params.status,
        plan: params.plan,
        store: params.store,
        store_product_id: params.storeProductId,
        store_transaction_id: params.storeTransactionId,
        store_original_transaction_id: params.storeOriginalTransactionId,
        started_at: new Date().toISOString(),
        expires_at: params.expiresAt.toISOString(),
        price_amount: params.priceAmount,
        price_currency: params.priceCurrency || 'RUB',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (error) {
      logger.error({
        event: 'subscription_update_error',
        userId,
        error: error.message,
      });
      return false;
    }

    logger.info({
      event: 'subscription_updated',
      userId,
      status: params.status,
      plan: params.plan,
      store: params.store,
      expiresAt: params.expiresAt.toISOString(),
    });

    return true;
  } catch (error) {
    logger.error({
      event: 'subscription_update_error',
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(userId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      logger.error({
        event: 'subscription_cancel_error',
        userId,
        error: error.message,
      });
      return false;
    }

    logger.info({
      event: 'subscription_cancelled',
      userId,
    });

    return true;
  } catch (error) {
    logger.error({
      event: 'subscription_cancel_error',
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Start trial for user
 */
export async function startTrial(userId: string, trialDays: number = 7): Promise<boolean> {
  try {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    const { error } = await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'trial',
        plan: 'pro_monthly', // Trial gives pro features
        trial_ends_at: trialEndsAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      logger.error({
        event: 'trial_start_error',
        userId,
        error: error.message,
      });
      return false;
    }

    logger.info({
      event: 'trial_started',
      userId,
      trialDays,
      trialEndsAt: trialEndsAt.toISOString(),
    });

    return true;
  } catch (error) {
    logger.error({
      event: 'trial_start_error',
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

export default {
  getSubscription,
  updateSubscription,
  cancelSubscription,
  startTrial,
};
