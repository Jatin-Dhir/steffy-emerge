import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useWardrobe, ClothingItem, Outfit } from '../../contexts/WardrobeContext';
import Colors from '../../constants/Colors';
import { spacing, typography, radius } from '../../constants/Theme';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInRight,
  SlideInRight,
  useSharedValue,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import SwirlBackground from '../../components/SwirlBackground';

const { width } = Dimensions.get('window');

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getDayLabel() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

interface QuickAction {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub: string;
  route: string;
  gradient: [string, string];
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: 'camera',
    label: 'Add Item',
    sub: 'AI detect',
    route: '/(tabs)/wardrobe',
    gradient: [Colors.gradientStart, Colors.gradientEnd],
  },
  {
    icon: 'sparkles',
    label: 'AI Outfits',
    sub: 'Generate',
    route: '/(tabs)/looks',
    gradient: [Colors.primaryLight, Colors.secondary],
  },
  {
    icon: 'chatbubble-ellipses',
    label: 'Stylist',
    sub: 'Ask Steffy',
    route: '/(tabs)/stylist',
    gradient: [Colors.secondary, Colors.accent],
  },
  {
    icon: 'body',
    label: 'Try On',
    sub: 'Virtual',
    route: '/(tabs)/looks',
    gradient: [Colors.primary, Colors.primaryLight],
  },
];

const CATEGORY_CARDS = [
  { id: 'tops', label: 'Tops', icon: 'shirt-outline' as const, color: Colors.primary },
  { id: 'bottoms', label: 'Bottoms', icon: 'git-branch-outline' as const, color: Colors.primaryLight },
  { id: 'dresses', label: 'Dresses', icon: 'woman-outline' as const, color: Colors.secondary },
  { id: 'jackets', label: 'Jackets', icon: 'layers-outline' as const, color: Colors.accent },
  { id: 'shoes', label: 'Shoes', icon: 'footsteps-outline' as const, color: Colors.primary },
  { id: 'accessories', label: 'Accessories', icon: 'watch-outline' as const, color: Colors.secondary },
];

export default function Dashboard() {
  const { items, outfits } = useWardrobe();
  const router = useRouter();
  const [greeting] = useState(getGreeting());
  const [dayLabel] = useState(getDayLabel());

  const todaysOutfit = useMemo<Outfit | null>(() => {
    if (outfits.length === 0) return null;
    const seed = new Date().getDate() % outfits.length;
    return outfits[seed];
  }, [outfits]);

  const todayOutfitItems = useMemo<ClothingItem[]>(
    () => (todaysOutfit ? items.filter((i) => todaysOutfit.item_ids.includes(i.item_id)) : []),
    [todaysOutfit, items]
  );

  const recentItems = useMemo(() => items.slice(-6).reverse(), [items]);
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <SwirlBackground scrollY={scrollY} />
      </View>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero header */}
          <Animated.View entering={FadeIn} style={styles.hero}>
            <View style={styles.heroLeft}>
              <Text style={styles.heroDay}>{dayLabel}</Text>
              <Text style={styles.heroGreeting}>{greeting}</Text>
              <View style={styles.heroBrandRow}>
                <LinearGradient
                  colors={[Colors.gradientStart, Colors.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.heroBrandDot}
                />
                <Text style={styles.heroBrand}>Steffy</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.heroProfile}
              onPress={() => router.push('/(tabs)/settings' as any)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[Colors.gradientStart, Colors.gradientEnd]}
                style={styles.heroProfileGradient}
              >
                <Ionicons name="person" size={22} color="white" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Stats strip */}
          <Animated.View entering={FadeInDown.delay(80)} style={styles.statsStrip}>
            <View style={styles.statPill}>
              <Ionicons name="shirt" size={14} color={Colors.primary} />
              <Text style={styles.statNum}>{items.length}</Text>
              <Text style={styles.statLbl}>items</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statPill}>
              <Ionicons name="color-palette" size={14} color={Colors.secondary} />
              <Text style={styles.statNum}>{outfits.length}</Text>
              <Text style={styles.statLbl}>outfits</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statPill}>
              <Ionicons name="grid" size={14} color={Colors.accent} />
              <Text style={styles.statNum}>{new Set(items.map((i) => i.category)).size}</Text>
              <Text style={styles.statLbl}>categories</Text>
            </View>
          </Animated.View>

          {/* Outfit of the Day */}
          {todaysOutfit ? (
            <Animated.View entering={FadeInDown.delay(120)}>
              <TouchableOpacity
                style={styles.ootdCard}
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/looks',
                    params: { outfitId: todaysOutfit.outfit_id },
                  } as any)
                }
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={[Colors.gradientStart + 'EE', Colors.gradientEnd + 'CC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.ootdGradient}
                >
                  <View style={styles.ootdLeft}>
                    <View style={styles.ootdBadge}>
                      <Text style={styles.ootdBadgeText}>TODAY'S LOOK</Text>
                    </View>
                    <Text style={styles.ootdName} numberOfLines={2}>
                      {todaysOutfit.name}
                    </Text>
                    <View style={styles.ootdItemCount}>
                      <Ionicons name="shirt-outline" size={12} color="rgba(255,255,255,0.8)" />
                      <Text style={styles.ootdItemCountText}>
                        {todaysOutfit.item_ids.length} pieces
                      </Text>
                    </View>
                    <View style={styles.ootdViewBtn}>
                      <Text style={styles.ootdViewBtnText}>View Look</Text>
                      <Ionicons name="arrow-forward" size={12} color="white" />
                    </View>
                  </View>
                  <View style={styles.ootdImages}>
                    {todayOutfitItems.slice(0, 3).map((item, i) => (
                      <View
                        key={item.item_id}
                        style={[
                          styles.ootdThumb,
                          { zIndex: 3 - i, right: i * 28 },
                        ]}
                      >
                        <Image
                          source={{ uri: `data:image/jpeg;base64,${item.image_base64}` }}
                          style={styles.ootdThumbImg}
                          resizeMode="cover"
                        />
                      </View>
                    ))}
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown.delay(120)} style={styles.ootdEmpty}>
              <View style={styles.ootdEmptyLeft}>
                <View style={styles.ootdBadge}>
                  <Text style={styles.ootdBadgeText}>TODAY'S LOOK</Text>
                </View>
                <Text style={styles.ootdEmptyTitle}>No outfits yet</Text>
                <Text style={styles.ootdEmptySubtitle}>
                  Let Steffy build your first look
                </Text>
              </View>
              <TouchableOpacity
                style={styles.ootdEmptyBtn}
                onPress={() => router.push('/(tabs)/looks' as any)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[Colors.gradientStart, Colors.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.ootdEmptyBtnGradient}
                >
                  <Ionicons name="sparkles" size={16} color="white" />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Quick Actions */}
          <Animated.View entering={FadeInDown.delay(160)}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.actionsScroll}
            >
              {QUICK_ACTIONS.map((action, i) => (
                <Animated.View key={action.label} entering={SlideInRight.delay(i * 60)}>
                  <TouchableOpacity
                    style={styles.actionItem}
                    onPress={() => router.push(action.route as any)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={action.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.actionIcon}
                    >
                      <Ionicons name={action.icon} size={22} color="white" />
                    </LinearGradient>
                    <Text style={styles.actionLabel}>{action.label}</Text>
                    <Text style={styles.actionSub}>{action.sub}</Text>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </ScrollView>
          </Animated.View>

          {/* Category overview */}
          <Animated.View entering={FadeInDown.delay(220)}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Categories</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/wardrobe' as any)}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              {CATEGORY_CARDS.map((cat, i) => {
                const count = items.filter((item) => item.category === cat.id).length;
                return (
                  <Animated.View key={cat.id} entering={FadeInRight.delay(i * 40)}>
                    <TouchableOpacity
                      style={styles.catCard}
                      onPress={() => router.push('/(tabs)/wardrobe' as any)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.catIcon, { backgroundColor: Colors.primaryMuted }]}>
                        <Ionicons name={cat.icon} size={22} color={cat.color} />
                      </View>
                      <Text style={styles.catLabel}>{cat.label}</Text>
                      <Text style={styles.catCount}>{count}</Text>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </ScrollView>
          </Animated.View>

          {/* Recent items */}
          {recentItems.length > 0 && (
            <Animated.View entering={FadeInDown.delay(280)}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recently Added</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/wardrobe' as any)}>
                  <Text style={styles.seeAll}>See all</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recentScroll}
              >
                {recentItems.map((item, i) => (
                  <Animated.View key={item.item_id} entering={FadeInRight.delay(i * 40)}>
                    <TouchableOpacity
                      style={styles.recentCard}
                      onPress={() => router.push('/(tabs)/wardrobe' as any)}
                      activeOpacity={0.85}
                    >
                      <Image
                        source={{ uri: `data:image/jpeg;base64,${item.image_base64}` }}
                        style={styles.recentImage}
                        resizeMode="cover"
                      />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.6)']}
                        style={styles.recentGradient}
                      />
                      <View style={styles.recentInfo}>
                        <Text style={styles.recentName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        {item.fabric && (
                          <Text style={styles.recentSub} numberOfLines={1}>
                            {item.fabric}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </ScrollView>
            </Animated.View>
          )}

          {/* Empty wardrobe CTA */}
          {items.length === 0 && (
            <Animated.View entering={FadeIn.delay(300)} style={styles.emptyCta}>
              <LinearGradient
                colors={[Colors.primary + '15', Colors.secondary + '10']}
                style={styles.emptyCtaGradient}
              >
                <Ionicons name="shirt-outline" size={36} color={Colors.primary} />
                <Text style={styles.emptyCtaTitle}>Start Your Digital Wardrobe</Text>
                <Text style={styles.emptyCtaSubtitle}>
                  Upload your clothes and let AI organize, style, and outfit you.
                </Text>
                <TouchableOpacity
                  style={styles.emptyCtaBtn}
                  onPress={() => router.push('/(tabs)/wardrobe' as any)}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={[Colors.gradientStart, Colors.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.emptyCtaBtnGradient}
                  >
                    <Ionicons name="camera" size={18} color="white" />
                    <Text style={styles.emptyCtaBtnText}>Add First Item</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </Animated.View>
          )}
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1 },
  scrollContent: { paddingBottom: 100, paddingTop: spacing.sm },

  hero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  heroLeft: {},
  heroDay: { ...typography.caption, color: Colors.textMuted, marginBottom: 2 },
  heroGreeting: { fontSize: 28, fontWeight: '300', color: Colors.text, letterSpacing: -0.5 },
  heroBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  heroBrandDot: { width: 8, height: 8, borderRadius: 4 },
  heroBrand: { ...typography.h3, color: Colors.text },
  heroProfile: { borderRadius: 24, overflow: 'hidden' },
  heroProfileGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  statPill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  statNum: { ...typography.h4, color: Colors.text },
  statLbl: { ...typography.caption, color: Colors.textSecondary },
  statDivider: { width: 1, height: 24, backgroundColor: Colors.border },

  ootdCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    borderRadius: radius.xxl,
    overflow: 'hidden',
  },
  ootdGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.xl,
    minHeight: 140,
  },
  ootdLeft: { flex: 1 },
  ootdBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  ootdBadgeText: { fontSize: 9, fontWeight: '800', color: 'white', letterSpacing: 1 },
  ootdName: { ...typography.h3, color: 'white', marginBottom: 6 },
  ootdItemCount: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.md },
  ootdItemCountText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  ootdViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  ootdViewBtnText: { fontSize: 12, fontWeight: '700', color: 'white' },
  ootdImages: { width: 100, height: 90, position: 'relative' },
  ootdThumb: {
    position: 'absolute',
    width: 56,
    height: 70,
    borderRadius: 10,
    overflow: 'hidden',
    top: 0,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  ootdThumbImg: { width: '100%', height: '100%' },

  ootdEmpty: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    padding: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ootdEmptyLeft: { flex: 1 },
  ootdEmptyTitle: { ...typography.h4, color: Colors.text, marginBottom: 4 },
  ootdEmptySubtitle: { ...typography.caption, color: Colors.textSecondary },
  ootdEmptyBtn: { borderRadius: radius.full, overflow: 'hidden' },
  ootdEmptyBtnGradient: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },

  sectionTitle: {
    ...typography.h4,
    color: Colors.text,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  seeAll: { ...typography.label, color: Colors.primary },

  actionsScroll: { paddingHorizontal: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl },
  actionItem: { alignItems: 'center', width: 80 },
  actionIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#2D1B2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  actionLabel: { ...typography.caption, color: Colors.text, fontWeight: '700', textAlign: 'center' },
  actionSub: { fontSize: 10, color: Colors.textMuted, textAlign: 'center', marginTop: 1 },

  categoryScroll: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  catCard: {
    width: 96,
    backgroundColor: Colors.surface,
    borderRadius: radius.xxl,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catIcon: { width: 48, height: 48, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  catLabel: { ...typography.caption, color: Colors.textSecondary, fontWeight: '600', textAlign: 'center' },
  catCount: { ...typography.h4, color: Colors.primary, marginTop: 2 },

  recentScroll: { paddingHorizontal: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl },
  recentCard: { width: 116, height: 156, borderRadius: radius.xxl, overflow: 'hidden' },
  recentImage: { width: '100%', height: '100%' },
  recentGradient: { ...StyleSheet.absoluteFillObject },
  recentInfo: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.sm },
  recentName: { fontSize: 11, fontWeight: '700', color: 'white' },
  recentSub: { fontSize: 9, color: 'rgba(255,255,255,0.7)', marginTop: 1 },

  emptyCta: { marginHorizontal: spacing.lg, marginTop: spacing.md },
  emptyCtaGradient: {
    borderRadius: radius.xxl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '25',
  },
  emptyCtaTitle: { ...typography.h4, color: Colors.text, marginTop: spacing.md, marginBottom: spacing.sm, textAlign: 'center' },
  emptyCtaSubtitle: { ...typography.bodySmall, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: spacing.xl },
  emptyCtaBtn: { borderRadius: radius.full, overflow: 'hidden' },
  emptyCtaBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  emptyCtaBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
});
