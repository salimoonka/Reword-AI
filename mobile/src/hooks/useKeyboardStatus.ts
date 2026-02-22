/**
 * useKeyboardStatus Hook
 * Checks if the custom keyboard is enabled and provides
 * deep linking to system keyboard settings
 */

import { useCallback, useEffect, useState } from 'react';
import { Platform, Linking, Alert } from 'react-native';
import { SharedStorage } from '@/native/SharedStorage';

interface KeyboardStatus {
  /** Whether our custom keyboard is enabled in system settings */
  isKeyboardEnabled: boolean;
  /** Whether Full Access is granted to the keyboard extension */
  hasFullAccess: boolean;
  /** Whether this is still being checked */
  isChecking: boolean;
  /** Open system keyboard settings */
  openKeyboardSettings: () => Promise<void>;
  /** Refresh keyboard status */
  refresh: () => Promise<void>;
}

/**
 * Hook to monitor custom keyboard activation status and
 * navigate to system settings via deep links
 */
export function useKeyboardStatus(): KeyboardStatus {
  const [isKeyboardEnabled, setIsKeyboardEnabled] = useState(false);
  const [hasFullAccess, setHasFullAccess] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const checkStatus = useCallback(async () => {
    setIsChecking(true);
    try {
      // Read keyboard status from shared storage (App Group / SharedPreferences)
      const enabled = await SharedStorage.getValue<string>('keyboard_enabled');
      const fullAccess = await SharedStorage.getValue<string>('full_access_granted');

      setIsKeyboardEnabled(enabled === 'true');
      setHasFullAccess(fullAccess === 'true');
    } catch (error) {
      // If shared storage is not available, keyboard is likely not set up
      console.warn('[KeyboardStatus] Failed to read status:', error);
      setIsKeyboardEnabled(false);
      setHasFullAccess(false);
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Check on mount and when app comes to foreground
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const openKeyboardSettings = useCallback(async () => {
    try {
      if (Platform.OS === 'ios') {
        // Open the app's own settings bundle; from there the user
        // can navigate to Keyboards.  `App-Prefs:` is a private URL
        // scheme that is blocked in Expo Go and may be rejected by
        // App Store review, so we use the public API instead.
        await Linking.openSettings();
      } else if (Platform.OS === 'android') {
        // Android: try to open input method settings directly
        try {
          await Linking.sendIntent('android.settings.INPUT_METHOD_SETTINGS');
        } catch {
          await Linking.openSettings();
        }
      }
    } catch (error) {
      console.error('[KeyboardStatus] Failed to open settings:', error);
      Alert.alert(
        'Откройте настройки',
        Platform.OS === 'ios'
          ? 'Перейдите в Настройки → Основные → Клавиатура → Клавиатуры → Добавить новую'
          : 'Перейдите в Настройки → Система → Языки и ввод → Текущая клавиатура',
        [
          { text: 'Открыть настройки', onPress: () => Linking.openSettings() },
          { text: 'Отмена', style: 'cancel' },
        ]
      );
    }
  }, []);

  return {
    isKeyboardEnabled,
    hasFullAccess,
    isChecking,
    openKeyboardSettings,
    refresh: checkStatus,
  };
}
