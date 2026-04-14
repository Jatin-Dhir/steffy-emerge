import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';

interface ThemedLoaderProps {
  size?: 'small' | 'large';
  style?: object;
}

export default function ThemedLoader({ size = 'large', style }: ThemedLoaderProps) {
  return (
    <View style={[styles.wrap, style]}>
      <ActivityIndicator size={size} color={Colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
