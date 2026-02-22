/**
 * Tests for useSettingsStore
 */

import { Platform } from 'react-native';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { act } from '@testing-library/react-native';

// Override Platform.OS to android so syncCloudEnabledToNative skips dynamic import()
const originalOS = Platform.OS;
beforeAll(() => {
  Platform.OS = 'android';
});
afterAll(() => {
  Platform.OS = originalOS;
});

const initialState = {
  themeMode: 'auto' as const,
  cloudEnabled: false,
  hasCompletedOnboarding: false,
  isKeyboardEnabled: false,
};

beforeEach(() => {
  act(() => {
    useSettingsStore.setState(initialState);
  });
});

describe('useSettingsStore', () => {
  describe('themeMode', () => {
    it('should default to auto', () => {
      expect(useSettingsStore.getState().themeMode).toBe('auto');
    });

    it('should set dark theme', () => {
      act(() => {
        useSettingsStore.getState().setThemeMode('dark');
      });
      expect(useSettingsStore.getState().themeMode).toBe('dark');
    });

    it('should set light theme', () => {
      act(() => {
        useSettingsStore.getState().setThemeMode('light');
      });
      expect(useSettingsStore.getState().themeMode).toBe('light');
    });
  });

  describe('cloudEnabled', () => {
    it('should default to false', () => {
      expect(useSettingsStore.getState().cloudEnabled).toBe(false);
    });

    it('should enable cloud mode', () => {
      act(() => {
        useSettingsStore.getState().setCloudEnabled(true);
      });
      expect(useSettingsStore.getState().cloudEnabled).toBe(true);
    });

    it('should disable cloud mode', () => {
      act(() => {
        useSettingsStore.getState().setCloudEnabled(true);
        useSettingsStore.getState().setCloudEnabled(false);
      });
      expect(useSettingsStore.getState().cloudEnabled).toBe(false);
    });
  });

  describe('onboarding', () => {
    it('should default to not completed', () => {
      expect(useSettingsStore.getState().hasCompletedOnboarding).toBe(false);
    });

    it('should mark onboarding as completed', () => {
      act(() => {
        useSettingsStore.getState().setHasCompletedOnboarding(true);
      });
      expect(useSettingsStore.getState().hasCompletedOnboarding).toBe(true);
    });
  });

  describe('keyboard status', () => {
    it('should default to not enabled', () => {
      expect(useSettingsStore.getState().isKeyboardEnabled).toBe(false);
    });

    it('should mark keyboard as enabled', () => {
      act(() => {
        useSettingsStore.getState().setIsKeyboardEnabled(true);
      });
      expect(useSettingsStore.getState().isKeyboardEnabled).toBe(true);
    });
  });

  describe('resetSettings', () => {
    it('should reset all settings to defaults', () => {
      act(() => {
        const store = useSettingsStore.getState();
        store.setThemeMode('dark');
        store.setCloudEnabled(true);
        store.setHasCompletedOnboarding(true);
        store.setIsKeyboardEnabled(true);
      });

      act(() => {
        useSettingsStore.getState().resetSettings();
      });

      const state = useSettingsStore.getState();
      expect(state.themeMode).toBe('auto');
      expect(state.cloudEnabled).toBe(false);
      expect(state.hasCompletedOnboarding).toBe(false);
      expect(state.isKeyboardEnabled).toBe(false);
    });
  });
});
