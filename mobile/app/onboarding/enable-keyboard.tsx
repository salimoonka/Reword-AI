/**
 * Enable Keyboard Screen
 * Step-by-step instructions to enable keyboard
 */

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Linking,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, spacing, typography } from '@/theme';

const iosSteps = [
  'Откройте «Настройки» на вашем iPhone',
  'Перейдите в «Основные» → «Клавиатура»',
  'Нажмите «Клавиатуры» → «Новые клавиатуры»',
  'Выберите «Reword AI» из списка',
  'Нажмите на «Reword AI» и включите «Полный доступ»',
];

const androidSteps = [
  'Откройте «Настройки» на вашем устройстве',
  'Перейдите в «Система» → «Языки и ввод»',
  'Нажмите «Виртуальная клавиатура» или «Клавиатура по умолчанию»',
  'Включите «Reword AI»',
  'Выберите «Reword AI» как клавиатуру по умолчанию',
];

export default function EnableKeyboardScreen() {
  const steps = Platform.OS === 'ios' ? iosSteps : androidSteps;

  const openSettings = async () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      // Open Android Input Method settings directly
      try {
        await Linking.sendIntent('android.settings.INPUT_METHOD_SETTINGS');
      } catch {
        Linking.openSettings();
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Включите клавиатуру</Text>
          <Text style={styles.subtitle}>
            Следуйте этим шагам, чтобы добавить Reword AI
          </Text>
        </View>

        {/* Steps */}
        <View style={styles.steps}>
          {steps.map((step, index) => (
            <View key={index} style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        {/* Image placeholder */}
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imagePlaceholderText}>
            📱 Скриншот настроек
          </Text>
        </View>
      </ScrollView>

      {/* Buttons */}
      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={openSettings}
          activeOpacity={0.8}
        >
          <Text style={styles.settingsButtonText}>Открыть настройки</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => router.push('/onboarding/full-access')}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>Продолжить</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
  },
  steps: {
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  stepNumberText: {
    ...typography.captionMedium,
    color: colors.white,
  },
  stepText: {
    ...typography.body,
    color: colors.text.primary,
    flex: 1,
    paddingTop: spacing.xs,
  },
  imagePlaceholder: {
    height: 200,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    ...typography.body,
    color: colors.text.tertiary,
  },
  buttons: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  settingsButton: {
    backgroundColor: colors.background.secondary,
    paddingVertical: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
  },
  settingsButtonText: {
    ...typography.button,
    color: colors.accent.primary,
  },
  continueButton: {
    backgroundColor: colors.accent.primary,
    paddingVertical: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonText: {
    ...typography.button,
    color: colors.white,
  },
});
