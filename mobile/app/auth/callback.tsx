/**
 * OAuth Callback Route
 *
 * Handles the redirect from Supabase OAuth (rewordai://auth/callback).
 *
 * Supabase OAuth implicit flow redirects here with tokens in the URL fragment:
 *   rewordai://auth/callback#access_token=xxx&refresh_token=xxx&...
 *
 * PKCE flow redirects with a code parameter:
 *   rewordai://auth/callback?code=xxx
 *
 * This screen extracts those tokens, sets the Supabase session, then navigates.
 */

import { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, useColorScheme } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '@/services/supabase/client';
import { syncSession } from '@/services/supabase/auth';
import { useUserStore } from '@/stores/useUserStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { colors } from '@/theme/colors';

const AUTH_TIMEOUT_MS = 15_000; // 15 seconds max wait

/**
 * Parse tokens from a URL hash fragment (#access_token=...&refresh_token=...)
 */
function parseHashTokens(url: string): { access_token?: string; refresh_token?: string } | null {
  try {
    const hashIndex = url.indexOf('#');
    if (hashIndex === -1) return null;
    const hash = url.substring(hashIndex + 1);
    const params = new URLSearchParams(hash);
    const access_token = params.get('access_token') ?? undefined;
    const refresh_token = params.get('refresh_token') ?? undefined;
    if (access_token) return { access_token, refresh_token };
    return null;
  } catch {
    return null;
  }
}

/**
 * Parse PKCE code from a URL query string (?code=xxx)
 */
function parseCodeParam(url: string): string | null {
  try {
    const questionIndex = url.indexOf('?');
    if (questionIndex === -1) return null;
    const query = url.substring(questionIndex + 1);
    const params = new URLSearchParams(query);
    return params.get('code');
  } catch {
    return null;
  }
}

export default function AuthCallbackScreen() {
  const colorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const isDarkMode =
    themeMode === 'dark' || (themeMode === 'auto' && colorScheme === 'dark');

  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  const hasNavigated = useRef(false);
  const isProcessing = useRef(false);

  const navigateAway = (authenticated?: boolean) => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;

    const { hasCompletedOnboarding } = useSettingsStore.getState();
    const isAuth = authenticated ?? useUserStore.getState().isAuthenticated;

    if (isAuth) {
      if (hasCompletedOnboarding) {
        router.replace('/(tabs)');
      } else {
        router.replace('/onboarding/welcome');
      }
    } else {
      router.replace('/auth/sign-in');
    }
  };

  /**
   * Main auth handler — extract tokens from deep link URL and set session
   */
  const handleAuthUrl = async (url: string) => {
    if (isProcessing.current || hasNavigated.current) return;
    isProcessing.current = true;

    if (__DEV__) console.log('[AuthCallback] Processing URL:', url);

    try {
      // Try 1: Implicit flow — tokens in hash fragment
      const tokens = parseHashTokens(url);
      if (tokens?.access_token) {
        if (__DEV__) console.log('[AuthCallback] Found tokens in hash fragment');
        const { data, error } = await supabase.auth.setSession({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || '',
        });
        if (error) {
          console.error('[AuthCallback] setSession error:', error);
        } else if (data.session) {
          await syncSession(
            data.session.access_token,
            data.session.refresh_token,
            data.session.user.id,
            data.session.user.email ?? undefined,
          );
          navigateAway(true);
          return;
        }
      }

      // Try 2: PKCE flow — code in query string
      const code = parseCodeParam(url);
      if (code) {
        if (__DEV__) console.log('[AuthCallback] Found PKCE code, exchanging...');
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error('[AuthCallback] exchangeCodeForSession error:', error);
        } else if (data.session) {
          await syncSession(
            data.session.access_token,
            data.session.refresh_token,
            data.session.user.id,
            data.session.user.email ?? undefined,
          );
          navigateAway(true);
          return;
        }
      }

      if (__DEV__) console.warn('[AuthCallback] No tokens or code found in URL');
    } catch (e) {
      console.error('[AuthCallback] Error processing auth URL:', e);
    } finally {
      isProcessing.current = false;
    }
  };

  // On mount: grab the URL that opened this screen
  useEffect(() => {
    // 1. Check initial URL (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) handleAuthUrl(url);
    });

    // 2. Listen for incoming URLs (warm start / redirect from browser)
    const sub = Linking.addEventListener('url', (event) => {
      if (event.url) handleAuthUrl(event.url);
    });

    return () => sub.remove();
  }, []);

  // Watch for auth state changes (e.g. onAuthStateChange fires from auth.ts listener)
  useEffect(() => {
    if (isAuthenticated && !hasNavigated.current) {
      navigateAway(true);
    }
  }, [isAuthenticated]);

  // Timeout: if auth doesn't complete in 15s, redirect back to sign-in
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!hasNavigated.current) {
        if (__DEV__) {
          console.warn('[AuthCallback] Timed out waiting for auth session');
        }
        navigateAway(false);
      }
    }, AUTH_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, []);

  const bgColor = isDarkMode ? colors.background.primary : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#1A1A1A';
  const subTextColor = isDarkMode ? '#B3B3B3' : '#666666';

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <ActivityIndicator size="large" color={colors.accent.primary} />
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
