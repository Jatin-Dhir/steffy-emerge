import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, borderRadius, spacing } from '../../theme/tokens';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const sizeStyles = {
    sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
    md: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
    lg: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl },
  };

  const textSizeStyles = {
    sm: { fontSize: typography.sm },
    md: { fontSize: typography.base },
    lg: { fontSize: typography.lg },
  };

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        style={[styles.container, fullWidth && styles.fullWidth, style]}
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, sizeStyles[size], isDisabled && styles.disabled]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              {icon && <Ionicons name={icon} size={20} color="white" style={styles.icon} />}
              <Text style={[styles.text, textSizeStyles[size]]}>{title}</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const variantStyles = {
    secondary: styles.secondary,
    ghost: styles.ghost,
    danger: styles.danger,
  };

  const textColorStyles = {
    secondary: styles.secondaryText,
    ghost: styles.ghostText,
    danger: styles.dangerText,
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        styles.button,
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={20} color={colors.text} style={styles.icon} />}
          <Text style={[styles.text, textSizeStyles[size], textColorStyles[variant]]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  fullWidth: {
    width: '100%',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.error + '20',
    borderWidth: 1,
    borderColor: colors.error,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: 'white',
    fontWeight: typography.semibold,
  },
  secondaryText: {
    color: colors.text,
  },
  ghostText: {
    color: colors.primary,
  },
  dangerText: {
    color: colors.error,
  },
  icon: {
    marginRight: spacing.sm,
  },
});