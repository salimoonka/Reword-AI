/**
 * Sign-In Screen - Modern glassmorphism design
 * Google OAuth / Email OTP / Anonymous — matching Reword AI PRO visual style
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/services/supabase/client';
import { useUserStore } from '@/stores/useUserStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { colors, spacing } from '@/theme';
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';

const { width: SCREEN_W } = Dimensions.get('window');

type AuthStep = 'choice' | 'email-input' | 'otp-verify';

export default function SignInScreen() {
  const [step, setStep] = useState<AuthStep>('choice');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const emailInputRef = useRef<TextInput>(null);
  const otpInputRef = useRef<TextInput>(null);

  const { setTokens, setUser } = useUserStore();
  const colorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const isDarkMode =
    themeMode === 'dark' || (themeMode === 'auto' && colorScheme === 'dark');

  // ─── Theme tokens (matching subscription page) ──────────────────
  const bgPrimary = isDarkMode ? '#0D0D0D' : '#F2F0F7';
  const cardBg = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)';
  const cardBorder = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(155,109,255,0.15)';
  const textPrimary = isDarkMode ? '#FFFFFF' : '#1A1A1A';
  const textSecondary = isDarkMode ? '#B3B3B3' : '#666666';
  const textTertiary = isDarkMode ? '#808080' : '#999999';
  const blurTint = isDarkMode ? ('dark' as const) : ('light' as const);
  const inputBg = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const inputBorder = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

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

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Handle deep link for OAuth callback
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      if (__DEV__) console.log('[Auth] Deep link:', event.url);
    };
    const sub = Linking.addEventListener('url', handleDeepLink);
    return () => sub.remove();
  }, []);

  const syncSession = useCallback(
    async (accessToken: string, refreshToken: string, userId: string, userEmail?: string) => {
      await SecureStore.setItemAsync('access_token', accessToken);
      await SecureStore.setItemAsync('refresh_token', refreshToken);
      setTokens(accessToken, refreshToken);
      setUser({
        id: userId,
        email: userEmail,
        createdAt: new Date().toISOString(),
      });
    },
    [setTokens, setUser],
  );

  const navigateAfterAuth = () => {
    const { hasCompletedOnboarding } = useSettingsStore.getState();
    if (hasCompletedOnboarding) {
      router.replace('/(tabs)');
    } else {
      router.replace('/onboarding/welcome');
    }
  };

  /** Sign in with Google OAuth */
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use explicit scheme-based URL for production builds
      // Linking.createURL may vary between dev/prod; force the correct deep link
      const expoUrl = Linking.createURL('auth/callback');
      const redirectUrl = __DEV__ ? expoUrl : 'rewordai://auth/callback';

      if (__DEV__) console.log('[Auth] OAuth redirectTo:', redirectUrl);

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: { prompt: 'select_account' },
          skipBrowserRedirect: true, // We handle opening the URL ourselves
        },
      });
      if (oauthError) throw oauthError;
      if (data?.url) {
        // Open the OAuth URL in external browser
        await Linking.openURL(data.url);
      }
    } catch (err: any) {
      console.error('[Auth] Google sign-in error:', err);
      setError(err.message || 'Ошибка входа через Google. Попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  /** Send OTP to email */
  const handleSendOtp = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Введите корректный email');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          shouldCreateUser: true,
          // Do NOT set emailRedirectTo — we want a 6-digit OTP code, not a magic link.
          // The Supabase Dashboard email template must use {{ .Token }} for this to work.
        },
      });
      if (otpError) throw otpError;
      setStep('otp-verify');
      setCountdown(60);
      setTimeout(() => otpInputRef.current?.focus(), 300);
    } catch (err: any) {
      console.error('[Auth] OTP send error:', err);
      setError(err.message || 'Не удалось отправить код. Попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  /** Verify OTP code */
  const handleVerifyOtp = async () => {
    const trimmedOtp = otp.trim();
    if (trimmedOtp.length < 6) {
      setError('Введите 6-значный код из письма');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: trimmedOtp,
        type: 'email',
      });
      if (verifyError) throw verifyError;
      if (data.session) {
        await syncSession(
          data.session.access_token,
          data.session.refresh_token,
          data.session.user.id,
          data.session.user.email ?? undefined,
        );
        navigateAfterAuth();
      }
    } catch (err: any) {
      console.error('[Auth] OTP verify error:', err);
      if (err.message?.includes('expired')) {
        setError('Код истёк. Запросите новый.');
      } else {
        setError(err.message || 'Неверный код. Попробуйте ещё раз.');
      }
    } finally {
      setLoading(false);
    }
  };

  /** Continue without account (anonymous) */
  const handleSkip = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: anonError } = await supabase.auth.signInAnonymously();
      if (anonError) throw anonError;
      if (data.session) {
        await syncSession(
          data.session.access_token,
          data.session.refresh_token,
          data.session.user.id,
        );
      }
      navigateAfterAuth();
    } catch (err: any) {
      console.error('[Auth] Anonymous sign-in error:', err);
      setError('Не удалось продолжить. Проверьте подключение к интернету.');
    } finally {
      setLoading(false);
    }
  };

  /** Resend OTP */
  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setOtp('');
    await handleSendOtp();
  };

  // ────────────────────────────────── RENDER ──────────────────────────────────

  const renderChoiceStep = () => (
    <View style={styles.stepContainer}>
      {/* Hero section */}
      <View style={styles.heroSection}>
        <View style={styles.heroBadge}>
          <LinearGradient
            colors={['#9B6DFF', '#7B4FE0']}
            style={styles.heroBadgeGradient}
          >
            <Text style={styles.heroBadgeIcon}>✦</Text>
          </LinearGradient>
        </View>
        <Text style={[styles.heroTitle, { color: textPrimary }]}>
          Reword AI
        </Text>
        <Text style={[styles.heroSubtitle, { color: textSecondary }]}>
          Войдите, чтобы сохранять историю{'\n'}и синхронизировать подписку
        </Text>
      </View>

      {/* Auth buttons in glass card */}
      <BlurView
        intensity={isDarkMode ? 30 : 50}
        tint={blurTint}
        style={[styles.authCard, { borderColor: cardBorder }]}
      >
        <View style={styles.authCardInner}>
          {/* Google sign in */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#FFFFFF', '#F0F0F0']}
              style={styles.googleGradient}
            >
              {loading ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={20} color="#000" />
                  <Text style={styles.googleButtonText}>Войти через Google</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: cardBorder }]} />
            <Text style={[styles.dividerText, { color: textTertiary }]}>или</Text>
            <View style={[styles.dividerLine, { backgroundColor: cardBorder }]} />
          </View>

          {/* Email sign in */}
          <TouchableOpacity
            style={[styles.emailButton, { backgroundColor: inputBg, borderColor: inputBorder }]}
            onPress={() => {
              setStep('email-input');
              setTimeout(() => emailInputRef.current?.focus(), 300);
            }}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Ionicons name="mail-outline" size={20} color={textPrimary} />
            <Text style={[styles.emailButtonText, { color: textPrimary }]}>
              Войти через Email
            </Text>
          </TouchableOpacity>
        </View>
      </BlurView>

      {/* Skip */}
      <TouchableOpacity
        style={styles.skipButton}
        onPress={handleSkip}
        disabled={loading}
        activeOpacity={0.7}
      >
        <Text style={[styles.skipButtonText, { color: textTertiary }]}>
          Продолжить без входа
        </Text>
      </TouchableOpacity>

      {/* Terms */}
      <Text style={[styles.legalText, { color: isDarkMode ? '#555' : '#AAA' }]}>
        Продолжая, вы принимаете{' '}
        <Text style={{ color: colors.accent.primary }}>условия использования</Text>
        {' '}и{' '}
        <Text style={{ color: colors.accent.primary }}>политику конфиденциальности</Text>
      </Text>
    </View>
  );

  const renderEmailStep = () => (
    <KeyboardAvoidingView
      style={styles.stepContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Back button */}
      <TouchableOpacity
        style={[styles.backButton, { backgroundColor: cardBg, borderColor: cardBorder }]}
        onPress={() => { setStep('choice'); setError(null); }}
      >
        <Ionicons name="chevron-back" size={22} color={textPrimary} />
      </TouchableOpacity>

      <View style={styles.stepHeader}>
        <Text style={[styles.stepTitle, { color: textPrimary }]}>Войти через Email</Text>
        <Text style={[styles.stepSubtitle, { color: textSecondary }]}>
          Мы отправим 6-значный код на вашу почту
        </Text>
      </View>

      <BlurView
        intensity={isDarkMode ? 30 : 50}
        tint={blurTint}
        style={[styles.inputCard, { borderColor: cardBorder }]}
      >
        <View style={styles.inputCardInner}>
          <TextInput
            ref={emailInputRef}
            style={[styles.textInput, {
              backgroundColor: inputBg,
              borderColor: inputBorder,
              color: textPrimary,
            }]}
            placeholder="email@example.com"
            placeholderTextColor={textTertiary}
            value={email}
            onChangeText={(text) => { setEmail(text); setError(null); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            editable={!loading}
            returnKeyType="go"
            onSubmitEditing={handleSendOtp}
          />

          <TouchableOpacity
            style={[styles.ctaButton, { opacity: loading || !email.trim() ? 0.5 : 1 }]}
            onPress={handleSendOtp}
            disabled={loading || !email.trim()}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#9B6DFF', '#7B4FE0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaGradient}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.ctaText}>Отправить код</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </BlurView>
    </KeyboardAvoidingView>
  );

  const renderOtpStep = () => (
    <KeyboardAvoidingView
      style={styles.stepContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Back button */}
      <TouchableOpacity
        style={[styles.backButton, { backgroundColor: cardBg, borderColor: cardBorder }]}
        onPress={() => { setStep('email-input'); setOtp(''); setError(null); }}
      >
        <Ionicons name="chevron-back" size={22} color={textPrimary} />
      </TouchableOpacity>

      <View style={styles.stepHeader}>
        <Text style={[styles.stepTitle, { color: textPrimary }]}>Проверьте почту</Text>
        <Text style={[styles.stepSubtitle, { color: textSecondary }]}>
          Код отправлен на{'\n'}
          <Text style={{ fontWeight: '700', color: colors.accent.primary }}>
            {email.trim().toLowerCase()}
          </Text>
        </Text>
      </View>

      <BlurView
        intensity={isDarkMode ? 30 : 50}
        tint={blurTint}
        style={[styles.inputCard, { borderColor: cardBorder }]}
      >
        <View style={styles.inputCardInner}>
          <TextInput
            ref={otpInputRef}
            style={[styles.textInput, styles.otpInput, {
              backgroundColor: inputBg,
              borderColor: inputBorder,
              color: textPrimary,
            }]}
            placeholder="000000"
            placeholderTextColor={textTertiary}
            value={otp}
            onChangeText={(text) => {
              const clean = text.replace(/\D/g, '').slice(0, 6);
              setOtp(clean);
              setError(null);
              if (clean.length === 6) {
                Keyboard.dismiss();
                setTimeout(() => handleVerifyOtp(), 200);
              }
            }}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            maxLength={6}
            editable={!loading}
            returnKeyType="go"
            onSubmitEditing={handleVerifyOtp}
          />

          <TouchableOpacity
            style={[styles.ctaButton, { opacity: loading || otp.length < 6 ? 0.5 : 1 }]}
            onPress={handleVerifyOtp}
            disabled={loading || otp.length < 6}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#9B6DFF', '#7B4FE0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaGradient}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.ctaText}>Подтвердить</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Resend */}
          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResendOtp}
            disabled={countdown > 0}
          >
            <Text style={[
              styles.resendText,
              { color: countdown > 0 ? textTertiary : colors.accent.primary },
            ]}>
              {countdown > 0
                ? `Отправить снова через ${countdown}с`
                : 'Отправить код снова'}
            </Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </KeyboardAvoidingView>
  );

  return (
    <View style={[styles.container, { backgroundColor: bgPrimary }]}>
      {/* Gradient orbs — matching subscription page */}
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
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
          >
            {/* Error banner */}
            {error && (
              <BlurView
                intensity={isDarkMode ? 25 : 40}
                tint={blurTint}
                style={[styles.errorBanner, { borderColor: 'rgba(227,90,90,0.3)' }]}
              >
                <View style={styles.errorBannerInner}>
                  <Ionicons name="alert-circle" size={18} color={colors.status.error} />
                  <Text style={[styles.errorText, { color: colors.status.error }]}>{error}</Text>
                </View>
              </BlurView>
            )}

            {step === 'choice' && renderChoiceStep()}
            {step === 'email-input' && renderEmailStep()}
            {step === 'otp-verify' && renderOtpStep()}
          </Animated.View>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 32,
  },

  // ─── Gradient orbs ──────────────────────────────────────────────
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

  stepContainer: {
    alignItems: 'stretch',
  },

  // ─── Hero ───────────────────────────────────────────────────────
  heroSection: {
    alignItems: 'center',
    marginBottom: 36,
  },
  heroBadge: {
    marginBottom: spacing.lg,
  },
  heroBadgeGradient: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadgeIcon: {
    fontSize: 40,
    color: '#FFFFFF',
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },

  // ─── Glass auth card ────────────────────────────────────────────
  authCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: spacing.xl,
  },
  authCardInner: {
    padding: 24,
    gap: 16,
  },

  // ─── Google button ──────────────────────────────────────────────
  googleButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  googleGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    gap: 10,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },

  // ─── Divider ────────────────────────────────────────────────────
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: spacing.md,
    fontSize: 13,
  },

  // ─── Email button ──────────────────────────────────────────────
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 16,
    gap: 10,
    borderWidth: 1,
  },
  emailButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // ─── Skip ──────────────────────────────────────────────────────
  skipButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  skipButtonText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },

  // ─── Legal ─────────────────────────────────────────────────────
  legalText: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },

  // ─── Step headers (email-input, otp) ───────────────────────────
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: spacing.xl,
    alignSelf: 'flex-start',
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },

  // ─── Glass input card ──────────────────────────────────────────
  inputCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
  },
  inputCardInner: {
    padding: 24,
    gap: 16,
  },

  // ─── Text input ────────────────────────────────────────────────
  textInput: {
    height: 54,
    borderRadius: 16,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    borderWidth: 1,
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 10,
  },

  // ─── CTA button (gradient) ─────────────────────────────────────
  ctaButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  ctaGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },

  // ─── Resend ────────────────────────────────────────────────────
  resendButton: {
    alignItems: 'center',
    paddingTop: 4,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // ─── Error banner ──────────────────────────────────────────────
  errorBanner: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  errorBannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
  },
});
