/**
 * Settings Screen
 * Modern glassmorphism design with light/dark theme support
 * Theme, cloud mode, subscription, keyboard, privacy
 */

import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSettingsStore, ThemeMode } from '@/stores/useSettingsStore';
import { useSubscriptionStore } from '@/stores/useSubscriptionStore';
import { useUserStore } from '@/stores/useUserStore';
import { useKeyboardStatus } from '@/hooks/useKeyboardStatus';
import { useThemeColors } from '@/hooks/useThemeColors';
import { apiDelete } from '@/services/api/client';
import { spacing, typography, colors } from '@/theme';
import { useMemo } from 'react';
import type { Colors } from '@/theme';

/* ═══════════════════════════════════════════════════════════
   Glass helpers – semi-transparent card styling
   ═══════════════════════════════════════════════════════════ */

const glass = (isDark: boolean) => ({
  card: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.5)',
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: isDark ? '#000' : '#8E8E93',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.3 : 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: isDark ? 0 : 2,
      },
    }),
  },
  sectionBg: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(155,109,255,0.04)',
});

/* ═══════════════════════════════════════════════════════════
   Screen
   ═══════════════════════════════════════════════════════════ */

export default function SettingsScreen() {
  const c = useThemeColors();
  const {
    themeMode,
    setThemeMode,
    cloudEnabled,
    setCloudEnabled,
  } = useSettingsStore();
  const { tier, paraphrasesUsed, paraphrasesLimit } = useSubscriptionStore();
  const { isKeyboardEnabled, hasFullAccess, isChecking, openKeyboardSettings } =
    useKeyboardStatus();
  const { logout, user, isAuthenticated } = useUserStore();

  const isDark = c.background.primary === '#1A1A1A';
  const g = useMemo(() => glass(isDark), [isDark]);
  const s = useMemo(() => makeStyles(c, isDark), [c, isDark]);

  const themeOptions: { label: string; value: ThemeMode; icon: string }[] = [
    { label: 'Авто', value: 'auto', icon: '◐' },
    { label: 'Тёмная', value: 'dark', icon: '🌙' },
    { label: 'Светлая', value: 'light', icon: '☀️' },
  ];

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Настройки</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Account ─── */}
        <Text style={s.sectionLabel}>АККАУНТ</Text>
        <View style={[g.card, s.card]}>
          <View style={s.accountRow}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={s.avatarImage} />
            ) : (
              <View style={s.avatar}>
                <Text style={s.avatarText}>
                  {user?.displayName
                    ? user.displayName.charAt(0).toUpperCase()
                    : user?.email
                      ? user.email.charAt(0).toUpperCase()
                      : '👤'}
                </Text>
              </View>
            )}
            <View style={s.accountInfo}>
              <Text style={s.accountEmail} numberOfLines={1}>
                {user?.displayName || user?.email || 'Гость'}
              </Text>
              <Text style={s.accountStatus}>
                {isAuthenticated
                  ? user?.displayName
                    ? user.email ?? 'Авторизован через Google'
                    : user?.email
                      ? 'Авторизован'
                      : 'Анонимный аккаунт'
                  : 'Не авторизован'}
              </Text>
            </View>
            <TouchableOpacity
              style={s.logoutPill}
              onPress={() => {
                Alert.alert('Выход', 'Вы уверены, что хотите выйти из аккаунта?', [
                  { text: 'Отмена', style: 'cancel' },
                  {
                    text: 'Выйти',
                    style: 'destructive',
                    onPress: () => {
                      logout();
                      router.replace('/auth/sign-in');
                    },
                  },
                ]);
              }}
            >
              <Text style={s.logoutText}>Выйти</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Subscription ─── */}
        <Text style={s.sectionLabel}>ПОДПИСКА</Text>
        <TouchableOpacity
          style={[g.card, s.card]}
          onPress={() => router.push('/subscription')}
          activeOpacity={0.7}
        >
          {tier === 'pro' ? (
            <View style={s.row}>
              <View style={s.rowInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.xs }}>
                  <View style={s.proBadge}>
                    <Text style={s.proBadgeText}>PRO</Text>
                  </View>
                  <Text style={[s.rowTitle, { color: c.accent.primary, fontWeight: '700', marginBottom: 0 }]}>
                    Премиум
                  </Text>
                </View>
                <Text style={s.rowSubtitle}>
                  ✨ Безлимитные токены · Все режимы
                </Text>
              </View>
              <Text style={s.chevron}>›</Text>
            </View>
          ) : (
            <View style={s.row}>
              <View style={s.rowInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.xs }}>
                  <View style={s.freeBadge}>
                    <Text style={s.freeBadgeText}>FREE</Text>
                  </View>
                  <Text style={[s.rowTitle, { fontWeight: '700', marginBottom: 0 }]}>
                    Бесплатный план
                  </Text>
                </View>
                <View style={s.quotaBarOuter}>
                  <View style={[s.quotaBarInner, { width: `${Math.min(100, (paraphrasesUsed / paraphrasesLimit) * 100)}%` }]} />
                </View>
                <Text style={[s.rowSubtitle, { marginTop: 4 }]}>
                  {paraphrasesUsed} из {paraphrasesLimit} токенов использовано
                </Text>
              </View>
              <Text style={s.chevron}>›</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* ─── Theme ─── */}
        <Text style={s.sectionLabel}>ТЕМА</Text>
        <View style={[g.card, s.card, s.themeCard]}>
          {themeOptions.map((option) => {
            const active = themeMode === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[s.themeOption, active && s.themeOptionActive]}
                onPress={() => setThemeMode(option.value)}
                activeOpacity={0.7}
              >
                <Text style={s.themeIcon}>{option.icon}</Text>
                <Text
                  style={[s.themeLabel, active && s.themeLabelActive]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ─── Cloud ─── */}
        <Text style={s.sectionLabel}>ОБЛАЧНЫЕ ФУНКЦИИ</Text>
        <View style={[g.card, s.card]}>
          <View style={s.row}>
            <View style={s.rowInfo}>
              <Text style={s.rowTitle}>Облачное перефразирование</Text>
              <Text style={s.rowSubtitle}>
                Включите для AI-перефразирования текста
              </Text>
            </View>
            <Switch
              value={cloudEnabled}
              onValueChange={setCloudEnabled}
              trackColor={{
                false: isDark ? '#3D3D3D' : '#E0E0E0',
                true: c.accent.primary,
              }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* ─── Keyboard ─── */}
        <Text style={s.sectionLabel}>КЛАВИАТУРА</Text>
        <View style={[g.card, s.card]}>
          <View style={[s.row, { marginBottom: spacing.sm }]}>
            <View style={s.rowInfo}>
              <Text style={s.rowTitle}>Статус клавиатуры</Text>
              {isChecking ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <ActivityIndicator size="small" color={c.accent.primary} />
                  <Text style={s.rowSubtitle}>Проверка…</Text>
                </View>
              ) : isKeyboardEnabled ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={s.statusDotGreen} />
                  <Text style={[s.rowSubtitle, { color: colors.success, fontWeight: '600' }]}>
                    {hasFullAccess
                      ? '🚀 Активна · Полный доступ'
                      : '⚡ Активна · Ограниченный доступ'}
                  </Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={s.statusDotRed} />
                  <Text style={[s.rowSubtitle, { color: colors.error, fontWeight: '600' }]}>
                    ⛔ Не активирована
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={s.separator} />

          <TouchableOpacity style={s.row} onPress={openKeyboardSettings}>
            <Text style={[s.rowTitle, { color: c.accent.primary, marginBottom: 0 }]}>
              Настройки клавиатуры
            </Text>
            <Text style={s.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Privacy ─── */}
        <Text style={s.sectionLabel}>ПРИВАТНОСТЬ</Text>
        <TouchableOpacity
          style={[g.card, s.card]}
          onPress={() => {
            Alert.alert(
              'Удалить все данные?',
              'Это действие необратимо. Все ваши данные будут удалены навсегда.',
              [
                { text: 'Отмена', style: 'cancel' },
                {
                  text: 'Удалить',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await apiDelete('/v1/user/delete');
                      logout();
                      Alert.alert('Данные удалены', 'Все ваши данные были удалены.', [
                        { text: 'OK' },
                      ]);
                    } catch {
                      Alert.alert('Ошибка', 'Не удалось удалить данные. Попробуйте позже.', [
                        { text: 'OK' },
                      ]);
                    }
                  },
                },
              ]
            );
          }}
          activeOpacity={0.7}
        >
          <Text style={s.dangerText}>Удалить мои данные</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ═══════════════════════════════════════════════════════════
   Dynamic styles
   ═══════════════════════════════════════════════════════════ */

function makeStyles(c: Colors, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background.primary,
    },
    header: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: c.text.primary,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: 120, // enough room for tab bar
    },

    /* Section */
    sectionLabel: {
      ...typography.captionMedium,
      color: c.text.tertiary,
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
      marginLeft: spacing.xs,
      letterSpacing: 0.6,
    },
    card: {
      padding: spacing.lg,
    },

    /* Account */
    accountRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.accent.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    avatarImage: {
      width: 44,
      height: 44,
      borderRadius: 22,
      marginRight: spacing.md,
    },
    avatarText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '700',
    },
    accountInfo: {
      flex: 1,
      marginRight: spacing.sm,
    },
    accountEmail: {
      ...typography.bodyMedium,
      color: c.text.primary,
      marginBottom: 2,
    },
    accountStatus: {
      ...typography.caption,
      color: c.text.tertiary,
    },
    logoutPill: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(255,59,48,0.12)' : 'rgba(255,59,48,0.08)',
    },
    logoutText: {
      color: colors.error,
      ...typography.buttonSmall,
    },

    /* Generic row */
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    rowInfo: {
      flex: 1,
      marginRight: spacing.md,
    },
    rowTitle: {
      ...typography.bodyMedium,
      color: c.text.primary,
      marginBottom: spacing.xs,
    },
    rowSubtitle: {
      ...typography.bodySmall,
      color: c.text.secondary,
    },
    chevron: {
      fontSize: 24,
      fontWeight: '300',
      color: c.text.tertiary,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
      marginVertical: spacing.sm,
    },

    /* Theme selector */
    themeCard: {
      flexDirection: 'row',
      padding: spacing.xs,
    },
    themeOption: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
      borderRadius: 12,
      gap: 6,
    },
    themeOptionActive: {
      backgroundColor: c.accent.primary,
    },
    themeIcon: {
      fontSize: 14,
    },
    themeLabel: {
      ...typography.buttonSmall,
      color: c.text.primary,
    },
    themeLabelActive: {
      color: '#FFFFFF',
    },

    /* Danger */
    dangerText: {
      ...typography.bodyMedium,
      color: colors.error,
    },

    /* Subscription badges */
    proBadge: {
      backgroundColor: c.accent.primary,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    proBadgeText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1,
    },
    freeBadge: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    freeBadgeText: {
      color: c.text.tertiary,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1,
    },

    /* Quota progress bar */
    quotaBarOuter: {
      height: 4,
      borderRadius: 2,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      marginTop: 6,
      overflow: 'hidden' as const,
    },
    quotaBarInner: {
      height: '100%' as any,
      borderRadius: 2,
      backgroundColor: c.accent.primary,
    },

    /* Keyboard status dots */
    statusDotGreen: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.success,
    },
    statusDotRed: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.error,
    },
  });
}
