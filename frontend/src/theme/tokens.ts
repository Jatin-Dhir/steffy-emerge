// Design Tokens - Bubbly, clean, aligned with Steffy white + pink theme

import Colors from '../../constants/Colors';

export const spacing = {
  xs: 6,
  sm: 10,
  md: 18,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const colors = {
  primary: Colors.primary,
  primaryDark: Colors.primary,
  primaryLight: Colors.primaryLight,
  secondary: Colors.secondary,
  accent: Colors.accent,
  background: Colors.background,
  surface: Colors.surface,
  surfaceLight: Colors.surfaceElevated,
  text: Colors.text,
  textSecondary: Colors.textSecondary,
  textTertiary: Colors.textMuted,
  success: Colors.success,
  warning: Colors.warning,
  error: Colors.error,
  info: Colors.info,
  border: Colors.border,
  divider: Colors.divider,
  overlay: Colors.overlay,
  overlayLight: Colors.overlayLight,
};

export const typography = {
  // Font Sizes
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  display: 48,
  
  // Font Weights
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  
  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const borderRadius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 28,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#2D1B2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#2D1B2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#2D1B2E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const animations = {
  duration: {
    fast: 150,
    normal: 250,
    slow: 350,
  },
  easing: {
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};