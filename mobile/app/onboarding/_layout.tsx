/**
 * Onboarding Layout - Expo Router
 */

import { Stack } from 'expo-router';
import { colors } from '@/theme/colors';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: colors.background.primary,
        },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="enable-keyboard" />
      <Stack.Screen name="full-access" />
    </Stack>
  );
}
