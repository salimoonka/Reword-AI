/**
 * Subscription Store - Zustand
 * Manages subscription status, quota, and IAP state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiGet } from '@/services/api/client';

export type SubscriptionTier = 'free' | 'pro';

interface SubscriptionState {
  // Subscription info
  tier: SubscriptionTier;
  plan: string;
  expiresAt: string | null;
  isActive: boolean;
  isPremium: boolean;
  daysRemaining: number | null;

  // Quota
  paraphrasesUsed: number;
  paraphrasesLimit: number;
  quotaResetAt: string | null;

  // Loading
  isSyncing: boolean;

  // Actions
  setSubscription: (tier: SubscriptionTier, expiresAt: string | null) => void;
  setQuota: (used: number, limit: number, resetAt: string | null) => void;
  incrementUsage: () => void;
  resetQuota: () => void;
  syncFromServer: () => Promise<void>;
  updateFromVerification: (data: {
    subscription: { status: string; plan: string; is_premium: boolean; expires_at: string | null };
    quota: { tier: string; daily_limit: number; daily_used: number; remaining: number };
  }) => void;
}

const FREE_PARAPHRASES_LIMIT = 5;

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      tier: 'free',
      plan: 'free',
      expiresAt: null,
      isActive: false,
      isPremium: false,
      daysRemaining: null,
      paraphrasesUsed: 0,
      paraphrasesLimit: FREE_PARAPHRASES_LIMIT,
      quotaResetAt: null,
      isSyncing: false,

      setSubscription: (tier, expiresAt) =>
        set({
          tier,
          expiresAt,
          isActive: tier === 'pro' && (!expiresAt || new Date(expiresAt) > new Date()),
          isPremium: tier === 'pro',
          paraphrasesLimit: tier === 'pro' ? 999999 : FREE_PARAPHRASES_LIMIT,
        }),

      setQuota: (used, limit, resetAt) =>
        set({
          paraphrasesUsed: used,
          paraphrasesLimit: limit,
          quotaResetAt: resetAt,
        }),

      incrementUsage: () => {
        const { paraphrasesUsed } = get();
        set({ paraphrasesUsed: paraphrasesUsed + 1 });
      },

      resetQuota: () => set({ paraphrasesUsed: 0 }),

      /**
       * Sync subscription and quota from backend
       * Called on app launch and after purchase
       */
      syncFromServer: async () => {
        if (get().isSyncing) return;
        set({ isSyncing: true });

        try {
          const response = await apiGet<{
            subscription: {
              status: string;
              plan: string;
              is_premium: boolean;
              expires_at: string | null;
              days_remaining: number | null;
            };
            quota: {
              tier: string;
              daily_limit: number;
              daily_used: number;
              remaining: number;
              reset_at: string;
            };
          }>('/v1/subscription');

          const { subscription, quota } = response;
          const tier: SubscriptionTier = subscription.is_premium ? 'pro' : 'free';

          set({
            tier,
            plan: subscription.plan,
            expiresAt: subscription.expires_at,
            isActive: subscription.is_premium,
            isPremium: subscription.is_premium,
            daysRemaining: subscription.days_remaining,
            paraphrasesUsed: quota.daily_used,
            paraphrasesLimit: quota.daily_limit === -1 ? 999999 : quota.daily_limit,
            quotaResetAt: quota.reset_at,
          });
        } catch (error) {
          // Silently fail — will use cached state
          if (__DEV__) {
            console.warn('[Subscription] Sync failed:', error);
          }
        } finally {
          set({ isSyncing: false });
        }
      },

      /**
       * Update store from receipt verification response
       * Called immediately after successful purchase/restore
       */
      updateFromVerification: (data) => {
        const { subscription, quota } = data;
        const tier: SubscriptionTier = subscription.is_premium ? 'pro' : 'free';

        set({
          tier,
          plan: subscription.plan,
          expiresAt: subscription.expires_at,
          isActive: subscription.is_premium,
          isPremium: subscription.is_premium,
          paraphrasesUsed: quota.daily_used,
          paraphrasesLimit: quota.daily_limit === -1 ? 999999 : quota.daily_limit,
        });
      },
    }),
    {
      name: 'reword-ai-subscription',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
