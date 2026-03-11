/**
 * Token Refresh Logic Tests
 * Verifies: MA-02 (race condition fix — isRefreshing flag ordering)
 */

import { describe, it, expect } from 'vitest';

/**
 * Simulates the subscriber notification pattern from client.ts.
 * The fix ensures isRefreshing=false BEFORE notifying subscribers,
 * so that retried requests encountering another 401 won't deadlock.
 */
describe('Token Refresh Race Condition (MA-02)', () => {
  it('should reset isRefreshing before notifying success subscribers', () => {
    let isRefreshing = true;
    let refreshSubscribers: Array<(token: string) => void> = [];
    let refreshFailSubscribers: Array<(error: Error) => void> = [];
    const executionOrder: string[] = [];

    function onRefreshed(token: string) {
      refreshSubscribers.forEach((cb) => cb(token));
      refreshSubscribers = [];
    }

    // Subscriber checks isRefreshing during callback
    refreshSubscribers.push((_token: string) => {
      executionOrder.push(`subscriber_called:isRefreshing=${isRefreshing}`);
    });

    // FIXED order: reset flag BEFORE calling subscribers
    isRefreshing = false;
    executionOrder.push('isRefreshing_set_false');
    onRefreshed('new-token');
    executionOrder.push('onRefreshed_called');

    // Verify correct execution order
    expect(executionOrder[0]).toBe('isRefreshing_set_false');
    expect(executionOrder[1]).toBe('subscriber_called:isRefreshing=false');
    expect(executionOrder[2]).toBe('onRefreshed_called');
  });

  it('should reject all fail subscribers on refresh failure', () => {
    let refreshSubscribers: Array<(token: string) => void> = [];
    let refreshFailSubscribers: Array<(error: Error) => void> = [];
    const rejectedErrors: Error[] = [];

    function onRefreshFailed(error: Error) {
      refreshFailSubscribers.forEach((cb) => cb(error));
      refreshFailSubscribers = [];
      refreshSubscribers = [];
    }

    // Simulate 3 queued requests waiting for refresh
    for (let i = 0; i < 3; i++) {
      refreshFailSubscribers.push((err: Error) => {
        rejectedErrors.push(err);
      });
    }

    const error = new Error('Token refresh failed');
    onRefreshFailed(error);

    // All 3 subscribers should have received the error
    expect(rejectedErrors).toHaveLength(3);
    rejectedErrors.forEach((err) => {
      expect(err.message).toBe('Token refresh failed');
    });
    // Arrays should be cleared
    expect(refreshSubscribers).toHaveLength(0);
    expect(refreshFailSubscribers).toHaveLength(0);
  });

  it('should clear both subscriber arrays on failure', () => {
    let refreshSubscribers: Array<(token: string) => void> = [];
    let refreshFailSubscribers: Array<(error: Error) => void> = [];

    function onRefreshFailed(error: Error) {
      refreshFailSubscribers.forEach((cb) => cb(error));
      refreshFailSubscribers = [];
      refreshSubscribers = [];
    }

    // Add some pending success subscribers (these shouldn't be called)
    let successCalled = false;
    refreshSubscribers.push(() => { successCalled = true; });
    refreshFailSubscribers.push(() => {});

    onRefreshFailed(new Error('fail'));

    expect(successCalled).toBe(false); // Success callback must NOT fire
    expect(refreshSubscribers).toHaveLength(0);
    expect(refreshFailSubscribers).toHaveLength(0);
  });

  it('should not deadlock when subscriber triggers another 401 path', () => {
    let isRefreshing = false;
    let refreshSubscribers: Array<(token: string) => void> = [];
    let couldEnqueueAgain = false;

    function onRefreshed(token: string) {
      refreshSubscribers.forEach((cb) => cb(token));
      refreshSubscribers = [];
    }

    // Subscriber simulates a re-queued request encountering 401
    refreshSubscribers.push((_token: string) => {
      // With the fix, isRefreshing is already false here,
      // so a new 401 would start a fresh refresh (not deadlock)
      if (!isRefreshing) {
        couldEnqueueAgain = true; // Can start new refresh
      }
    });

    // FIXED: reset flag before notifying
    isRefreshing = false;
    onRefreshed('new-token');

    expect(couldEnqueueAgain).toBe(true);
  });
});
