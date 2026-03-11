/**
 * Full Access Screen
 * Explanation of Full Access and privacy
 * Always uses dark theme for a premium onboarding experience
 */

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { spacing, typography } from '@/theme';
import { darkColors } from '@/theme/colors';
import { useMemo } from 'react';
import type { Colors } from '@/theme';

export default function FullAccessScreen() {
  const { setHasCompletedOnboarding, setCloudEnabled } = useSettingsStore();
  // Onboarding always uses dark theme
  const c = darkColors;
  const s = useMemo(() => makeStyles(c), [c]);

  const handleComplete = (enableCloud: boolean) => {
    setCloudEnabled(enableCloud);
    setHasCompletedOnboarding(true);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar style="light" />
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <View style={s.header}>
          <View style={s.iconContainer}>
            <Text style={s.icon}>🔒</Text>
          </View>
          <Text style={s.title}>Полный доступ</Text>
          <Text style={s.subtitle}>
            Для работы AI-перефразирования нужен «Полный доступ»
          </Text>
        </View>

        {/* Why Full Access */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Зачем нужен полный доступ?</Text>
          <View style={s.card}>
            <Text style={s.cardText}>
              Полный доступ позволяет клавиатуре отправлять текст на наши серверы
              для AI-перефразирования. Без него доступна только локальная проверка
              орфографии.
            </Text>
          </View>
        </View>

        {/* Privacy promises */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Наши обещания по приватности</Text>

          <PrivacyItem c={c} emoji="✅" text="Тексты отправляются только при нажатии «Перефразировать»" />
          <PrivacyItem c={c} emoji="✅" text="Мы НЕ храним ваши тексты на серверах" />
          <PrivacyItem c={c} emoji="✅" text="Персональные данные (телефоны, email) маскируются" />
          <PrivacyItem c={c} emoji="✅" text="Вы можете удалить все данные в настройках" />
          <PrivacyItem c={c} emoji="✅" text="Локальная проверка работает без интернета" />
        </View>
      </ScrollView>

      {/* Buttons */}
      <View style={s.buttons}>
        <TouchableOpacity
          style={s.primaryButton}
          onPress={() => handleComplete(true)}
          activeOpacity={0.8}
        >
          <Text style={s.primaryButtonText}>
            Включить облачные функции
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.secondaryButton}
          onPress={() => handleComplete(false)}
          activeOpacity={0.8}
        >
          <Text style={s.secondaryButtonText}>
            Только локальная проверка
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function PrivacyItem({ c, emoji, text }: { c: Colors; emoji: string; text: string }) {
  return (
    <View style={privacyStyles.item}>
      <Text style={privacyStyles.emoji}>{emoji}</Text>
      <Text style={[privacyStyles.text, { color: c.text.primary }]}>{text}</Text>
    </View>
  );
}

const privacyStyles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  emoji: {
    fontSize: 16,
    marginRight: spacing.md,
    marginTop: 2,
  },
  text: {
    ...typography.body,
    flex: 1,
  },
});

function makeStyles(c: Colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background.primary,
    },
    scroll: {
      flex: 1,
    },
    content: {
      padding: spacing.xl,
      paddingBottom: spacing.lg,
    },
    header: {
      alignItems: 'center',
      marginBottom: spacing.xxl,
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: c.background.secondary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    icon: {
      fontSize: 40,
    },
    title: {
      ...typography.h2,
      color: c.text.primary,
      marginBottom: spacing.sm,
    },
    subtitle: {
      ...typography.body,
      color: c.text.secondary,
      textAlign: 'center',
    },
    section: {
      marginBottom: spacing.xl,
    },
    sectionTitle: {
      ...typography.bodyMedium,
      color: c.text.primary,
      marginBottom: spacing.md,
    },
    card: {
      backgroundColor: c.background.secondary,
      padding: spacing.lg,
      borderRadius: 12,
    },
    cardText: {
      ...typography.body,
      color: c.text.secondary,
      lineHeight: 24,
    },
    buttons: {
      padding: spacing.xl,
      gap: spacing.md,
    },
    primaryButton: {
      backgroundColor: c.accent.primary,
      paddingVertical: spacing.lg,
      borderRadius: 12,
      alignItems: 'center',
    },
    primaryButtonText: {
      ...typography.button,
      color: c.white,
    },
    secondaryButton: {
      backgroundColor: c.background.secondary,
      paddingVertical: spacing.lg,
      borderRadius: 12,
      alignItems: 'center',
    },
    secondaryButtonText: {
      ...typography.button,
      color: c.text.primary,
    },
  });
}
