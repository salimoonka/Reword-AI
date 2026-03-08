/**
 * Auth Success Screen
 *
 * Shown after successful Google OAuth / Email OTP sign-in.
 * Displays a sync animation and success message, then navigates
 * to the appropriate screen (onboarding or tabs).
 */

import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  useColorScheme,
} from 'react-native';
import { router } from 'expo-router';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useUserStore } from '@/stores/useUserStore';
import { colors } from '@/theme/colors';

const AUTO_NAVIGATE_MS = 2500;

export default function AuthSuccessScreen() {
  const colorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const isDarkMode =
    themeMode === 'dark' || (themeMode === 'auto' && colorScheme === 'dark');

  const user = useUserStore((s) => s.user);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const textFade = useRef(new Animated.Value(0)).current;

  const bgColor = isDarkMode ? '#0D0D0D' : '#F2F0F7';
  const textPrimary = isDarkMode ? '#FFFFFF' : '#1A1A1A';
  const textSecondary = isDarkMode ? '#B3B3B3' : '#666666';

  useEffect(() => {
    // Checkmark pop-in
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 60,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // Circle fade-in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    // Text fade-in (delayed)
    Animated.timing(textFade, {
      toValue: 1,
      duration: 500,
      delay: 400,
      useNativeDriver: true,
    }).start();

    // Auto-navigate after delay
    const timer = setTimeout(() => {
      const { hasCompletedOnboarding } = useSettingsStore.getState();
      if (hasCompletedOnboarding) {
        router.replace('/(tabs)');
      } else {
        router.replace('/onboarding/welcome');
      }
    }, AUTO_NAVIGATE_MS);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Success checkmark circle */}
      <Animated.View
        style={[
          styles.circle,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Text style={styles.checkmark}>✓</Text>
      </Animated.View>

      {/* Title */}
      <Animated.Text
        style={[styles.title, { color: textPrimary, opacity: textFade }]}
      >
        Вход выполнен!
      </Animated.Text>

      {/* Subtitle with user info */}
      <Animated.Text
        style={[styles.subtitle, { color: textSecondary, opacity: textFade }]}
      >
        {user?.email
          ? `Аккаунт ${user.email} синхронизирован`
          : 'Аккаунт синхронизирован с приложением'}
      </Animated.Text>

      {/* Sync details */}
      <Animated.View style={[styles.syncInfo, { opacity: textFade }]}>
        <View style={styles.syncRow}>
          <Text style={[styles.syncIcon]}>☁️</Text>
          <Text style={[styles.syncText, { color: textSecondary }]}>
            Подписка и история синхронизированы
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  circle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.accent.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  checkmark: {
    fontSize: 40,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 28,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 22,
  },
  syncInfo: {
    marginTop: 28,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(155, 109, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(155, 109, 255, 0.15)',
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  syncIcon: {
    fontSize: 18,
  },
  syncText: {
    fontSize: 14,
  },
});
