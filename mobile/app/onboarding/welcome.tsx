/**
 * Onboarding Welcome Screen
 * Value proposition + Add Keyboard button
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
import { colors, spacing, typography } from '@/theme';
import { useRef, useEffect } from 'react';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
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
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {/* Hero Section */}
        <View style={styles.hero}>
          {/* Placeholder for illustration */}
          <View style={styles.illustration} />
          
          <Text style={styles.title}>
            Пишите умнее{'\n'}на русском языке
          </Text>
          
          <Text style={styles.subtitle}>
            Мгновенная проверка орфографии и AI-перефразирование в одно касание
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <FeatureItem
            emoji="✓"
            title="Локальная проверка"
            description="Работает офлайн, быстро и приватно"
          />
          <FeatureItem
            emoji="✨"
            title="AI-перефразирование"
            description="8 режимов: формальный, дружелюбный и другие"
          />
          <FeatureItem
            emoji="🔒"
            title="Приватность"
            description="Мы не храним ваши тексты"
          />
        </View>

        {/* CTA Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/onboarding/enable-keyboard')}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Добавить клавиатуру</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

function FeatureItem({
  emoji,
  title,
  description,
}: {
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIcon}>
        <Text style={styles.featureEmoji}>{emoji}</Text>
      </View>
      <View style={styles.featureText}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
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
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  features: {
    gap: spacing.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  featureEmoji: {
    fontSize: 20,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  featureDescription: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  button: {
    backgroundColor: colors.accent.primary,
    paddingVertical: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  buttonText: {
    ...typography.button,
    color: colors.white,
  },
});
