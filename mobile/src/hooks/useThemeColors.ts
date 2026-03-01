/**
 * Hook to get theme-aware colors based on user preference + system scheme.
 *
 * Resolution order:
 *  1. If themeMode is 'dark' or 'light' → use that explicitly.
 *  2. If themeMode is 'auto' (default)  → follow the system color scheme.
 */

import { useColorScheme } from 'react-native';
import { getThemeColors, type Colors } from '@/theme/colors';
import { useSettingsStore } from '@/stores/useSettingsStore';

export function useThemeColors(): Colors {
  const systemScheme = useColorScheme();
  const themeMode = useSettingsStore((s) => s.themeMode);

  const resolved: 'dark' | 'light' =
    themeMode === 'dark'
      ? 'dark'
      : themeMode === 'light'
        ? 'light'
        : systemScheme === 'light'
          ? 'light'
          : 'dark';

  return getThemeColors(resolved);
}
