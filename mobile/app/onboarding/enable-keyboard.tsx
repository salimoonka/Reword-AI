/**
 * Enable Keyboard Screen
 * Step-by-step instructions to enable keyboard
 * Always uses dark theme for a premium onboarding experience
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
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { spacing, typography } from '@/theme';
import { darkColors } from '@/theme/colors';
import { useMemo } from 'react';
import type { Colors } from '@/theme';

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
  // Onboarding always uses dark theme
  const c = darkColors;
  const s = useMemo(() => makeStyles(c), [c]);
  const steps = Platform.OS === 'ios' ? iosSteps : androidSteps;

  const openSettings = async () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      try {
        await Linking.sendIntent('android.settings.INPUT_METHOD_SETTINGS');
      } catch {
        Linking.openSettings();
      }
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar style="light" />
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <View style={s.header}>
          <Text style={s.title}>Включите клавиатуру</Text>
          <Text style={s.subtitle}>
            Следуйте этим шагам, чтобы добавить Reword AI
          </Text>
        </View>

        {/* Steps */}
        <View style={s.steps}>
          {steps.map((step, index) => (
            <View key={index} style={s.stepItem}>
              <View style={s.stepNumber}>
                <Text style={s.stepNumberText}>{index + 1}</Text>
              </View>
              <Text style={s.stepText}>{step}</Text>
            </View>
          ))}
        </View>

      </ScrollView>

      {/* Buttons */}
      <View style={s.buttons}>
        <TouchableOpacity
          style={s.settingsButton}
          onPress={openSettings}
          activeOpacity={0.8}
        >
          <Text style={s.settingsButtonText}>Открыть настройки</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.continueButton}
          onPress={() => router.push('/onboarding/full-access')}
          activeOpacity={0.8}
        >
          <Text style={s.continueButtonText}>Продолжить</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

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
      marginBottom: spacing.xl,
    },
    title: {
      ...typography.h2,
      color: c.text.primary,
      marginBottom: spacing.sm,
    },
    subtitle: {
      ...typography.body,
      color: c.text.secondary,
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
      backgroundColor: c.accent.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    stepNumberText: {
      ...typography.captionMedium,
      color: c.white,
    },
    stepText: {
      ...typography.body,
      color: c.text.primary,
      flex: 1,
      paddingTop: spacing.xs,
    },
    buttons: {
      padding: spacing.xl,
      gap: spacing.md,
    },
    settingsButton: {
      backgroundColor: c.background.secondary,
      paddingVertical: spacing.lg,
      borderRadius: 12,
      alignItems: 'center',
    },
    settingsButtonText: {
      ...typography.button,
      color: c.accent.primary,
    },
    continueButton: {
      backgroundColor: c.accent.primary,
      paddingVertical: spacing.lg,
      borderRadius: 12,
      alignItems: 'center',
    },
    continueButtonText: {
      ...typography.button,
      color: c.white,
    },
  });
}
