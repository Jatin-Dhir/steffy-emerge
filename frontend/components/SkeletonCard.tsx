import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import Colors from '../constants/Colors';
import { radius, spacing } from '../constants/Theme';

type Variant = 'outfit' | 'wardrobe';

interface SkeletonCardProps {
  variant?: Variant;
  width?: number;
  style?: object;
}

export function SkeletonOutfitCard({ width, style }: SkeletonCardProps) {
  const shim = useSharedValue(0);
  useEffect(() => {
    shim.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shim.value, [0, 1], [0.4, 0.8]),
  }));
  return (
    <View style={[s.outfitCard, { width }, style]}>
      <Animated.View style={[s.thumb, animatedStyle]} />
      <View style={s.info}>
        <Animated.View style={[s.line, s.lineTitle, animatedStyle]} />
        <Animated.View style={[s.line, s.lineSub, animatedStyle]} />
      </View>
    </View>
  );
}

export function SkeletonWardrobeCard({ width, style }: SkeletonCardProps) {
  const shim = useSharedValue(0);
  useEffect(() => {
    shim.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shim.value, [0, 1], [0.4, 0.8]),
  }));
  return (
    <View style={[s.wardrobeCard, { width }, style]}>
      <Animated.View style={[s.wardrobeImage, animatedStyle]} />
      <View style={s.wardrobeInfo}>
        <Animated.View style={[s.line, s.lineTitle, animatedStyle]} />
        <Animated.View style={[s.line, s.lineSub, animatedStyle]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  outfitCard: {
    backgroundColor: Colors.surface,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  thumb: {
    height: 88,
    backgroundColor: Colors.surfaceElevated,
  },
  info: { padding: spacing.md },
  line: {
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primaryMuted,
  },
  lineTitle: { width: '80%', marginBottom: 8 },
  lineSub: { width: '50%' },

  wardrobeCard: {
    backgroundColor: Colors.surface,
    borderRadius: radius.xxl,
    overflow: 'hidden',
  },
  wardrobeImage: {
    aspectRatio: 1 / 1.2,
    backgroundColor: Colors.surfaceElevated,
  },
  wardrobeInfo: { padding: spacing.sm },
});

export default function SkeletonCard({ variant = 'outfit', width, style }: SkeletonCardProps) {
  if (variant === 'wardrobe') return <SkeletonWardrobeCard width={width} style={style} />;
  return <SkeletonOutfitCard width={width} style={style} />;
}
