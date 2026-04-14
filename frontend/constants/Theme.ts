/**
 * Steffy Theme - Bubbly, clean, well-formatted
 * Generous radius and spacing for a soft, readable layout.
 */
export const spacing = {
  xs: 6,
  sm: 10,
  md: 18,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 28,
  full: 9999,
};

export const typography = {
  h1: { fontSize: 32, fontWeight: '700' as const, letterSpacing: -0.8 },
  h2: { fontSize: 26, fontWeight: '700' as const, letterSpacing: -0.4 },
  h3: { fontSize: 21, fontWeight: '600' as const, letterSpacing: 0 },
  h4: { fontSize: 17, fontWeight: '600' as const, letterSpacing: 0.2 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24, letterSpacing: 0.1 },
  bodySmall: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20, letterSpacing: 0.05 },
  caption: { fontSize: 12, fontWeight: '500' as const, letterSpacing: 0.3 },
  label: { fontSize: 13, fontWeight: '600' as const, letterSpacing: 0.4 },
};
