/**
 * Onboarding Welcome Screen
 * Value proposition + Add Keyboard button
 * Always uses dark theme for a premium onboarding experience
 */

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { spacing, typography } from '@/theme';
import { darkColors } from '@/theme/colors';
import { useRef, useEffect, useMemo } from 'react';
import type { Colors } from '@/theme';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  // Onboarding always uses dark theme
  const c = darkColors;
  const s = useMemo(() => makeStyles(c), [c]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={s.container}>
      <Animated.View style={[s.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {/* Hero Section */}
        <View style={s.hero}>
          <View style={s.illustration} />

          <Text style={s.title}>
            Пишите умнее{'\n'}на русском языке
          </Text>

          <Text style={s.subtitle}>
            Мгновенная проверка орфографии и AI-перефразирование в одно касание
          </Text>
        </View>

        {/* Features */}
        <View style={s.features}>
          <FeatureItem c={c} emoji="✓" title="Локальная проверка" description="Работает офлайн, быстро и приватно" />
          <FeatureItem c={c} emoji="✨" title="AI-перефразирование" description="8 режимов: формальный, дружелюбный и другие" />
          <FeatureItem c={c} emoji="🔒" title="Приватность" description="Мы не храним ваши тексты" />
        </View>

        {/* CTA Button */}
        <TouchableOpacity
          style={s.button}
          onPress={() => router.push('/onboarding/enable-keyboard')}
          activeOpacity={0.8}
        >
          <Text style={s.buttonText}>Добавить клавиатуру</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

function FeatureItem({
  c,
  emoji,
  title,
  description,
}: {
  c: Colors;
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <View style={featureStyles.item}>
      <View style={[featureStyles.icon, { backgroundColor: c.background.secondary }]}>
        <Text style={featureStyles.emoji}>{emoji}</Text>
      </View>
      <View style={featureStyles.text}>
        <Text style={[featureStyles.title, { color: c.text.primary }]}>{title}</Text>
        <Text style={[featureStyles.desc, { color: c.text.secondary }]}>{description}</Text>
      </View>
    </View>
  );
}

const featureStyles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center' },
  icon: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.lg,
  },
  emoji: { fontSize: 20 },
  text: { flex: 1 },
  title: { ...typography.bodyMedium, marginBottom: spacing.xs },
  desc: { ...typography.bodySmall },
});

function makeStyles(c: Colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background.primary,
    },
    content: {
      flex: 1,
      padding: spacing.xl,
      justifyContent: 'space-between',
    },
    hero: {
      alignItems: 'center',
      paddingTop: spacing.xxxl,
    },
    illustration: {
      width: width * 0.6,
      height: width * 0.4,
      backgroundColor: c.background.secondary,
      borderRadius: 16,
      marginBottom: spacing.xl,
    },
    title: {
      ...typography.h1,
      color: c.text.primary,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    subtitle: {
      ...typography.body,
      color: c.text.secondary,
      textAlign: 'center',
      paddingHorizontal: spacing.lg,
    },
    features: {
      gap: spacing.lg,
    },
    button: {
      backgroundColor: c.accent.primary,
      paddingVertical: spacing.lg,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    buttonText: {
      ...typography.button,
      color: c.white,
    },
  });
}
