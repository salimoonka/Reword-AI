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

/**
 * Resolve current theme mode to a concrete 'dark' | 'light' value.
 */
function useResolvedScheme(): 'dark' | 'light' {
  const systemScheme = useColorScheme();
  const themeMode = useSettingsStore((s) => s.themeMode);

  return themeMode === 'dark'
    ? 'dark'
    : themeMode === 'light'
      ? 'light'
      : systemScheme === 'light'
        ? 'light'
        : 'dark';
}

export function useThemeColors(): Colors {
  return getThemeColors(useResolvedScheme());
}

/**
 * Returns true when the resolved theme is dark.
 * Safe to use anywhere — respects store preference + system scheme.
 */
export function useIsDarkMode(): boolean {
  return useResolvedScheme() === 'dark';
}
