import React from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ClothingItem } from '../../types';
import { colors, typography, borderRadius, spacing } from '../../theme/tokens';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - spacing.xl * 3) / 2;

interface ClothingCardProps {
  item: ClothingItem;
  onPress: () => void;
  onLongPress?: () => void;
}

export default function ClothingCard({ item, onPress, onLongPress }: ClothingCardProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: `data:image/jpeg;base64,${item.image_base64}` }}
          style={styles.image}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.gradient}
        />
        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {item.tags.slice(0, 2).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.meta}>
          {item.color && (
            <View style={styles.colorDot}>
              <View
                style={[
                  styles.colorIndicator,
                  { backgroundColor: item.color.toLowerCase() },
                ]}
              />
              <Text style={styles.metaText}>{item.color}</Text>
            </View>
          )}
          {item.season && (
            <View style={styles.seasonBadge}>
              <Ionicons
                name={getSeasonIcon(item.season)}
                size={12}
                color={colors.textSecondary}
              />
              <Text style={styles.metaText}>{item.season}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const getSeasonIcon = (season: string): any => {
  const icons: { [key: string]: any } = {
    spring: 'flower',
    summer: 'sunny',
    fall: 'leaf',
    winter: 'snow',
    all: 'calendar',
  };
  return icons[season] || 'calendar';
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    marginBottom: spacing.md,
  },
  imageContainer: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.3,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  tagsContainer: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  tag: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  tagText: {
    fontSize: typography.xs,
    color: 'white',
    fontWeight: typography.semibold,
  },
  info: {
    marginTop: spacing.sm,
  },
  name: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  colorDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaText: {
    fontSize: typography.xs,
    color: colors.textSecondary,
  },
  seasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});