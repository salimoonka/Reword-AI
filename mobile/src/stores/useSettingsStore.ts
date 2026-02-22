/**
 * Settings Store - Zustand
 * Manages app settings: theme, local/online mode, etc.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'auto' | 'dark' | 'light';

interface SettingsState {
  // Theme
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;

  // Cloud features
  cloudEnabled: boolean;
  setCloudEnabled: (enabled: boolean) => void;

  // Onboarding
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (completed: boolean) => void;

  // Keyboard status
  isKeyboardEnabled: boolean;
  setIsKeyboardEnabled: (enabled: boolean) => void;

  // Reset
  resetSettings: () => void;
}

const initialState = {
  themeMode: 'auto' as ThemeMode,
  cloudEnabled: false,
  hasCompletedOnboarding: false,
  isKeyboardEnabled: false,
};

/**
 * Sync cloudEnabled to native shared storage for keyboard extension access
 */
function syncCloudEnabledToNative(enabled: boolean) {
  // Sync to native shared storage for keyboard extension access (both platforms)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { SharedStorage } = require('../native/SharedStorage');
    SharedStorage.setCloudEnabled(enabled).catch(() => {
      // Silently fail — native module may not be available in dev
    });
  } catch {
    // Silently fail — native module may not be available in dev/test
  }
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...initialState,

      setThemeMode: (mode) => set({ themeMode: mode }),
      setCloudEnabled: (enabled) => {
        set({ cloudEnabled: enabled });
        syncCloudEnabledToNative(enabled);
      },
      setHasCompletedOnboarding: (completed) => set({ hasCompletedOnboarding: completed }),
      setIsKeyboardEnabled: (enabled) => set({ isKeyboardEnabled: enabled }),

      resetSettings: () => set(initialState),
    }),
    {
      name: 'reword-ai-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
