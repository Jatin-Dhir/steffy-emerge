import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useWardrobe, Outfit, ClothingItem, TryOnResult } from '../../contexts/WardrobeContext';
import { useToast } from '../../contexts/ToastContext';
import * as Haptics from 'expo-haptics';
import Colors from '../../constants/Colors';
import { spacing, typography, radius } from '../../constants/Theme';
import Animated, { FadeIn, FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import ThemedLoader from '../../components/ThemedLoader';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - spacing.lg * 2 - spacing.md) / 2;

// ── Mannequin ────────────────────────────────────────────────────────────────

function classifySlot(item: ClothingItem): 'top' | 'bottom' | 'dress' | 'jacket' | 'shoe' | 'accessory' {
  const cat = item.category.toLowerCase();
  if (cat.includes('dress')) return 'dress';
  if (cat.includes('jacket') || cat.includes('coat') || cat.includes('outerwear')) return 'jacket';
  if (cat.includes('top') || cat.includes('shirt') || cat.includes('blouse') || cat.includes('sweater') || cat.includes('knit')) return 'top';
  if (cat.includes('bottom') || cat.includes('pant') || cat.includes('jean') || cat.includes('skirt') || cat.includes('short')) return 'bottom';
  if (cat.includes('shoe') || cat.includes('boot') || cat.includes('sneaker') || cat.includes('heel') || cat.includes('footwear')) return 'shoe';
  return 'accessory';
}

interface SlotProps {
  item?: ClothingItem;
  width: number;
  height: number;
  label: string;
}

function MannequinSlot({ item, width: w, height: h, label }: SlotProps) {
  return (
    <View style={[mStyles.slot, { width: w, height: h }]}>
      {item ? (
        <Image
          source={{ uri: `data:image/jpeg;base64,${item.image_base64}` }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      ) : (
        <View style={mStyles.emptySlot}>
          <Text style={mStyles.emptySlotText}>{label}</Text>
        </View>
      )}
    </View>
  );
}

function Mannequin({ outfitItems }: { outfitItems: ClothingItem[] }) {
  const bySlot: Record<string, ClothingItem> = {};
  for (const item of outfitItems) {
    const slot = classifySlot(item);
    if (!bySlot[slot]) bySlot[slot] = item;
  }

  const isDress = !!bySlot['dress'];

  return (
    <View style={mStyles.container}>
      {/* Head */}
      <View style={mStyles.head} />
      {/* Neck */}
      <View style={mStyles.neck} />
      {/* Shoulders */}
      <View style={mStyles.shoulderRow}>
        <View style={mStyles.shoulder} />
        <View style={mStyles.shoulderGap} />
        <View style={mStyles.shoulder} />
      </View>
      {/* Jacket layer (optional) */}
      {bySlot['jacket'] && !isDress && (
        <View style={mStyles.jacketWrap}>
          <MannequinSlot item={bySlot['jacket']} width={100} height={60} label="Jacket" />
        </View>
      )}
      {/* Torso / Dress */}
      {isDress ? (
        <MannequinSlot item={bySlot['dress']} width={90} height={160} label="Dress" />
      ) : (
        <>
          <MannequinSlot item={bySlot['top']} width={90} height={80} label="Top" />
          <View style={mStyles.waist} />
          <MannequinSlot item={bySlot['bottom']} width={90} height={90} label="Bottom" />
        </>
      )}
      {/* Feet */}
      <View style={mStyles.feetRow}>
        <MannequinSlot
          item={bySlot['shoe']}
          width={36}
          height={22}
          label="Shoe"
        />
        <View style={{ width: 10 }} />
        <MannequinSlot
          item={bySlot['shoe']}
          width={36}
          height={22}
          label="Shoe"
        />
      </View>
      {/* Accessory badge */}
      {bySlot['accessory'] && (
        <View style={mStyles.accessoryBadge}>
          <Image
            source={{ uri: `data:image/jpeg;base64,${bySlot['accessory'].image_base64}` }}
            style={mStyles.accessoryImage}
            resizeMode="cover"
          />
        </View>
      )}
    </View>
  );
}

const mStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  head: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: Colors.mannequinStroke,
    backgroundColor: Colors.mannequinBg,
  },
  neck: {
    width: 10,
    height: 14,
    backgroundColor: Colors.mannequinStroke,
    opacity: 0.3,
  },
  shoulderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  shoulder: {
    width: 28,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.mannequinStroke,
    opacity: 0.25,
  },
  shoulderGap: { width: 34 },
  jacketWrap: {
    position: 'absolute',
    top: 90,
    left: '50%',
    marginLeft: -50,
    zIndex: 2,
    opacity: 0.75,
  },
  waist: {
    width: 70,
    height: 6,
    backgroundColor: Colors.mannequinStroke,
    opacity: 0.12,
    borderRadius: 3,
    marginVertical: 2,
  },
  feetRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  slot: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  emptySlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryMuted,
  },
  emptySlotText: { fontSize: 8, color: Colors.textMuted, textAlign: 'center', fontWeight: '600' },
  accessoryBadge: {
    position: 'absolute',
    top: 56,
    right: 20,
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  accessoryImage: { width: '100%', height: '100%' },
});

// ── Outfit card ───────────────────────────────────────────────────────────────

function OutfitThumbs({ items }: { items: ClothingItem[] }) {
  return (
    <View style={{ flexDirection: 'row', gap: -10 }}>
      {items.slice(0, 3).map((item, i) => (
        <View
          key={item.item_id}
          style={[
            thumbStyles.thumb,
            { zIndex: 3 - i, marginLeft: i === 0 ? 0 : -12 },
          ]}
        >
          <Image
            source={{ uri: `data:image/jpeg;base64,${item.image_base64}` }}
            style={thumbStyles.img}
            resizeMode="cover"
          />
        </View>
      ))}
      {items.length > 3 && (
        <View style={[thumbStyles.thumb, thumbStyles.more, { marginLeft: -12, zIndex: 0 }]}>
          <Text style={thumbStyles.moreText}>+{items.length - 3}</Text>
        </View>
      )}
    </View>
  );
}

const thumbStyles = StyleSheet.create({
  thumb: {
    width: 40,
    height: 50,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  img: { width: '100%', height: '100%' },
  more: { backgroundColor: Colors.primaryMuted, alignItems: 'center', justifyContent: 'center' },
  moreText: { fontSize: 10, fontWeight: '700', color: Colors.primary },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function Looks() {
  const { items, outfits, deleteOutfit, generateOutfitAI, addOutfit, tryOnOutfit, profile } = useWardrobe();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ outfitId?: string }>();

  const [selectedOutfit, setSelectedOutfit] = useState<Outfit | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [showTryOn, setShowTryOn] = useState(false);

  // Generator state
  const [occasion, setOccasion] = useState('');
  const [weather, setWeather] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedOutfit, setGeneratedOutfit] = useState<any>(null);

  // Try-on state
  const [isTryingOn, setIsTryingOn] = useState(false);
  const [tryOnResult, setTryOnResult] = useState<TryOnResult | null>(null);

  const scrollRef = useRef<ScrollView>(null);

  // Auto-select outfit from stylist navigation
  useEffect(() => {
    if (params.outfitId) {
      const found = outfits.find((o) => o.outfit_id === params.outfitId);
      if (found) {
        setSelectedOutfit(found);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 400);
      }
    }
  }, [params.outfitId, outfits]);

  const getOutfitItems = (ids: string[]) => items.filter((i) => ids.includes(i.item_id));

  const quickOccasions = ['Casual', 'Work', 'Date Night', 'Party', 'Weekend', 'Formal'];

  const handleGenerate = async () => {
    if (items.length < 2) {
      Alert.alert('Not enough items', 'Add at least 2 items to your wardrobe first.');
      return;
    }
    setIsGenerating(true);
    setGeneratedOutfit(null);
    try {
      const result = await generateOutfitAI({ occasion: occasion || undefined, weather: weather || undefined });
      if (result?.outfit) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        setGeneratedOutfit(result.outfit);
      } else {
        Alert.alert('AI unavailable', 'Make sure GEMINI_API_KEY is set in backend .env');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not connect to backend.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveGenerated = async () => {
    if (!generatedOutfit) return;
    const saved = await addOutfit({
      name: generatedOutfit.name,
      item_ids: generatedOutfit.item_ids,
      description: generatedOutfit.description,
      ai_generated: true,
    });
    if (saved) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      showToast('Outfit saved');
      setGeneratedOutfit(null);
      setShowGenerator(false);
      setSelectedOutfit(saved);
    }
  };

  const handleTryOn = async () => {
    if (!selectedOutfit) return;
    setIsTryingOn(true);
    setTryOnResult(null);
    setShowTryOn(true);
    try {
      const result = await tryOnOutfit({
        outfitId: selectedOutfit.outfit_id,
        bodyPhoto: profile?.body_photo_base64,
      });
      setTryOnResult(result);
    } catch {
      Alert.alert('Error', 'Try-on failed. Please try again.');
      setShowTryOn(false);
    } finally {
      setIsTryingOn(false);
    }
  };

  const outfitItems = selectedOutfit ? getOutfitItems(selectedOutfit.item_ids) : [];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>My Looks</Text>
            <Text style={styles.subtitle}>{outfits.length} saved outfits</Text>
          </View>
          <TouchableOpacity
            style={styles.styleMeBtn}
            onPress={() => setShowGenerator(true)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[Colors.gradientStart, Colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.styleMeGradient}
            >
              <Ionicons name="sparkles" size={16} color="white" />
              <Text style={styles.styleMeText}>Style Me</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Selected outfit mannequin view */}
          {selectedOutfit && (
            <Animated.View entering={FadeInDown.springify()} style={styles.mannequinSection}>
              <LinearGradient
                colors={[Colors.mannequinBg, Colors.background]}
                style={styles.mannequinCard}
              >
                <View style={styles.mannequinHeader}>
                  <View style={styles.mannequinTitleRow}>
                    <Text style={styles.mannequinTitle}>{selectedOutfit.name}</Text>
                    {selectedOutfit.ai_generated && (
                      <View style={styles.aiBadge}>
                        <Ionicons name="sparkles" size={10} color={Colors.primary} />
                        <Text style={styles.aiBadgeText}>AI</Text>
                      </View>
                    )}
                  </View>
                  {selectedOutfit.description && (
                    <Text style={styles.mannequinDesc} numberOfLines={2}>
                      {selectedOutfit.description}
                    </Text>
                  )}
                </View>

                <Mannequin outfitItems={outfitItems} />

                <View style={styles.outfitActions}>
                  <TouchableOpacity
                    style={styles.tryOnBtn}
                    onPress={handleTryOn}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={[Colors.gradientStart, Colors.gradientEnd]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.tryOnGradient}
                    >
                      <Ionicons name="body" size={18} color="white" />
                      <Text style={styles.tryOnText}>Try On</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteOutfitBtn}
                    onPress={() =>
                      Alert.alert('Delete', `Remove "${selectedOutfit.name}"?`, [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () => {
                            deleteOutfit(selectedOutfit.outfit_id);
                            setSelectedOutfit(null);
                          },
                        },
                      ])
                    }
                  >
                    <Ionicons name="trash-outline" size={18} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </Animated.View>
          )}

          {/* Outfit grid */}
          {outfits.length === 0 ? (
            <Animated.View entering={FadeIn} style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="color-palette-outline" size={48} color={Colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No outfits yet</Text>
              <Text style={styles.emptySubtitle}>
                Generate looks with AI from your wardrobe, or mix and match pieces yourself.
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => setShowGenerator(true)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[Colors.gradientStart, Colors.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.emptyActionGradient}
                >
                  <Ionicons name="sparkles" size={18} color="white" />
                  <Text style={styles.emptyActionText}>Generate with AI</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <View style={styles.grid}>
              {outfits.map((outfit, i) => {
                const oItems = getOutfitItems(outfit.item_ids);
                const isSelected = selectedOutfit?.outfit_id === outfit.outfit_id;
                return (
                  <Animated.View key={outfit.outfit_id} entering={FadeInDown.delay(i * 40)}>
                    <TouchableOpacity
                      style={[styles.outfitCard, isSelected && styles.outfitCardSelected]}
                      onPress={() => setSelectedOutfit(isSelected ? null : outfit)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.outfitCardThumbArea}>
                        <OutfitThumbs items={oItems} />
                      </View>
                      <View style={styles.outfitCardInfo}>
                        <Text style={styles.outfitCardName} numberOfLines={2}>
                          {outfit.name}
                        </Text>
                        <View style={styles.outfitCardMeta}>
                          <Text style={styles.outfitCardMetaText}>
                            {outfit.item_ids.length} items
                          </Text>
                          {outfit.ai_generated && (
                            <View style={styles.aiBadge}>
                              <Ionicons name="sparkles" size={9} color={Colors.primary} />
                              <Text style={styles.aiBadgeText}>AI</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      {isSelected && (
                        <View style={styles.selectedIndicator}>
                          <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                        </View>
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* AI Outfit Generator Modal */}
      <Modal
        visible={showGenerator}
        animationType="slide"
        transparent
        onRequestClose={() => { setShowGenerator(false); setGeneratedOutfit(null); }}
      >
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeInUp.springify()} style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>AI Style Generator</Text>
              <TouchableOpacity onPress={() => { setShowGenerator(false); setGeneratedOutfit(null); }}>
                <Ionicons name="close" size={26} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              {!generatedOutfit ? (
                <>
                  <Text style={styles.modalSubtitle}>
                    Tell Steffy what you need and she'll build the perfect outfit from your wardrobe.
                  </Text>
                  <Text style={styles.label}>Occasion</Text>
                  <View style={styles.chipRow}>
                    {quickOccasions.map((o) => (
                      <TouchableOpacity
                        key={o}
                        style={[styles.chip, occasion === o && styles.chipActive]}
                        onPress={() => setOccasion(occasion === o ? '' : o)}
                      >
                        <Text style={[styles.chipText, occasion === o && styles.chipTextActive]}>
                          {o}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    style={styles.input}
                    value={occasion}
                    onChangeText={setOccasion}
                    placeholder="Or describe your occasion..."
                    placeholderTextColor={Colors.textMuted}
                  />
                  <Text style={styles.label}>Weather (optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={weather}
                    onChangeText={setWeather}
                    placeholder="e.g. Sunny, Cold, Rainy"
                    placeholderTextColor={Colors.textMuted}
                  />
                  {items.length < 2 && (
                    <View style={styles.warningBox}>
                      <Ionicons name="warning-outline" size={16} color={Colors.warning} />
                      <Text style={styles.warningText}>
                        Add at least 2 items to your wardrobe first.
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={[styles.generateBtn, (isGenerating || items.length < 2) && styles.generateBtnDisabled]}
                    onPress={handleGenerate}
                    disabled={isGenerating || items.length < 2}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={[Colors.gradientStart, Colors.gradientEnd]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.generateBtnGradient}
                    >
                      {isGenerating ? (
                        <>
                          <ActivityIndicator size="small" color="white" />
                          <Text style={styles.generateBtnText}>Steffy is styling you...</Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="sparkles" size={20} color="white" />
                          <Text style={styles.generateBtnText}>Generate Outfit</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              ) : (
                <Animated.View entering={ZoomIn.springify()}>
                  <Text style={styles.resultTitle}>{generatedOutfit.name}</Text>
                  {generatedOutfit.description && (
                    <Text style={styles.resultDesc}>{generatedOutfit.description}</Text>
                  )}
                  <View style={styles.resultMannequin}>
                    <Mannequin outfitItems={getOutfitItems(generatedOutfit.item_ids)} />
                  </View>
                  <View style={styles.resultItems}>
                    {getOutfitItems(generatedOutfit.item_ids).map((item) => (
                      <View key={item.item_id} style={styles.resultItem}>
                        <Image
                          source={{ uri: `data:image/jpeg;base64,${item.image_base64}` }}
                          style={styles.resultItemImage}
                          resizeMode="cover"
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.resultItemName}>{item.name}</Text>
                          <Text style={styles.resultItemCat}>{item.category}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleSaveGenerated}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={[Colors.gradientStart, Colors.gradientEnd]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.saveBtnGradient}
                    >
                      <Ionicons name="heart" size={18} color="white" />
                      <Text style={styles.saveBtnText}>Save This Look</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.regenerateBtn}
                    onPress={() => { setGeneratedOutfit(null); handleGenerate(); }}
                  >
                    <Ionicons name="refresh" size={16} color={Colors.primary} />
                    <Text style={styles.regenerateBtnText}>Generate another</Text>
                  </TouchableOpacity>
                </Animated.View>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Try-On Modal */}
      <Modal
        visible={showTryOn}
        animationType="slide"
        transparent
        onRequestClose={() => { setShowTryOn(false); setTryOnResult(null); }}
      >
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeInUp.springify()} style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Try On</Text>
              <TouchableOpacity onPress={() => { setShowTryOn(false); setTryOnResult(null); }}>
                <Ionicons name="close" size={26} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {isTryingOn ? (
                <View style={styles.tryOnLoading}>
                  <LinearGradient
                    colors={[Colors.primary + '20', Colors.secondary + '20']}
                    style={styles.tryOnLoadingCard}
                  >
                    <ThemedLoader size="large" />
                    <Text style={styles.tryOnLoadingText}>Steffy is styling you...</Text>
                    <Text style={styles.tryOnLoadingSubtext}>
                      {profile?.body_photo_base64
                        ? 'Generating your try-on image...'
                        : 'Creating your try-on image...'}
                    </Text>
                  </LinearGradient>
                </View>
              ) : tryOnResult ? (
                <Animated.View entering={FadeIn}>
                  {tryOnResult.image_base64 ? (
                    <View style={styles.tryOnImageWrap}>
                      <Image
                        source={{ uri: `data:image/png;base64,${tryOnResult.image_base64}` }}
                        style={styles.tryOnImage}
                        resizeMode="cover"
                      />
                      <Text style={styles.tryOnImageLabel}>Your try-on look</Text>
                    </View>
                  ) : selectedOutfit ? (
                    <View style={styles.tryOnMannequin}>
                      <Mannequin outfitItems={outfitItems} />
                    </View>
                  ) : null}
                  <View style={styles.tryOnResultCard}>
                    <View style={styles.tryOnResultHeader}>
                      <Ionicons name="sparkles" size={20} color={Colors.primary} />
                      <Text style={styles.tryOnResultTitle}>Steffy's Take</Text>
                    </View>
                    <Text style={styles.tryOnResultText}>{tryOnResult.description}</Text>
                    {tryOnResult.note && (
                      <TouchableOpacity style={styles.tryOnNote}>
                        <Ionicons name="information-circle-outline" size={14} color={Colors.textMuted} />
                        <Text style={styles.tryOnNoteText}>{tryOnResult.note}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </Animated.View>
              ) : null}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  safeArea: { flex: 1 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: { ...typography.h2, color: Colors.text },
  subtitle: { ...typography.caption, color: Colors.textSecondary, marginTop: 2 },
  styleMeBtn: { borderRadius: radius.full, overflow: 'hidden' },
  styleMeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  styleMeText: { color: 'white', fontSize: 14, fontWeight: '700' },

  scroll: { padding: spacing.lg, paddingBottom: 100 },

  mannequinSection: { marginBottom: spacing.xl },
  mannequinCard: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mannequinHeader: { marginBottom: spacing.md },
  mannequinTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  mannequinTitle: { ...typography.h4, color: Colors.text, flex: 1 },
  mannequinDesc: { ...typography.bodySmall, color: Colors.textSecondary, lineHeight: 18 },

  outfitActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  tryOnBtn: { flex: 1, borderRadius: radius.full, overflow: 'hidden' },
  tryOnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  tryOnText: { color: 'white', fontWeight: '700', fontSize: 15 },
  deleteOutfitBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.error + '15',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.error + '30',
  },

  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  aiBadgeText: { fontSize: 9, fontWeight: '700', color: Colors.primary },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  outfitCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.surface,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    shadowColor: '#2D1B2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  outfitCardSelected: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  outfitCardThumbArea: {
    height: 88,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  outfitCardInfo: { padding: spacing.md },
  outfitCardName: { ...typography.label, color: Colors.text, marginBottom: 4 },
  outfitCardMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  outfitCardMetaText: { ...typography.caption, color: Colors.textSecondary },
  selectedIndicator: { position: 'absolute', top: spacing.sm, right: spacing.sm },

  emptyState: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: spacing.xl },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: { ...typography.h4, color: Colors.text, marginBottom: spacing.sm, textAlign: 'center' },
  emptySubtitle: {
    ...typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  emptyActionBtn: { borderRadius: radius.full, overflow: 'hidden' },
  emptyActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  emptyActionText: { color: 'white', fontWeight: '700', fontSize: 15 },

  // Modal shared
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    maxHeight: '92%',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: { ...typography.h3, color: Colors.text },
  modalScroll: { paddingBottom: spacing.xxl },
  modalSubtitle: { ...typography.bodySmall, color: Colors.textSecondary, marginBottom: spacing.lg },

  label: { ...typography.label, color: Colors.text, marginBottom: spacing.sm, marginTop: spacing.md },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 15,
    color: Colors.text,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: 'white' },

  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: Colors.warning + '15',
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  warningText: { ...typography.bodySmall, color: Colors.warning, flex: 1 },

  generateBtn: { marginTop: spacing.xl, borderRadius: radius.full, overflow: 'hidden' },
  generateBtnDisabled: { opacity: 0.5 },
  generateBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 16,
  },
  generateBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },

  resultTitle: { ...typography.h3, color: Colors.text, marginBottom: spacing.sm },
  resultDesc: { ...typography.bodySmall, color: Colors.textSecondary, marginBottom: spacing.lg, lineHeight: 20 },
  resultMannequin: {
    alignItems: 'center',
    backgroundColor: Colors.mannequinBg,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  resultItems: { gap: spacing.sm, marginBottom: spacing.lg },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resultItemImage: { width: 44, height: 56, borderRadius: radius.sm },
  resultItemName: { ...typography.label, color: Colors.text },
  resultItemCat: { ...typography.caption, color: Colors.textSecondary, marginTop: 2 },
  saveBtn: { borderRadius: radius.full, overflow: 'hidden', marginBottom: spacing.md },
  saveBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
  },
  saveBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
  regenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
  },
  regenerateBtnText: { ...typography.label, color: Colors.primary },

  tryOnLoading: { paddingVertical: spacing.xl },
  tryOnLoadingCard: {
    borderRadius: radius.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  tryOnLoadingText: { ...typography.h4, color: Colors.text },
  tryOnLoadingSubtext: { ...typography.bodySmall, color: Colors.textSecondary, textAlign: 'center' },
  tryOnImageWrap: {
    marginBottom: spacing.lg,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tryOnImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: Colors.mannequinBg,
  },
  tryOnImageLabel: {
    ...typography.caption,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  tryOnMannequin: {
    alignItems: 'center',
    backgroundColor: Colors.mannequinBg,
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
  },
  tryOnResultCard: {
    backgroundColor: Colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tryOnResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tryOnResultTitle: { ...typography.h4, color: Colors.text },
  tryOnResultText: { ...typography.body, color: Colors.text, lineHeight: 24 },
  tryOnNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  tryOnNoteText: { ...typography.caption, color: Colors.textMuted, flex: 1, lineHeight: 16 },
});
