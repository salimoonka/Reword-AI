/**
 * Root Layout - Expo Router
 * Main entry point with deep link support and IAP initialization
 */

import { useEffect, useRef, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { useColorScheme, Alert } from 'react-native';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useSubscriptionStore } from '@/stores/useSubscriptionStore';
import { useUserStore } from '@/stores/useUserStore';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { colors } from '@/theme/colors';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initIAP, cleanupIAP, isUserCancelledError, type VerifyReceiptResponse } from '@/services/iap';
import { initAuth } from '@/services/supabase/auth';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

/**
 * Deep link URL scheme: rewordai://
 * Supported paths:
 *   rewordai://settings         → Settings screen
 *   rewordai://subscription     → Subscription screen
 *   rewordai://editor/:id       → Editor with note ID
 *   rewordai://keyboard-setup   → Onboarding keyboard enable screen
 */

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { themeMode, hasCompletedOnboarding } = useSettingsStore();
  const { updateFromVerification, syncFromServer } = useSubscriptionStore();
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  const [authReady, setAuthReady] = useState(false);
  const iapInitialized = useRef(false);

  // Determine active theme
  const isDarkMode =
    themeMode === 'dark' || (themeMode === 'auto' && colorScheme === 'dark');

  useEffect(() => {
    // Hide splash screen after a short delay
    const hideSplash = async () => {
      await SplashScreen.hideAsync();
    };
    hideSplash();
  }, []);

  // Initialize IAP and sync subscription on mount
  useEffect(() => {
    const setup = async () => {
      // Initialize Supabase auth (restore session if exists)
      await initAuth();
      setAuthReady(true);

      // Initialize IAP connection with global callbacks
      if (!iapInitialized.current) {
        iapInitialized.current = true;

        await initIAP({
          onReceiptVerified: (response: VerifyReceiptResponse) => {
            // Update store immediately from verification result
            updateFromVerification(response);

            if (response.subscription.is_premium) {
              Alert.alert(
                'Подписка оформлена! 🎉',
                'Наслаждайтесь безлимитными перефразированиями!',
                [{ text: 'Отлично!' }]
              );
            }
          },
          onReceiptVerificationFailed: (error) => {
            Alert.alert(
              'Ошибка верификации',
              'Не удалось подтвердить покупку. Попробуйте восстановить покупки позже.',
              [{ text: 'OK' }]
            );
          },
          onPurchaseError: (error) => {
            if (!isUserCancelledError(error)) {
              Alert.alert(
                'Ошибка покупки',
                'Не удалось оформить подписку. Попробуйте позже.',
                [{ text: 'OK' }]
              );
            }
          },
        });
      }

      // Sync subscription status from server
      syncFromServer();
    };

    setup();

    return () => {
      cleanupIAP();
    };
  }, []);

  // Handle incoming deep links
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      if (__DEV__) {
        console.log('[DeepLink] Received:', event.url);
      }
    };

    // Listen for deep links while app is open
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
    <ErrorBoundary>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: isDarkMode ? colors.background.primary : '#FFFFFF',
          },
          animation: 'slide_from_right',
        }}
      >
        {!authReady || !isAuthenticated ? (
          <Stack.Screen name="auth" options={{ headerShown: false }} />
        ) : !hasCompletedOnboarding ? (
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        ) : (
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        )}
        <Stack.Screen
          name="subscription/index"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
      </Stack>
    </ErrorBoundary>
    </SafeAreaProvider>
  );
}
