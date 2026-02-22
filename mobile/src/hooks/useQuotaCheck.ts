/**
 * useQuotaCheck Hook
 * Checks if user has remaining quota before making API calls
 * Shows quota exceeded modal if limit reached
 */

import { useState, useCallback } from 'react';
import { useSubscriptionStore } from '@/stores/useSubscriptionStore';

export function useQuotaCheck() {
  const {
    tier,
    paraphrasesUsed,
    paraphrasesLimit,
    isPremium,
  } = useSubscriptionStore();

  const [showQuotaModal, setShowQuotaModal] = useState(false);

  /**
   * Check if user has remaining quota
   * Returns true if they can proceed, false if limit exceeded
   */
  const checkQuota = useCallback((): boolean => {
    // PRO users always have quota
    if (isPremium || tier === 'pro') {
      return true;
    }

    // Check daily limit
    if (paraphrasesUsed >= paraphrasesLimit) {
      setShowQuotaModal(true);
      return false;
    }

    return true;
  }, [isPremium, tier, paraphrasesUsed, paraphrasesLimit]);

  const dismissQuotaModal = useCallback(() => {
    setShowQuotaModal(false);
  }, []);

  const remaining = isPremium
    ? -1 // unlimited
    : Math.max(0, paraphrasesLimit - paraphrasesUsed);

  return {
    checkQuota,
    showQuotaModal,
    dismissQuotaModal,
    remaining,
    isUnlimited: isPremium,
    isQuotaExceeded: !isPremium && paraphrasesUsed >= paraphrasesLimit,
  };
}
