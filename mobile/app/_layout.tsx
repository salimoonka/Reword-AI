/**
 * Root Layout - Expo Router
 * Main entry point with deep link support and IAP initialization
 */

import { useEffect, useRef, useState } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { useColorScheme, Alert, Appearance } from 'react-native';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useSubscriptionStore } from '@/stores/useSubscriptionStore';
import { useUserStore } from '@/stores/useUserStore';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { darkColors, lightColors } from '@/theme/colors';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initIAP, cleanupIAP, isUserCancelledError, type VerifyReceiptResponse } from '@/services/iap';
import { initAuth } from '@/services/supabase/auth';
import { warmUpBackend } from '@/services/api/client';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

/**
 * Synchronously apply the stored theme before any component mounts so that
 * native Android DayNight mode (AppCompatDelegate) is already set correctly
 * on the very first render — avoiding a brief flash of the wrong theme.
 */
;(function syncThemeEarly() {
  try {
    const stored = useSettingsStore.getState().themeMode;
    if (stored === 'dark') Appearance.setColorScheme('dark');
    else if (stored === 'light') Appearance.setColorScheme('light');
    else Appearance.setColorScheme(null); // auto — follow system
  } catch {
    // Store not yet hydrated on very first cold start; effect below handles it
  }
})();

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
  const hasNavigated = useRef(false);

  // Determine active theme
  const isDarkMode =
    themeMode === 'dark' || (themeMode === 'auto' && colorScheme === 'dark');

  /**
   * Force the system-wide color scheme to match the app's chosen theme.
   * This prevents native Android / iOS components from using the phone's own
   * theme when the user has explicitly picked a different one in the app.
   */
  useEffect(() => {
    const scheme: 'dark' | 'light' | null =
      themeMode === 'dark' ? 'dark' : themeMode === 'light' ? 'light' : null;
    Appearance.setColorScheme(scheme);
  }, [themeMode]);

  /**
   * Custom React-Navigation themes matching our palette so modal backgrounds,
   * transition overlays and other framework-level UI pieces get the right colours.
   */
  const navTheme = isDarkMode
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: darkColors.background.primary,
          card: darkColors.background.secondary,
          text: darkColors.text.primary,
          border: darkColors.border.primary,
          primary: darkColors.accent.primary,
          notification: darkColors.accent.primary,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: lightColors.background.primary,
          card: lightColors.background.secondary,
          text: lightColors.text.primary,
          border: lightColors.border.primary,
          primary: lightColors.accent.primary,
          notification: lightColors.accent.primary,
        },
      };

  const themeColors = isDarkMode ? darkColors : lightColors;

  useEffect(() => {
    // Hide splash screen only after auth state is determined
    if (authReady) {
      SplashScreen.hideAsync();

      // Only perform initial navigation once — subsequent auth changes
      // (e.g. sign-in completing) are handled by the sign-in screen itself
      if (hasNavigated.current) return;
      hasNavigated.current = true;

      // Navigate to the appropriate initial screen
      if (!isAuthenticated) {
        router.replace('/auth/sign-in');
      } else if (!hasCompletedOnboarding) {
        router.replace('/onboarding/welcome');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [authReady, isAuthenticated, hasCompletedOnboarding]);

  // Initialize IAP and sync subscription on mount
  useEffect(() => {
    const setup = async () => {
      // Initialize Supabase auth (restore session if exists)
      await initAuth();
      setAuthReady(true);

      // Wake up backend early (Render free tier cold start)
      warmUpBackend();

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
                'Наслаждайтесь безлимитными токенами!',
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

      try {
        const { path } = Linking.parse(event.url);
        if (!path) return;

        // Auth callback deep links: When the website's app-complete page
        // redirects back to the app via rewordai://auth/callback#access_token=...,
        // route to the callback screen which extracts tokens and syncs the session.
        if (path.startsWith('auth/callback')) {
          if (__DEV__) {
            console.log('[DeepLink] Auth callback deep link — routing to callback screen');
          }
          router.push('/auth/callback');
          return;
        }

        // All non-auth deep links require authentication
        const authenticated = useUserStore.getState().isAuthenticated;
        if (!authenticated) {
          if (__DEV__) {
            console.warn('[DeepLink] Blocked — user not authenticated, redirecting to sign-in');
          }
          router.replace('/auth/sign-in');
          return;
        }

        // UUID v4 pattern for validating note IDs
        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        // Route known deep link paths
        if (path === 'settings') {
          router.push('/(tabs)/settings');
        } else if (path === 'subscription') {
          router.push('/subscription');
        } else if (path.startsWith('editor/')) {
          const noteId = path.replace('editor/', '');
          if (noteId && UUID_RE.test(noteId)) {
            router.push(`/editor/${noteId}`);
          } else if (__DEV__) {
            console.warn('[DeepLink] Invalid noteId format:', noteId);
          }
        } else if (path === 'keyboard-setup') {
          router.push('/onboarding/enable-keyboard');
        }
      } catch (e) {
        if (__DEV__) {
          console.warn('[DeepLink] Failed to parse:', e);
        }
      }
    };

    // Listen for deep links while app is open
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened via deep link (cold start)
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
    <ThemeProvider value={navTheme}>
    <ErrorBoundary>
      <StatusBar
        style={isDarkMode ? 'light' : 'dark'}
        backgroundColor={themeColors.background.primary}
      />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: themeColors.background.primary,
          },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="subscription/index"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
      </Stack>
    </ErrorBoundary>
    </ThemeProvider>
    </SafeAreaProvider>
  );
}
