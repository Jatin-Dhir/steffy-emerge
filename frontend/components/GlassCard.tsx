import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Colors from '../constants/Colors';
import { radius, spacing } from '../constants/Theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
}

export default function GlassCard({ children, style, padding = spacing.lg }: GlassCardProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={[styles.content, { padding }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  content: {},
});
