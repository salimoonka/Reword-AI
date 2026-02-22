/**
 * Subscription Tab Page
 * Glassmorphism PRO subscription – mirrors the standalone PRO page
 * without the back arrow; CTA + restore buttons stay in scroll content
 */

import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  useColorScheme,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/theme';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useSubscriptionStore } from '@/stores/useSubscriptionStore';
import {
  PRODUCT_IDS,
  fetchSubscriptions,
  purchaseSubscription,
  restorePurchases,
  getProductPrice,
  type ProductSubscription,
} from '@/services/iap';

const { width: SCREEN_W } = Dimensions.get('window');

const FEATURES = [
  { icon: 'infinite-outline' as const, title: 'Безлимитные генерации', desc: 'Перефразируйте сколько угодно текстов' },
  { icon: 'flash-outline' as const, title: 'Приоритетная обработка', desc: 'Ваши запросы обрабатываются первыми' },
  { icon: 'color-palette-outline' as const, title: 'Все 8 режимов', desc: 'Полный доступ ко всем стилям письма' },
  { icon: 'shield-checkmark-outline' as const, title: 'Без рекламы', desc: 'Чистый интерфейс без отвлечений' },
];

export default function SubscriptionTab() {
  const colorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const { tier } = useSubscriptionStore();

  const isDarkMode =
    themeMode === 'dark' || (themeMode === 'auto' && colorScheme === 'dark');

  const [subscriptions, setSubscriptions] = useState<ProductSubscription[]>([]);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isProUser = tier === 'pro';

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const subs = await fetchSubscriptions();
      setSubscriptions(subs);
    } catch (error) {
      console.error('[Subscription] Failed to load products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const storeProduct = subscriptions.find(
    (s) => s.id === PRODUCT_IDS.PRO_MONTHLY
  );
  const displayPrice = getProductPrice(
    PRODUCT_IDS.PRO_MONTHLY,
    storeProduct?.displayPrice ?? undefined
  );

  const handlePurchase = useCallback(async () => {
    if (isPurchasing) return;
    setIsPurchasing(true);
    try {
      await purchaseSubscription(PRODUCT_IDS.PRO_MONTHLY, subscriptions);
    } catch (error: any) {
      Alert.alert(
        'Ошибка покупки',
        'Не удалось оформить подписку. Попробуйте позже.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsPurchasing(false);
    }
  }, [isPurchasing, subscriptions]);

  const handleRestore = useCallback(async () => {
    if (isRestoring) return;
    setIsRestoring(true);
    try {
      const result = await restorePurchases();
      if (result && result.subscription.is_premium) {
        Alert.alert('Готово', 'Подписка восстановлена!');
      } else {
        Alert.alert('Покупки не найдены', 'Активных подписок не обнаружено.');
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось восстановить покупки.');
    } finally {
      setIsRestoring(false);
    }
  }, [isRestoring]);

  const bgPrimary = isDarkMode ? '#0D0D0D' : '#F2F0F7';
  const cardBorder = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(155,109,255,0.15)';
  const textPrimary = isDarkMode ? '#FFFFFF' : '#1A1A1A';
  const textSecondary = isDarkMode ? '#B3B3B3' : '#666666';
  const blurTint = isDarkMode ? 'dark' : 'light';

  return (
    <View style={[styles.container, { backgroundColor: bgPrimary }]}>
      {/* Gradient orbs */}
      <View style={styles.orbContainer}>
        <LinearGradient
          colors={['rgba(155,109,255,0.35)', 'rgba(155,109,255,0)']}
          style={[styles.orb, styles.orb1]}
        />
        <LinearGradient
          colors={['rgba(100,180,255,0.25)', 'rgba(100,180,255,0)']}
          style={[styles.orb, styles.orb2]}
        />
        <LinearGradient
          colors={['rgba(200,130,255,0.2)', 'rgba(200,130,255,0)']}
          style={[styles.orb, styles.orb3]}
        />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View style={styles.heroSection}>
            <View style={styles.heroBadge}>
              <LinearGradient
                colors={['#9B6DFF', '#7B4FE0']}
                style={styles.heroBadgeGradient}
              >
                <Ionicons name="diamond" size={32} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <Text style={[styles.heroTitle, { color: textPrimary }]}>
              Reword AI PRO
            </Text>
            <Text style={[styles.heroSubtitle, { color: textSecondary }]}>
              Раскройте полный потенциал{'\n'}искусственного интеллекта
            </Text>
          </View>

          {/* Features grid — glass cards */}
          <View style={styles.featuresGrid}>
            {FEATURES.map((f, i) => (
              <BlurView key={i} intensity={isDarkMode ? 30 : 50} tint={blurTint} style={[styles.featureCard, { borderColor: cardBorder }]}>
                <View style={styles.featureCardInner}>
                  <View style={styles.featureIconWrap}>
                    <Ionicons name={f.icon} size={22} color={colors.accent.primary} />
                  </View>
                  <Text style={[styles.featureTitle, { color: textPrimary }]}>{f.title}</Text>
                  <Text style={[styles.featureDesc, { color: textSecondary }]}>{f.desc}</Text>
                </View>
              </BlurView>
            ))}
          </View>

          {/* Active PRO badge */}
          {isProUser && (
            <BlurView intensity={isDarkMode ? 30 : 50} tint={blurTint} style={[styles.activeCard, { borderColor: 'rgba(57,192,124,0.3)' }]}>
              <View style={styles.activeCardInner}>
                <Ionicons name="checkmark-circle" size={24} color={colors.status.success} />
                <Text style={[styles.activeLabel, { color: colors.status.success }]}>Подписка активна</Text>
                <Text style={[styles.activeDesc, { color: textSecondary }]}>
                  Вы используете PRO-версию Reword AI
                </Text>
              </View>
            </BlurView>
          )}

          {/* Price card */}
          {!isProUser && (
            <BlurView intensity={isDarkMode ? 40 : 60} tint={blurTint} style={[styles.priceGlass, { borderColor: cardBorder }]}>
              <View style={styles.priceGlassInner}>
                <Text style={[styles.priceLabel, { color: textSecondary }]}>Ежемесячная подписка</Text>
                {isLoading ? (
                  <ActivityIndicator color={colors.accent.primary} size="small" />
                ) : (
                  <View style={styles.priceRow}>
                    <Text style={[styles.priceAmount, { color: textPrimary }]}>{displayPrice}</Text>
                    <Text style={[styles.pricePeriod, { color: textSecondary }]}>/месяц</Text>
                  </View>
                )}
                <Text style={[styles.priceTrial, { color: colors.accent.primary }]}>
                  7 дней бесплатно
                </Text>
              </View>
            </BlurView>
          )}

          {/* Legal */}
          <Text style={[styles.legal, { color: isDarkMode ? '#666' : '#999' }]}>
            Подписка автоматически продлевается каждый месяц.{' '}
            Отменить можно в настройках {Platform.OS === 'ios' ? 'App Store' : 'Google Play'} в любое время.
            Оплата списывается с аккаунта {Platform.OS === 'ios' ? 'Apple ID' : 'Google'} после
            окончания пробного периода.
          </Text>

          {/* CTA Buttons — inside scroll content */}
          <View style={styles.ctaContainer}>
            {!isProUser && (
              <TouchableOpacity
                style={[styles.ctaButton, isPurchasing && { opacity: 0.6 }]}
                onPress={handlePurchase}
                activeOpacity={0.85}
                disabled={isPurchasing || isLoading}
              >
                <LinearGradient
                  colors={['#9B6DFF', '#7B4FE0']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.ctaGradient}
                >
                  {isPurchasing ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.ctaText}>Попробовать бесплатно</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestore}
              disabled={isRestoring}
            >
              {isRestoring ? (
                <ActivityIndicator color={textSecondary} size="small" />
              ) : (
                <Text style={[styles.restoreText, { color: isDarkMode ? colors.text.secondary : '#888' }]}>
                  Восстановить покупки
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },

  // Gradient orbs
  orbContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orb1: {
    width: SCREEN_W * 0.9,
    height: SCREEN_W * 0.9,
    top: -SCREEN_W * 0.25,
    right: -SCREEN_W * 0.2,
  },
  orb2: {
    width: SCREEN_W * 0.7,
    height: SCREEN_W * 0.7,
    top: SCREEN_W * 0.5,
    left: -SCREEN_W * 0.3,
  },
  orb3: {
    width: SCREEN_W * 0.5,
    height: SCREEN_W * 0.5,
    bottom: 80,
    right: -SCREEN_W * 0.1,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
  },

  // Hero
  heroSection: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  heroBadge: {
    marginBottom: spacing.lg,
  },
  heroBadgeGradient: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },

  // Features grid
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: spacing.xl,
  },
  featureCard: {
    width: (SCREEN_W - spacing.lg * 2 - 12) / 2,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  featureCardInner: {
    padding: spacing.md,
    paddingVertical: 18,
  },
  featureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(155,109,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 12,
    lineHeight: 16,
  },

  // Active card
  activeCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: spacing.xl,
  },
  activeCardInner: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: 8,
  },
  activeLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  activeDesc: {
    fontSize: 14,
    textAlign: 'center',
  },

  // Price glass
  priceGlass: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  priceGlassInner: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: spacing.lg,
    gap: 6,
  },
  priceLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  priceAmount: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  pricePeriod: {
    fontSize: 16,
    fontWeight: '500',
  },
  priceTrial: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },

  // Legal
  legal: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },

  // CTA container (inside scroll)
  ctaContainer: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  ctaButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  ctaGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  restoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  restoreText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
