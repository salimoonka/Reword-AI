/**
 * Tests for useQuotaCheck hook
 */

import { renderHook, act } from '@testing-library/react-native';
import { useQuotaCheck } from '@/hooks/useQuotaCheck';
import { useSubscriptionStore } from '@/stores/useSubscriptionStore';

beforeEach(() => {
  useSubscriptionStore.setState({
    tier: 'free',
    plan: 'free',
    expiresAt: null,
    isActive: false,
    isPremium: false,
    daysRemaining: null,
    paraphrasesUsed: 0,
    paraphrasesLimit: 5,
    quotaResetAt: null,
    isSyncing: false,
  });
});

describe('useQuotaCheck', () => {
  it('should allow quota check for free user with remaining quota', () => {
    useSubscriptionStore.setState({ paraphrasesUsed: 2, paraphrasesLimit: 5 });

    const { result } = renderHook(() => useQuotaCheck());

    expect(result.current.remaining).toBe(3);
    expect(result.current.isQuotaExceeded).toBe(false);
    expect(result.current.isUnlimited).toBe(false);

    let canProceed: boolean;
    act(() => {
      canProceed = result.current.checkQuota();
    });
    expect(canProceed!).toBe(true);
    expect(result.current.showQuotaModal).toBe(false);
  });

  it('should block and show modal when quota exceeded', () => {
    useSubscriptionStore.setState({ paraphrasesUsed: 5, paraphrasesLimit: 5 });

    const { result } = renderHook(() => useQuotaCheck());

    expect(result.current.remaining).toBe(0);
    expect(result.current.isQuotaExceeded).toBe(true);

    let canProceed: boolean;
    act(() => {
      canProceed = result.current.checkQuota();
    });
    expect(canProceed!).toBe(false);
    expect(result.current.showQuotaModal).toBe(true);
  });

  it('should dismiss quota modal', () => {
    useSubscriptionStore.setState({ paraphrasesUsed: 5, paraphrasesLimit: 5 });

    const { result } = renderHook(() => useQuotaCheck());

    act(() => {
      result.current.checkQuota();
    });
    expect(result.current.showQuotaModal).toBe(true);

    act(() => {
      result.current.dismissQuotaModal();
    });
    expect(result.current.showQuotaModal).toBe(false);
  });

  it('should always allow quota for PRO users', () => {
    useSubscriptionStore.setState({
      tier: 'pro',
      isPremium: true,
      paraphrasesUsed: 9999,
      paraphrasesLimit: 999999,
    });

    const { result } = renderHook(() => useQuotaCheck());

    expect(result.current.isUnlimited).toBe(true);
    expect(result.current.remaining).toBe(-1);

    let canProceed: boolean;
    act(() => {
      canProceed = result.current.checkQuota();
    });
    expect(canProceed!).toBe(true);
    expect(result.current.showQuotaModal).toBe(false);
  });

  it('should report remaining as 0 when over limit', () => {
    useSubscriptionStore.setState({ paraphrasesUsed: 7, paraphrasesLimit: 5 });

    const { result } = renderHook(() => useQuotaCheck());
    expect(result.current.remaining).toBe(0);
  });
});
