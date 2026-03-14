/**
 * Steffy Theme - Typography & Spacing
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  h1: { fontSize: 34, fontWeight: '700' as const, letterSpacing: -0.5 },
  h2: { fontSize: 28, fontWeight: '700' as const },
  h3: { fontSize: 22, fontWeight: '600' as const },
  h4: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodySmall: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '500' as const },
  label: { fontSize: 14, fontWeight: '600' as const },
};
