/**
 * Tests for useSubscriptionStore
 */

import { useSubscriptionStore } from '@/stores/useSubscriptionStore';
import { act } from '@testing-library/react-native';

const initialState = {
  tier: 'free' as const,
  plan: 'free',
  expiresAt: null,
  isActive: false,
  isPremium: false,
  daysRemaining: null,
  paraphrasesUsed: 0,
  paraphrasesLimit: 5,
  quotaResetAt: null,
  isSyncing: false,
};

beforeEach(() => {
  act(() => {
    useSubscriptionStore.setState(initialState);
  });
});

describe('useSubscriptionStore', () => {
  describe('setSubscription', () => {
    it('should set free subscription', () => {
      act(() => {
        useSubscriptionStore.getState().setSubscription('free', null);
      });

      const state = useSubscriptionStore.getState();
      expect(state.tier).toBe('free');
      expect(state.isActive).toBe(false);
      expect(state.isPremium).toBe(false);
      expect(state.paraphrasesLimit).toBe(5);
    });

    it('should set pro subscription with active expiry', () => {
      const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      act(() => {
        useSubscriptionStore.getState().setSubscription('pro', future);
      });

      const state = useSubscriptionStore.getState();
      expect(state.tier).toBe('pro');
      expect(state.isActive).toBe(true);
      expect(state.isPremium).toBe(true);
      expect(state.paraphrasesLimit).toBe(999999);
    });

    it('should mark expired pro subscription as inactive', () => {
      const past = new Date(Date.now() - 1000).toISOString();

      act(() => {
        useSubscriptionStore.getState().setSubscription('pro', past);
      });

      const state = useSubscriptionStore.getState();
      expect(state.tier).toBe('pro');
      expect(state.isActive).toBe(false);
    });
  });

  describe('quota management', () => {
    it('should set quota values', () => {
      act(() => {
        useSubscriptionStore.getState().setQuota(3, 5, '2026-02-21T00:00:00Z');
      });

      const state = useSubscriptionStore.getState();
      expect(state.paraphrasesUsed).toBe(3);
      expect(state.paraphrasesLimit).toBe(5);
      expect(state.quotaResetAt).toBe('2026-02-21T00:00:00Z');
    });

    it('should increment usage by 1', () => {
      act(() => {
        useSubscriptionStore.getState().setQuota(2, 5, null);
      });

      act(() => {
        useSubscriptionStore.getState().incrementUsage();
      });

      expect(useSubscriptionStore.getState().paraphrasesUsed).toBe(3);
    });

    it('should reset quota to 0', () => {
      act(() => {
        useSubscriptionStore.getState().setQuota(5, 5, null);
      });

      act(() => {
        useSubscriptionStore.getState().resetQuota();
      });

      expect(useSubscriptionStore.getState().paraphrasesUsed).toBe(0);
    });
  });

  describe('updateFromVerification', () => {
    it('should update from PRO verification data', () => {
      act(() => {
        useSubscriptionStore.getState().updateFromVerification({
          subscription: {
            status: 'active',
            plan: 'pro_monthly',
            is_premium: true,
            expires_at: '2026-03-20T00:00:00Z',
          },
          quota: {
            tier: 'pro',
            daily_limit: -1,
            daily_used: 42,
            remaining: -1,
          },
        });
      });

      const state = useSubscriptionStore.getState();
      expect(state.tier).toBe('pro');
      expect(state.plan).toBe('pro_monthly');
      expect(state.isPremium).toBe(true);
      expect(state.isActive).toBe(true);
      expect(state.paraphrasesUsed).toBe(42);
      expect(state.paraphrasesLimit).toBe(999999);
    });

    it('should update from free verification data', () => {
      act(() => {
        useSubscriptionStore.getState().updateFromVerification({
          subscription: {
            status: 'inactive',
            plan: 'free',
            is_premium: false,
            expires_at: null,
          },
          quota: {
            tier: 'free',
            daily_limit: 5,
            daily_used: 3,
            remaining: 2,
          },
        });
      });

      const state = useSubscriptionStore.getState();
      expect(state.tier).toBe('free');
      expect(state.isPremium).toBe(false);
      expect(state.isActive).toBe(false);
      expect(state.paraphrasesUsed).toBe(3);
      expect(state.paraphrasesLimit).toBe(5);
    });
  });
});
