/**
 * Color System for Reword AI
 * Based on UI_UX_doc.md specifications
 */

export const colors = {
  // Primary Palette
  background: {
    primary: '#1A1A1A',
    secondary: '#2D2D2D',
    tertiary: '#3D3D3D',
  },

  // Text Colors
  text: {
    primary: '#FFFFFF',
    secondary: '#B3B3B3',
    tertiary: '#808080',
  },

  // Border Colors
  border: {
    primary: '#3D3D3D',
    secondary: '#4D4D4D',
  },

  // Accent Colors
  accent: {
    primary: '#9B6DFF',
    secondary: '#B794FF',
    muted: 'rgba(155, 109, 255, 0.15)',
  },

  // Status Colors
  status: {
    error: '#E35A5A',
    success: '#39C07C',
    warning: '#F5A623',
  },

  // Legacy (for backwards compatibility)
  error: '#E35A5A',
  success: '#39C07C',
  warning: '#F5A623',

  // Diff Highlighting
  diff: {
    deleted: '#E35A5A',
    deletedBackground: 'rgba(227, 90, 90, 0.3)',
    inserted: '#39C07C',
    insertedBackground: 'rgba(57, 192, 124, 0.3)',
  },

  // Common
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export type Colors = typeof colors;
