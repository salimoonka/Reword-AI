/**
 * User Store - Zustand
 * Manages user authentication state
 * Syncs auth tokens to native SharedStorage for keyboard access
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';

// Safe access to SharedStorage native module
const NativeSharedStorage = NativeModules.SharedStorage;

/** Sync tokens to native SharedStorage so the keyboard IME can read them */
async function syncTokensToNative(
  accessToken: string | null,
  refreshToken: string | null,
  userId?: string
) {
  try {
    if (!NativeSharedStorage) return;
    if (accessToken) {
      // Set auth data with a generous expiry (24h; the server side validates the real expiry)
      const expiryMs = Date.now() + 24 * 60 * 60 * 1000;
      await NativeSharedStorage.setAuthData(
        accessToken,
        refreshToken ?? null,
        expiryMs,
        userId ?? ''
      );
    } else {
      await NativeSharedStorage.clearAuthData();
    }
  } catch (e) {
    // Non-critical — log and continue
    console.warn('[useUserStore] Failed to sync tokens to native:', e);
  }
}

/** Sync API base URL to native SharedStorage */
async function syncApiBaseUrl() {
  try {
    if (!NativeSharedStorage?.setApiBaseUrl) return;
    // Use the same env variable the API client uses
    const baseUrl =
      process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
    await NativeSharedStorage.setApiBaseUrl(baseUrl);
  } catch (e) {
    console.warn('[useUserStore] Failed to sync API URL to native:', e);
  }
}

// Sync API URL once on module load
syncApiBaseUrl();

interface User {
  id: string;
  email?: string;
  phone?: string;
  createdAt: string;
}

interface UserState {
  // User data
  user: User | null;
  setUser: (user: User | null) => void;

  // Auth state
  isAuthenticated: boolean;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Session
  accessToken: string | null;
  refreshToken: string | null;
  setTokens: (accessToken: string | null, refreshToken: string | null) => void;

  // Actions
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      accessToken: null,
      refreshToken: null,

      setUser: (user) => {
        set({
          user,
          isAuthenticated: !!user,
        });
        // Re-sync tokens with userId when user is set
        const state = useUserStore.getState();
        if (user && state.accessToken) {
          syncTokensToNative(state.accessToken, state.refreshToken, user.id);
        }
      },

      setIsLoading: (loading) => set({ isLoading: loading }),

      setTokens: (accessToken, refreshToken) => {
        set({
          accessToken,
          refreshToken,
          isAuthenticated: !!accessToken,
        });
        syncTokensToNative(accessToken, refreshToken);
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
        syncTokensToNative(null, null);
      },
    }),
    {
      name: 'reword-ai-user',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
