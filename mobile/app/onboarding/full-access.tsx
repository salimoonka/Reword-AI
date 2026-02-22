/**
 * Full Access Screen
 * Explanation of Full Access and privacy
 */

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { colors, spacing, typography } from '@/theme';

export default function FullAccessScreen() {
  const { setHasCompletedOnboarding, setCloudEnabled } = useSettingsStore();

  const handleComplete = (enableCloud: boolean) => {
    setCloudEnabled(enableCloud);
    setHasCompletedOnboarding(true);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🔒</Text>
          </View>
          <Text style={styles.title}>Полный доступ</Text>
          <Text style={styles.subtitle}>
            Для работы AI-перефразирования нужен «Полный доступ»
          </Text>
        </View>

        {/* Why Full Access */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Зачем нужен полный доступ?</Text>
          <View style={styles.card}>
            <Text style={styles.cardText}>
              Полный доступ позволяет клавиатуре отправлять текст на наши серверы
              для AI-перефразирования. Без него доступна только локальная проверка
              орфографии.
            </Text>
          </View>
        </View>

        {/* Privacy promises */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Наши обещания по приватности</Text>
          
          <PrivacyItem
            emoji="✅"
            text="Тексты отправляются только при нажатии «Перефразировать»"
          />
          <PrivacyItem
            emoji="✅"
            text="Мы НЕ храним ваши тексты на серверах"
          />
          <PrivacyItem
            emoji="✅"
            text="Персональные данные (телефоны, email) маскируются"
          />
          <PrivacyItem
            emoji="✅"
            text="Вы можете удалить все данные в настройках"
          />
          <PrivacyItem
            emoji="✅"
            text="Локальная проверка работает без интернета"
          />
        </View>
      </ScrollView>

      {/* Buttons */}
      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => handleComplete(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>
            Включить облачные функции
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => handleComplete(false)}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>
            Только локальная проверка
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function PrivacyItem({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={styles.privacyItem}>
      <Text style={styles.privacyEmoji}>{emoji}</Text>
      <Text style={styles.privacyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
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
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.background.secondary,
    padding: spacing.lg,
    borderRadius: 12,
  },
  cardText: {
    ...typography.body,
    color: colors.text.secondary,
    lineHeight: 24,
  },
  privacyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  privacyEmoji: {
    fontSize: 16,
    marginRight: spacing.md,
    marginTop: 2,
  },
  privacyText: {
    ...typography.body,
    color: colors.text.primary,
    flex: 1,
  },
  buttons: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.accent.primary,
    paddingVertical: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.white,
  },
  secondaryButton: {
    backgroundColor: colors.background.secondary,
    paddingVertical: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    ...typography.button,
    color: colors.text.primary,
  },
});
