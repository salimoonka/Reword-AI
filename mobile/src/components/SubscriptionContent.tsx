/**
 * SubscriptionContent — shared subscription UI used by both the tab and modal screens.
 * Accepts `variant` to control header/footer differences:
 *   - "tab"   → no back button, CTA + restore inside scroll
 *   - "modal" → back button header, restore link in header, sticky footer CTA
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
import * as WebBrowser from 'expo-web-browser';

const { width: SCREEN_W } = Dimensions.get('window');

const FEATURES = [
  { icon: 'infinite-outline' as const, title: 'Безлимитные генерации', desc: 'Перефразируйте сколько угодно текстов' },
  { icon: 'flash-outline' as const, title: 'Приоритетная обработка', desc: 'Ваши запросы обрабатываются первыми' },
  { icon: 'color-palette-outline' as const, title: 'Все 8 режимов', desc: 'Полный доступ ко всем стилям письма' },
  { icon: 'shield-checkmark-outline' as const, title: 'Без рекламы', desc: 'Чистый интерфейс без отвлечений' },
];

interface SubscriptionContentProps {
  variant: 'tab' | 'modal';
  onBack?: () => void;
}

export default function SubscriptionContent({ variant, onBack }: SubscriptionContentProps) {
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
        Alert.alert('Готово', 'Подписка восстановлена!', [
          { text: 'OK', onPress: variant === 'modal' ? onBack : undefined },
        ]);
      } else {
        Alert.alert('Покупки не найдены', 'Активных подписок не обнаружено.', [
          { text: 'OK' },
        ]);
      }
    } catch (error) {
      Alert.alert(
        'Ошибка',
        'Не удалось восстановить покупки. Попробуйте позже.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsRestoring(false);
    }
  }, [isRestoring, variant, onBack]);

  const bgPrimary = isDarkMode ? '#0D0D0D' : '#F2F0F7';
  const cardBg = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)';
  const cardBorder = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(155,109,255,0.15)';
  const textPrimary = isDarkMode ? '#FFFFFF' : '#1A1A1A';
  const textSecondary = isDarkMode ? '#B3B3B3' : '#666666';
  const blurTint = isDarkMode ? 'dark' : 'light';

  // ── Shared inner content ──
  const renderScrollContent = () => (
    <>
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

      {/* Website card */}
      <BlurView intensity={isDarkMode ? 30 : 50} tint={blurTint} style={[styles.websiteCard, { borderColor: cardBorder }]}>
        <View style={styles.websiteCardInner}>
          <View style={styles.websiteIconWrap}>
            <Ionicons name="globe-outline" size={24} color={colors.accent.primary} />
          </View>
          <Text style={[styles.websiteTitle, { color: textPrimary }]}>
            Оплата на сайте
          </Text>
          <Text style={[styles.websiteDesc, { color: textSecondary }]}>
            Посетите наш сайт для подробной информации о подписке и дополнительных способов оплаты
          </Text>
          <TouchableOpacity
            style={styles.websiteButton}
            onPress={() => WebBrowser.openBrowserAsync('https://reword-website.onrender.com/subscribe')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['rgba(155,109,255,0.15)', 'rgba(155,109,255,0.05)']}
              style={styles.websiteButtonGradient}
            >
              <Ionicons name="open-outline" size={16} color={colors.accent.primary} />
              <Text style={styles.websiteButtonText}>Открыть сайт</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </BlurView>

      {/* Legal */}
      <Text style={[styles.legal, { color: isDarkMode ? '#666' : '#999' }]}>
        Подписка автоматически продлевается каждый месяц.{' '}
        Отменить можно в настройках {Platform.OS === 'ios' ? 'App Store' : 'Google Play'} в любое время.
        Оплата списывается с аккаунта {Platform.OS === 'ios' ? 'Apple ID' : 'Google'} после
        окончания пробного периода.
      </Text>
    </>
  );

  // ── CTA Button (shared) ──
  const renderCTAButton = () => (
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
  );

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
        {/* Modal header with back button + restore link */}
        {variant === 'modal' && (
          <View style={styles.header}>
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: cardBg, borderColor: cardBorder }]}
              onPress={onBack}
            >
              <Ionicons name="chevron-back" size={22} color={textPrimary} />
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={handleRestore} disabled={isRestoring}>
              <Text style={[styles.restoreLink, { color: '#FFFFFF' }]}>
                {isRestoring ? 'Загрузка...' : 'Восстановить'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            variant === 'tab' && { paddingBottom: 100 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {renderScrollContent()}

          {/* Tab variant: CTA + restore inside scroll */}
          {variant === 'tab' && (
            <View style={styles.tabCTAContainer}>
              {!isProUser && renderCTAButton()}
              <TouchableOpacity
                style={styles.restoreButton}
                onPress={handleRestore}
                disabled={isRestoring}
              >
                {isRestoring ? (
                  <ActivityIndicator color={textSecondary} size="small" />
                ) : (
                  <Text style={[styles.restoreText, { color: '#FFFFFF' }]}>
                    Восстановить покупки
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Modal variant: sticky footer CTA */}
        {variant === 'modal' && !isProUser && (
          <View style={styles.footer}>
            {renderCTAButton()}
          </View>
        )}
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

  // Header (modal only)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  restoreLink: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 32,
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

  // Website card
  websiteCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  websiteCardInner: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: spacing.lg,
  },
  websiteIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(155,109,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  websiteTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  websiteDesc: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  websiteButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  websiteButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  websiteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9B6DFF',
  },

  // Legal
  legal: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },

  // Tab variant CTA
  tabCTAContainer: {
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

  // Modal variant footer
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 8 : spacing.lg,
  },
});
