/**
 * OAuth Callback Route
 *
 * Handles the redirect from Supabase OAuth (rewordai://auth/callback).
 * The actual session exchange is handled by Supabase's onAuthStateChange
 * listener in auth.ts — this route simply shows a loading indicator
 * while the session is being established, then redirects to the app.
 */

import { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { useUserStore } from '@/stores/useUserStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { colors } from '@/theme/colors';

const AUTH_TIMEOUT_MS = 10_000; // 10 seconds max wait

export default function AuthCallbackScreen() {
  const colorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const isDarkMode =
    themeMode === 'dark' || (themeMode === 'auto' && colorScheme === 'dark');

  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  const hasNavigated = useRef(false);

  const navigateAway = () => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;

    const { hasCompletedOnboarding } = useSettingsStore.getState();

    if (isAuthenticated) {
      if (hasCompletedOnboarding) {
        router.replace('/(tabs)');
      } else {
        router.replace('/onboarding/welcome');
      }
    } else {
      // Auth failed or timed out — go back to sign-in
      router.replace('/auth/sign-in');
    }
  };

  // Watch for auth state to become authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigateAway();
    }
  }, [isAuthenticated]);

  // Timeout: if auth doesn't complete in 10s, redirect back to sign-in
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!hasNavigated.current) {
        if (__DEV__) {
          console.warn('[AuthCallback] Timed out waiting for auth session');
        }
        navigateAway();
      }
    }, AUTH_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, []);

  const bgColor = isDarkMode ? colors.background.primary : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#1A1A1A';
  const subTextColor = isDarkMode ? '#B3B3B3' : '#666666';

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <ActivityIndicator size="large" color={colors.accent.purple} />
      <Text style={[styles.title, { color: textColor }]}>Авторизация...</Text>
      <Text style={[styles.subtitle, { color: subTextColor }]}>
        Завершаем вход в аккаунт
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 8,
  },
});
