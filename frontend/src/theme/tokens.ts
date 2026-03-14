// Design Tokens - Production Grade Design System

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const colors = {
  // Brand
  primary: '#FF6B9D',
  primaryDark: '#E85A8C',
  primaryLight: '#FFA0BC',
  
  secondary: '#C44569',
  accent: '#FFA07A',
  
  // Neutrals
  background: '#0A0A0F',
  surface: '#1A1A2E',
  surfaceLight: '#252541',
  
  // Text
  text: '#FFFFFF',
  textSecondary: '#B8B8D1',
  textTertiary: '#8A8AA0',
  
  // Semantic
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#EF5350',
  info: '#2196F3',
  
  // Borders & Dividers
  border: 'rgba(255, 255, 255, 0.1)',
  divider: 'rgba(255, 255, 255, 0.05)',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.4)',
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
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
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