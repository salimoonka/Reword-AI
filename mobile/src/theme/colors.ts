/**
 * Color System for Reword AI
 * Supports both dark and light themes
 */

export const darkColors = {
  // Primary Palette
  background: {
    primary: '#1A1A1A',
    secondary: '#2D2D2D',
    tertiary: '#3D3D3D',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#B3B3B3',
    tertiary: '#808080',
  },
  border: {
    primary: '#3D3D3D',
    secondary: '#4D4D4D',
  },
  accent: {
    primary: '#9B6DFF',
    secondary: '#B794FF',
    muted: 'rgba(155, 109, 255, 0.15)',
  },
  status: {
    error: '#E35A5A',
    success: '#39C07C',
    warning: '#F5A623',
  },
  error: '#E35A5A',
  success: '#39C07C',
  warning: '#F5A623',
  diff: {
    deleted: '#E35A5A',
    deletedBackground: 'rgba(227, 90, 90, 0.3)',
    inserted: '#39C07C',
    insertedBackground: 'rgba(57, 192, 124, 0.3)',
  },
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const lightColors = {
  background: {
    primary: '#F2F2F7',
    secondary: '#FFFFFF',
    tertiary: '#E5E5EA',
  },
  text: {
    primary: '#000000',
    secondary: '#6B6B6B',
    tertiary: '#8E8E93',
  },
  border: {
    primary: '#E5E5EA',
    secondary: '#D1D1D6',
  },
  accent: {
    primary: '#9B6DFF',
    secondary: '#B794FF',
    muted: 'rgba(155, 109, 255, 0.12)',
  },
  status: {
    error: '#E35A5A',
    success: '#39C07C',
    warning: '#F5A623',
  },
  error: '#E35A5A',
  success: '#39C07C',
  warning: '#F5A623',
  diff: {
    deleted: '#E35A5A',
    deletedBackground: 'rgba(227, 90, 90, 0.15)',
    inserted: '#39C07C',
    insertedBackground: 'rgba(57, 192, 124, 0.15)',
  },
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',
} as const;

/** Backwards-compatible dark-only export */
export const colors = darkColors;

export type Colors = {
  background: { primary: string; secondary: string; tertiary: string };
  text: { primary: string; secondary: string; tertiary: string };
  border: { primary: string; secondary: string };
  accent: { primary: string; secondary: string; muted: string };
  status: { error: string; success: string; warning: string };
  error: string;
  success: string;
  warning: string;
  diff: { deleted: string; deletedBackground: string; inserted: string; insertedBackground: string };
  transparent: string;
  white: string;
  black: string;
};

export function getThemeColors(scheme: 'dark' | 'light' | null | undefined): Colors {
  return scheme === 'light' ? lightColors : darkColors;
}
