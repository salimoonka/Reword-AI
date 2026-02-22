/**
 * Settings Screen
 * Theme, local/online mode, subscription management, keyboard settings
 */

import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSettingsStore, ThemeMode } from '@/stores/useSettingsStore';
import { useSubscriptionStore } from '@/stores/useSubscriptionStore';
import { useUserStore } from '@/stores/useUserStore';
import { useKeyboardStatus } from '@/hooks/useKeyboardStatus';
import { apiDelete } from '@/services/api/client';
import { colors, spacing, typography } from '@/theme';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const {
    themeMode,
    setThemeMode,
    cloudEnabled,
    setCloudEnabled,
  } = useSettingsStore();
  const { tier, paraphrasesUsed, paraphrasesLimit } = useSubscriptionStore();
  const { isKeyboardEnabled, hasFullAccess, isChecking, openKeyboardSettings } =
    useKeyboardStatus();
  const { logout } = useUserStore();

  const isDarkMode =
    themeMode === 'dark' || (themeMode === 'auto' && colorScheme === 'dark');

  const themeOptions: { label: string; value: ThemeMode }[] = [
    { label: 'Авто', value: 'auto' },
    { label: 'Тёмная', value: 'dark' },
    { label: 'Светлая', value: 'light' },
  ];

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDarkMode ? colors.background.primary : '#FFFFFF' },
      ]}
    >
      <ScrollView style={styles.content}>
        {/* Subscription Section */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: isDarkMode ? colors.text.secondary : '#666666' },
            ]}
          >
            ПОДПИСКА
          </Text>
          <TouchableOpacity
            style={[
              styles.subscriptionCard,
              {
                backgroundColor: isDarkMode
                  ? colors.background.secondary
                  : '#F5F5F5',
              },
            ]}
            onPress={() => router.push('/subscription')}
          >
            <View style={styles.subscriptionInfo}>
              <Text
                style={[
                  styles.subscriptionTier,
                  { color: tier === 'pro' ? colors.accent.primary : colors.text.primary },
                ]}
              >
                {tier === 'pro' ? 'PRO' : 'Бесплатно'}
              </Text>
              <Text
                style={[
                  styles.subscriptionDetails,
                  { color: isDarkMode ? colors.text.secondary : '#666666' },
                ]}
              >
                {tier === 'pro'
                  ? 'Безлимитные перефразирования'
                  : `${paraphrasesUsed}/${paraphrasesLimit} перефразов использовано`}
              </Text>
            </View>
            <Text style={[styles.arrow, { color: colors.accent.primary }]}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Theme Section */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: isDarkMode ? colors.text.secondary : '#666666' },
            ]}
          >
            ТЕМА
          </Text>
          <View
            style={[
              styles.themeSelector,
              {
                backgroundColor: isDarkMode
                  ? colors.background.secondary
                  : '#F5F5F5',
              },
            ]}
          >
            {themeOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.themeOption,
                  themeMode === option.value && {
                    backgroundColor: colors.accent.primary,
                  },
                ]}
                onPress={() => setThemeMode(option.value)}
              >
                <Text
                  style={[
                    styles.themeOptionText,
                    {
                      color:
                        themeMode === option.value
                          ? '#FFFFFF'
                          : isDarkMode
                          ? colors.text.primary
                          : '#000000',
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Cloud Features Section */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: isDarkMode ? colors.text.secondary : '#666666' },
            ]}
          >
            ОБЛАЧНЫЕ ФУНКЦИИ
          </Text>
          <View
            style={[
              styles.settingRow,
              {
                backgroundColor: isDarkMode
                  ? colors.background.secondary
                  : '#F5F5F5',
              },
            ]}
          >
            <View style={styles.settingInfo}>
              <Text
                style={[
                  styles.settingTitle,
                  { color: isDarkMode ? colors.text.primary : '#000000' },
                ]}
              >
                Облачное перефразирование
              </Text>
              <Text
                style={[
                  styles.settingDescription,
                  { color: isDarkMode ? colors.text.tertiary : '#999999' },
                ]}
              >
                Включите для AI-перефразирования текста
              </Text>
            </View>
            <Switch
              value={cloudEnabled}
              onValueChange={setCloudEnabled}
              trackColor={{
                false: isDarkMode ? '#3D3D3D' : '#E0E0E0',
                true: colors.accent.primary,
              }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Keyboard Section */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: isDarkMode ? colors.text.secondary : '#666666' },
            ]}
          >
            КЛАВИАТУРА
          </Text>
          <View
            style={[
              styles.settingRow,
              {
                backgroundColor: isDarkMode
                  ? colors.background.secondary
                  : '#F5F5F5',
                marginBottom: spacing.sm,
              },
            ]}
          >
            <View style={styles.settingInfo}>
              <Text
                style={[
                  styles.settingTitle,
                  { color: isDarkMode ? colors.text.primary : '#000000' },
                ]}
              >
                Статус клавиатуры
              </Text>
              <Text
                style={[
                  styles.settingDescription,
                  {
                    color: isKeyboardEnabled
                      ? colors.success
                      : isDarkMode
                      ? colors.text.tertiary
                      : '#999999',
                  },
                ]}
              >
                {isChecking
                  ? 'Проверка...'
                  : isKeyboardEnabled
                  ? hasFullAccess
                    ? '✓ Включена, полный доступ'
                    : '✓ Включена, ограниченный доступ'
                  : '✗ Не активирована'}
              </Text>
            </View>
            {isChecking && <ActivityIndicator size="small" color={colors.accent.primary} />}
          </View>
          <TouchableOpacity
            style={[
              styles.settingRow,
              {
                backgroundColor: isDarkMode
                  ? colors.background.secondary
                  : '#F5F5F5',
              },
            ]}
            onPress={openKeyboardSettings}
          >
            <Text
              style={[
                styles.settingTitle,
                { color: colors.accent.primary },
              ]}
            >
              Настройки клавиатуры
            </Text>
            <Text style={[styles.arrow, { color: colors.accent.primary }]}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: isDarkMode ? colors.text.secondary : '#666666' },
            ]}
          >
            ПРИВАТНОСТЬ
          </Text>
          <TouchableOpacity
            style={[
              styles.settingRow,
              {
                backgroundColor: isDarkMode
                  ? colors.background.secondary
                  : '#F5F5F5',
              },
            ]}
            onPress={() => {
              Alert.alert(
                'Удалить все данные?',
                'Это действие необратимо. Все ваши данные, включая историю перефразирований и настройки, будут удалены навсегда.',
                [
                  { text: 'Отмена', style: 'cancel' },
                  {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await apiDelete('/v1/user/delete');
                        logout();
                        Alert.alert(
                          'Данные удалены',
                          'Все ваши данные были удалены.',
                          [{ text: 'OK' }]
                        );
                      } catch (error) {
                        Alert.alert(
                          'Ошибка',
                          'Не удалось удалить данные. Попробуйте позже.',
                          [{ text: 'OK' }]
                        );
                      }
                    },
                  },
                ]
              );
            }}
          >
            <Text
              style={[
                styles.settingTitle,
                { color: colors.error },
              ]}
            >
              Удалить мои данные
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.captionMedium,
    marginBottom: spacing.md,
  },
  subscriptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderRadius: 12,
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionTier: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  subscriptionDetails: {
    ...typography.bodySmall,
  },
  arrow: {
    ...typography.h2,
  },
  themeSelector: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: spacing.xs,
  },
  themeOption: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  themeOptionText: {
    ...typography.buttonSmall,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderRadius: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingTitle: {
    ...typography.bodyMedium,
    marginBottom: spacing.xs,
  },
  settingDescription: {
    ...typography.caption,
  },
});
