import React from 'react';
import { View, ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, borderRadius, spacing } from '../../theme/tokens';
import { ClothingCategory } from '../../types';

interface FilterBarProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  selectedSeason?: string;
  onSeasonChange?: (season: string) => void;
}

const categories: { id: string; name: string; icon: any }[] = [
  { id: 'all', name: 'All', icon: 'apps' },
  { id: 'tops', name: 'Tops', icon: 'shirt' },
  { id: 'bottoms', name: 'Bottoms', icon: 'fitness' },
  { id: 'dresses', name: 'Dresses', icon: 'woman' },
  { id: 'jackets', name: 'Jackets', icon: 'layers' },
  { id: 'shoes', name: 'Shoes', icon: 'footsteps' },
  { id: 'accessories', name: 'Accessories', icon: 'watch' },
];

const seasons = [
  { id: 'all', name: 'All Seasons', icon: 'calendar' },
  { id: 'spring', name: 'Spring', icon: 'flower' },
  { id: 'summer', name: 'Summer', icon: 'sunny' },
  { id: 'fall', name: 'Fall', icon: 'leaf' },
  { id: 'winter', name: 'Winter', icon: 'snow' },
];

export default function FilterBar({
  selectedCategory,
  onCategoryChange,
  selectedSeason,
  onSeasonChange,
}: FilterBarProps) {
  return (
    <View style={styles.container}>
      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.filterChip,
              selectedCategory === cat.id && styles.filterChipActive,
            ]}
            onPress={() => onCategoryChange(cat.id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={cat.icon}
              size={18}
              color={selectedCategory === cat.id ? 'white' : colors.textSecondary}
            />
            <Text
              style={[
                styles.filterText,
                selectedCategory === cat.id && styles.filterTextActive,
              ]}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Seasons (if provided) */}
      {onSeasonChange && selectedSeason && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          style={styles.seasonRow}
        >
          {seasons.map((season) => (
            <TouchableOpacity
              key={season.id}
              style={[
                styles.seasonChip,
                selectedSeason === season.id && styles.seasonChipActive,
              ]}
              onPress={() => onSeasonChange(season.id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={season.icon}
                size={16}
                color={selectedSeason === season.id ? colors.accent : colors.textSecondary}
              />
              <Text
                style={[
                  styles.seasonText,
                  selectedSeason === season.id && styles.seasonTextActive,
                ]}
              >
                {season.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: 'white',
  },
  seasonRow: {
    marginTop: spacing.sm,
  },
  seasonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  seasonChipActive: {
    backgroundColor: colors.accent + '30',
    borderColor: colors.accent,
  },
  seasonText: {
    fontSize: typography.xs,
    color: colors.textSecondary,
  },
  seasonTextActive: {
    color: colors.accent,
    fontWeight: typography.semibold,
  },
});