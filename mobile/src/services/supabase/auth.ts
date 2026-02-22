/**
 * Supabase Auth - Session management and token synchronization
 *
 * Supports: Google OAuth, Email OTP, and Anonymous sign-in.
 * Tokens are synced to SecureStore ('access_token' / 'refresh_token') so that
 * the Axios API client interceptor (client.ts) and the native keyboard can use them.
 */

import * as SecureStore from 'expo-secure-store';
import { supabase } from './client';
import { useUserStore } from '@/stores/useUserStore';

let _initialized = false;

/**
 * Sync a Supabase session's tokens into SecureStore + useUserStore.
 * This keeps the existing API client interceptor and native keyboard in sync.
 */
export async function syncSession(accessToken: string | null, refreshToken: string | null, userId?: string, email?: string) {
  // Persist to SecureStore for the Axios request interceptor
  if (accessToken) {
    await SecureStore.setItemAsync('access_token', accessToken);
  } else {
    await SecureStore.deleteItemAsync('access_token');
  }

  if (refreshToken) {
    await SecureStore.setItemAsync('refresh_token', refreshToken);
  } else {
    await SecureStore.deleteItemAsync('refresh_token');
  }

  // Update Zustand store (also syncs to native SharedStorage for keyboard)
  const store = useUserStore.getState();
  store.setTokens(accessToken, refreshToken);
  if (userId) {
    store.setUser({
      id: userId,
      email: email,
      createdAt: new Date().toISOString(),
    });
  }
}

/**
 * Check if there is an existing valid session.
 * Returns true if user is authenticated, false otherwise.
 */
export async function hasSession(): Promise<boolean> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return !!session;
  } catch {
    return false;
  }
}

/**
 * Sign out and clear all tokens.
 */
export async function signOut(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.warn('[Auth] Sign out error:', e);
  }
  await syncSession(null, null);
  useUserStore.getState().logout();
}

/**
 * Initialize authentication.
 * - If a session already exists (persisted by Supabase), reuse it and sync tokens.
 * - If no session exists, do NOT auto-sign-in — the sign-in screen will handle it.
 * - Sets up auth state change listener for token refresh and OAuth callbacks.
 *
 * Call this once at app startup (e.g., in _layout.tsx).
 */
export async function initAuth(): Promise<void> {
  if (_initialized) return;
  _initialized = true;

  try {
    // 1. Check for an existing persisted session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      // Session exists – sync to SecureStore
      await syncSession(
        session.access_token,
        session.refresh_token,
        session.user?.id,
        session.user?.email ?? undefined,
      );
      if (__DEV__) {
        console.log('[Auth] Restored session for user', session.user?.id, session.user?.email);
      }
    } else {
      if (__DEV__) {
        console.log('[Auth] No session found — user will see sign-in screen');
      }
    }

    // 2. Listen for auth events (token refresh, OAuth callback, sign-in, sign-out)
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (__DEV__) {
        console.log('[Auth] Auth state changed:', event);
      }
      if (session) {
        await syncSession(
          session.access_token,
          session.refresh_token,
          session.user?.id,
          session.user?.email ?? undefined,
        );
      } else {
        await syncSession(null, null);
      }
    });
  } catch (e) {
    console.error('[Auth] Initialization error:', e);
  }
}
