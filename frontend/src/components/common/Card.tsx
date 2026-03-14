import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, borderRadius, spacing } from '../../theme/tokens';

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: keyof typeof spacing;
}

export default function Card({ children, style, variant = 'default', padding = 'lg' }: CardProps) {
  if (variant === 'default') {
    return (
      <View style={[styles.container, style]}>
        <BlurView intensity={20} style={styles.blur}>
          <View style={[styles.content, { padding: spacing[padding] }]}>
            {children}
          </View>
        </BlurView>
      </View>
    );
  }

  const variantStyles = {
    elevated: styles.elevated,
    outlined: styles.outlined,
  };

  return (
    <View style={[styles.container, styles.solid, variantStyles[variant], { padding: spacing[padding] }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  blur: {
    backgroundColor: colors.surface + '80',
  },
  content: {
    // padding applied dynamically
  },
  solid: {
    backgroundColor: colors.surface,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.border,
  },
});