/**
 * Onboarding Layout - Expo Router
 * Always uses the dark theme for a consistent premium feel.
 */

import { Stack } from 'expo-router';
import { darkColors } from '@/theme/colors';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: darkColors.background.primary,
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
