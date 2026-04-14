import React, { useState, useMemo } from 'react';
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
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useWardrobe, ClothingItem } from '../../contexts/WardrobeContext';
import { useToast } from '../../contexts/ToastContext';
import * as Haptics from 'expo-haptics';
import Colors from '../../constants/Colors';
import { spacing, typography, radius } from '../../constants/Theme';
import Animated, { FadeIn, FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { SkeletonWardrobeCard } from '../../components/SkeletonCard';

const { width } = Dimensions.get('window');
const COLS = width > 600 ? 4 : 3;
const GRID_PADDING = spacing.md;
const ITEM_GAP = 10;
const ITEM_SIZE = (width - GRID_PADDING * 2 - ITEM_GAP * (COLS - 1)) / COLS;

const CATEGORIES = [
  { id: 'all', name: 'All', icon: 'apps-outline' as const },
  { id: 'tops', name: 'Tops', icon: 'shirt-outline' as const },
  { id: 'bottoms', name: 'Bottoms', icon: 'git-branch-outline' as const },
  { id: 'dresses', name: 'Dresses', icon: 'woman-outline' as const },
  { id: 'jackets', name: 'Jackets', icon: 'layers-outline' as const },
  { id: 'shoes', name: 'Shoes', icon: 'footsteps-outline' as const },
  { id: 'accessories', name: 'Acc.', icon: 'watch-outline' as const },
];

const TAG_COLORS: Record<string, string> = {
  fabric: '#FFF0F2',
  pattern: '#FFE8EC',
  fit: '#FCE7EA',
  occasion: '#F8E8EB',
  season: '#F5D9DC',
  color: '#FFE4E8',
};

function DetailTag({ label, value, type }: { label: string; value: string; type: string }) {
  return (
    <View style={[styles.detailTag, { backgroundColor: TAG_COLORS[type] || Colors.primaryMuted }]}>
      <Text style={styles.detailTagLabel}>{label}</Text>
      <Text style={styles.detailTagValue}>{value}</Text>
    </View>
  );
}

export default function Wardrobe() {
  const { items, loading, addItem, deleteItem, recognizeClothing } = useWardrobe();
  const { showToast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ClothingItem | null>(null);

  const [imageBase64, setImageBase64] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState('tops');
  const [itemColor, setItemColor] = useState('');
  const [itemSeason, setItemSeason] = useState('all');
  const [itemFabric, setItemFabric] = useState('');
  const [itemPattern, setItemPattern] = useState('');
  const [itemFit, setItemFit] = useState('');
  const [itemOccasion, setItemOccasion] = useState('');
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [recognitionResult, setRecognitionResult] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);

  const filteredItems = useMemo(
    () =>
      selectedCategory === 'all'
        ? items
        : items.filter((item) => item.category === selectedCategory),
    [items, selectedCategory]
  );

  const categoryCount = useMemo(
    () =>
      CATEGORIES.reduce((acc, cat) => {
        acc[cat.id] =
          cat.id === 'all'
            ? items.length
            : items.filter((i) => i.category === cat.id).length;
        return acc;
      }, {} as Record<string, number>),
    [items]
  );

  const pickImageWebFallback = (): Promise<string | null> =>
    new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      input.onchange = () => {
        const file = input.files?.[0];
        if (input.parentNode) input.parentNode.removeChild(input);
        if (!file || !file.type.startsWith('image/')) { resolve(null); return; }
        const reader = new FileReader();
        reader.onloadend = () => {
          const str = (reader.result as string) || '';
          resolve(str.includes(',') ? str.split(',')[1] : str);
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      };
      document.body.appendChild(input);
      input.click();
    });

  const handlePickImage = async () => {
    try {
      if (Platform.OS !== 'web') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permission needed', 'Allow photo library access to add clothes.');
          return;
        }
      }

      let result: { canceled: boolean; assets?: { base64?: string; uri?: string }[] };
      try {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: Platform.OS !== 'web',
          aspect: Platform.OS !== 'web' ? [3, 4] : undefined,
          quality: 0.7,
          base64: true,
        });
      } catch {
        if (Platform.OS === 'web') {
          const b64 = await pickImageWebFallback();
          result = b64 ? { canceled: false, assets: [{ base64: b64 }] } : { canceled: true };
        } else {
          throw new Error('Image picker failed');
        }
      }

      if (result.canceled || !result.assets?.[0]) return;

      let base64 = result.assets[0].base64;
      if (!base64 && result.assets[0].uri) {
        const res = await fetch(result.assets[0].uri);
        const blob = await res.blob();
        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const str = (reader.result as string) || '';
            resolve(str.includes(',') ? str.split(',')[1] : str);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
      if (!base64) { Alert.alert('Error', 'Could not load image.'); return; }

      setImageBase64(base64);
      setIsRecognizing(true);
      setRecognitionResult(null);

      try {
        const r = await recognizeClothing(base64);
        if (r && !r.error) {
          setRecognitionResult(r);
          setItemName(r.name || '');
          setItemCategory(r.category || 'tops');
          setItemColor(r.color || '');
          setItemSeason(r.season || 'all');
          setItemFabric(r.fabric || '');
          setItemPattern(r.pattern || '');
          setItemFit(r.fit || '');
          setItemOccasion(r.occasion || '');
        }
      } catch {
        // AI detection failed — user fills in manually
      } finally {
        setIsRecognizing(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleAddItem = async () => {
    if (!imageBase64 || !itemName || !itemCategory) {
      Alert.alert('Missing info', 'Please add a photo and item name.');
      return;
    }
    setIsAdding(true);
    try {
      const newItem = await addItem({
        name: itemName,
        category: itemCategory,
        image_base64: imageBase64,
        color: itemColor || undefined,
        season: itemSeason || undefined,
        fabric: itemFabric || undefined,
        pattern: itemPattern || undefined,
        fit: itemFit || undefined,
        occasion: itemOccasion || undefined,
      });
      if (newItem) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        showToast('Added to wardrobe');
        setShowAddModal(false);
        resetForm();
      } else {
        Alert.alert('Error', 'Failed to add item. Is the backend running?');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to add item.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteItem = (item: ClothingItem) => {
    Alert.alert('Remove item', `Remove "${item.name}" from your wardrobe?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteItem(item.item_id);
          setShowItemModal(false);
          setSelectedItem(null);
        },
      },
    ]);
  };

  const resetForm = () => {
    setImageBase64('');
    setItemName('');
    setItemCategory('tops');
    setItemColor('');
    setItemSeason('all');
    setItemFabric('');
    setItemPattern('');
    setItemFit('');
    setItemOccasion('');
    setRecognitionResult(null);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>My Wardrobe</Text>
            <Text style={styles.subtitle}>{items.length} pieces</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[Colors.gradientStart, Colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addBtnGradient}
            >
              <Ionicons name="add" size={26} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Category filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
          style={styles.filterContainer}
        >
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelectedCategory(cat.id)}
                activeOpacity={0.7}
                style={[styles.filterPill, active && styles.filterPillActive]}
              >
                <Ionicons
                  name={cat.icon}
                  size={14}
                  color={active ? 'white' : Colors.textSecondary}
                />
                <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                  {cat.name}
                </Text>
                <View style={[styles.filterBadge, active && styles.filterBadgeActive]}>
                  <Text style={[styles.filterBadgeText, active && styles.filterBadgeTextActive]}>
                    {categoryCount[cat.id] || 0}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Grid */}
        <ScrollView
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.itemsGrid}>
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonWardrobeCard key={i} width={ITEM_SIZE} />
              ))}
            </View>
          ) : filteredItems.length === 0 ? (
            <Animated.View entering={FadeIn} style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="shirt-outline" size={48} color={Colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>
                {selectedCategory === 'all' ? 'Your wardrobe is empty' : `No ${selectedCategory} yet`}
              </Text>
              <Text style={styles.emptySubtitle}>
                Add your first piece — snap a photo and Steffy will detect it for you.
              </Text>
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => setShowAddModal(true)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[Colors.gradientStart, Colors.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.emptyAddBtnGradient}
                >
                  <Ionicons name="camera" size={18} color="white" />
                  <Text style={styles.emptyAddBtnText}>Add Clothing</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <View style={styles.itemsGrid}>
              {filteredItems.map((item, index) => (
                <Animated.View
                  key={item.item_id}
                  entering={FadeInDown.delay(index * 30).springify()}
                >
                  <TouchableOpacity
                    style={styles.itemCard}
                    activeOpacity={0.85}
                    onPress={() => {
                      setSelectedItem(item);
                      setShowItemModal(true);
                    }}
                  >
                    <Image
                      source={{ uri: `data:image/jpeg;base64,${item.image_base64}` }}
                      style={styles.itemImage}
                      resizeMode="cover"
                    />
                    {item.color && (
                      <View style={styles.colorIndicator}>
                        <View
                          style={[
                            styles.colorDot,
                            { backgroundColor: item.color.toLowerCase().split(' ').pop() || '#ccc' },
                          ]}
                        />
                      </View>
                    )}
                    <View style={styles.itemFooter}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {item.fabric && (
                        <Text style={styles.itemSub} numberOfLines={1}>
                          {item.fabric}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Add Item Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => { setShowAddModal(false); resetForm(); }}
      >
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeInUp.springify()} style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add to Wardrobe</Text>
              <TouchableOpacity onPress={() => { setShowAddModal(false); resetForm(); }}>
                <Ionicons name="close" size={26} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              {!imageBase64 ? (
                <TouchableOpacity
                  style={styles.uploadCard}
                  onPress={handlePickImage}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[Colors.primary + '15', Colors.secondary + '15']}
                    style={styles.uploadCardInner}
                  >
                    <View style={styles.uploadIconWrap}>
                      <LinearGradient
                        colors={[Colors.gradientStart, Colors.gradientEnd]}
                        style={styles.uploadIconGradient}
                      >
                        <Ionicons name="camera" size={32} color="white" />
                      </LinearGradient>
                    </View>
                    <Text style={styles.uploadTitle}>Upload a photo</Text>
                    <Text style={styles.uploadSubtitle}>
                      AI will instantly detect fabric, pattern, fit, occasion, and more
                    </Text>
                    <View style={styles.uploadFeatures}>
                      {['Fabric type', 'Pattern', 'Fit', 'Occasion', 'Season'].map((f) => (
                        <View key={f} style={styles.uploadFeatureChip}>
                          <Ionicons name="sparkles" size={10} color={Colors.primary} />
                          <Text style={styles.uploadFeatureText}>{f}</Text>
                        </View>
                      ))}
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <>
                  {/* Image preview */}
                  <TouchableOpacity
                    style={styles.previewWrap}
                    onPress={handlePickImage}
                    activeOpacity={0.9}
                  >
                    <Image
                      source={{ uri: `data:image/jpeg;base64,${imageBase64}` }}
                      style={styles.previewImage}
                      resizeMode="cover"
                    />
                    <View style={styles.changePhotoBtn}>
                      <Ionicons name="camera" size={16} color="white" />
                      <Text style={styles.changePhotoText}>Change</Text>
                    </View>
                  </TouchableOpacity>

                  {/* AI detection status */}
                  {isRecognizing && (
                    <Animated.View entering={FadeIn} style={styles.aiStatus}>
                      <LinearGradient
                        colors={[Colors.primary, Colors.secondary]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.aiStatusGradient}
                      >
                        <ActivityIndicator size="small" color="white" />
                        <Text style={styles.aiStatusText}>AI is analyzing your item...</Text>
                      </LinearGradient>
                    </Animated.View>
                  )}

                  {recognitionResult && !isRecognizing && (
                    <Animated.View entering={ZoomIn.springify()} style={styles.aiResultCard}>
                      <View style={styles.aiResultHeader}>
                        <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
                        <Text style={styles.aiResultTitle}>AI Detection Complete</Text>
                      </View>
                      <View style={styles.aiResultTags}>
                        {recognitionResult.fabric && (
                          <DetailTag label="Fabric" value={recognitionResult.fabric} type="fabric" />
                        )}
                        {recognitionResult.pattern && (
                          <DetailTag label="Pattern" value={recognitionResult.pattern} type="pattern" />
                        )}
                        {recognitionResult.fit && (
                          <DetailTag label="Fit" value={recognitionResult.fit} type="fit" />
                        )}
                        {recognitionResult.occasion && (
                          <DetailTag label="Occasion" value={recognitionResult.occasion} type="occasion" />
                        )}
                        {recognitionResult.season && (
                          <DetailTag label="Season" value={recognitionResult.season} type="season" />
                        )}
                      </View>
                    </Animated.View>
                  )}

                  {/* Form */}
                  <Text style={styles.label}>Name</Text>
                  <TextInput
                    style={styles.input}
                    value={itemName}
                    onChangeText={setItemName}
                    placeholder="e.g. Slim-Fit Dark Wash Jeans"
                    placeholderTextColor={Colors.textMuted}
                  />

                  <Text style={styles.label}>Category</Text>
                  <View style={styles.chipRow}>
                    {['tops', 'bottoms', 'dresses', 'jackets', 'shoes', 'accessories'].map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.chip, itemCategory === cat && styles.chipActive]}
                        onPress={() => setItemCategory(cat)}
                      >
                        <Text style={[styles.chipText, itemCategory === cat && styles.chipTextActive]}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.rowInputs}>
                    <View style={styles.halfInput}>
                      <Text style={styles.label}>Color</Text>
                      <TextInput
                        style={styles.input}
                        value={itemColor}
                        onChangeText={setItemColor}
                        placeholder="Navy Blue"
                        placeholderTextColor={Colors.textMuted}
                      />
                    </View>
                    <View style={styles.halfInput}>
                      <Text style={styles.label}>Fabric</Text>
                      <TextInput
                        style={styles.input}
                        value={itemFabric}
                        onChangeText={setItemFabric}
                        placeholder="Denim"
                        placeholderTextColor={Colors.textMuted}
                      />
                    </View>
                  </View>

                  <View style={styles.rowInputs}>
                    <View style={styles.halfInput}>
                      <Text style={styles.label}>Pattern</Text>
                      <TextInput
                        style={styles.input}
                        value={itemPattern}
                        onChangeText={setItemPattern}
                        placeholder="Solid"
                        placeholderTextColor={Colors.textMuted}
                      />
                    </View>
                    <View style={styles.halfInput}>
                      <Text style={styles.label}>Fit</Text>
                      <TextInput
                        style={styles.input}
                        value={itemFit}
                        onChangeText={setItemFit}
                        placeholder="Slim Fit"
                        placeholderTextColor={Colors.textMuted}
                      />
                    </View>
                  </View>

                  <Text style={styles.label}>Season</Text>
                  <View style={styles.chipRow}>
                    {['spring', 'summer', 'fall', 'winter', 'all'].map((s) => (
                      <TouchableOpacity
                        key={s}
                        style={[styles.chip, itemSeason === s && styles.chipActive]}
                        onPress={() => setItemSeason(s)}
                      >
                        <Text style={[styles.chipText, itemSeason === s && styles.chipTextActive]}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.label}>Occasion</Text>
                  <TextInput
                    style={styles.input}
                    value={itemOccasion}
                    onChangeText={setItemOccasion}
                    placeholder="Casual, Business Casual, Party..."
                    placeholderTextColor={Colors.textMuted}
                  />

                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={handleAddItem}
                    disabled={isAdding}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={[Colors.gradientStart, Colors.gradientEnd]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.submitBtnGradient}
                    >
                      {isAdding ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={20} color="white" />
                          <Text style={styles.submitBtnText}>Add to Wardrobe</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Item Detail Modal */}
      <Modal
        visible={showItemModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowItemModal(false)}
      >
        <View style={styles.detailOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            onPress={() => setShowItemModal(false)}
            activeOpacity={1}
          />
          {selectedItem && (
            <Animated.View entering={ZoomIn.springify()} style={styles.detailCard}>
              <Image
                source={{ uri: `data:image/jpeg;base64,${selectedItem.image_base64}` }}
                style={styles.detailImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.85)']}
                style={styles.detailGradient}
              />
              <TouchableOpacity
                style={styles.detailCloseBtn}
                onPress={() => setShowItemModal(false)}
              >
                <Ionicons name="close" size={22} color="white" />
              </TouchableOpacity>
              <View style={styles.detailBottom}>
                <Text style={styles.detailName}>{selectedItem.name}</Text>
                <View style={styles.detailTagRow}>
                  {selectedItem.category && (
                    <View style={styles.detailTagChip}>
                      <Text style={styles.detailTagChipText}>{selectedItem.category}</Text>
                    </View>
                  )}
                  {selectedItem.fabric && (
                    <View style={styles.detailTagChip}>
                      <Text style={styles.detailTagChipText}>{selectedItem.fabric}</Text>
                    </View>
                  )}
                  {selectedItem.pattern && (
                    <View style={styles.detailTagChip}>
                      <Text style={styles.detailTagChipText}>{selectedItem.pattern}</Text>
                    </View>
                  )}
                  {selectedItem.fit && (
                    <View style={styles.detailTagChip}>
                      <Text style={styles.detailTagChipText}>{selectedItem.fit}</Text>
                    </View>
                  )}
                  {selectedItem.occasion && (
                    <View style={styles.detailTagChip}>
                      <Text style={styles.detailTagChipText}>{selectedItem.occasion}</Text>
                    </View>
                  )}
                  {selectedItem.season && selectedItem.season !== 'all' && (
                    <View style={styles.detailTagChip}>
                      <Text style={styles.detailTagChipText}>{selectedItem.season}</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteItem(selectedItem)}
                >
                  <Ionicons name="trash-outline" size={16} color={Colors.error} />
                  <Text style={styles.deleteBtnText}>Remove from wardrobe</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
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
    paddingHorizontal: GRID_PADDING,
    paddingVertical: spacing.md,
  },
  title: { ...typography.h2, color: Colors.text },
  subtitle: { ...typography.caption, color: Colors.textSecondary, marginTop: 2 },
  addBtn: { borderRadius: radius.full, overflow: 'hidden' },
  addBtnGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterContainer: { maxHeight: 48, marginBottom: spacing.sm },
  filterScroll: {
    paddingHorizontal: GRID_PADDING,
    gap: spacing.sm,
    alignItems: 'center',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterPillText: { ...typography.caption, color: Colors.textSecondary, fontWeight: '600' },
  filterPillTextActive: { color: 'white' },
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  filterBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  filterBadgeTextActive: { color: 'white' },

  grid: { paddingHorizontal: GRID_PADDING, paddingBottom: 100 },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ITEM_GAP,
  },
  itemCard: {
    width: ITEM_SIZE,
    backgroundColor: Colors.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  itemImage: {
    width: ITEM_SIZE,
    height: ITEM_SIZE * 1.2,
    backgroundColor: Colors.background,
  },
  colorIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: radius.full,
    padding: 3,
  },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  itemFooter: { padding: 8 },
  itemName: { ...typography.caption, color: Colors.text, fontWeight: '600' },
  itemSub: { fontSize: 10, color: Colors.textMuted, marginTop: 1 },

  centeredState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyState: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: spacing.xl },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
  emptyAddBtn: { borderRadius: radius.full, overflow: 'hidden' },
  emptyAddBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  emptyAddBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '92%',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
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

  uploadCard: { borderRadius: radius.xl, overflow: 'hidden', marginBottom: spacing.md },
  uploadCardInner: {
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary + '30',
    borderStyle: 'dashed',
    borderRadius: radius.xl,
  },
  uploadIconWrap: { marginBottom: spacing.md },
  uploadIconGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadTitle: { ...typography.h4, color: Colors.text, marginBottom: spacing.sm },
  uploadSubtitle: {
    ...typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  uploadFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  uploadFeatureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  uploadFeatureText: { fontSize: 11, fontWeight: '600', color: Colors.primary },

  previewWrap: { borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.md, height: 220 },
  previewImage: { width: '100%', height: '100%' },
  changePhotoBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
  },
  changePhotoText: { color: 'white', fontSize: 12, fontWeight: '700' },

  aiStatus: { borderRadius: radius.md, overflow: 'hidden', marginBottom: spacing.md },
  aiStatusGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: spacing.sm,
  },
  aiStatusText: { color: 'white', fontWeight: '600', fontSize: 14 },

  aiResultCard: {
    backgroundColor: Colors.success + '12',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: Colors.success + '40',
  },
  aiResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  aiResultTitle: { ...typography.label, color: Colors.text },
  aiResultTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  detailTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  detailTagLabel: { fontSize: 9, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase' },
  detailTagValue: { fontSize: 12, fontWeight: '600', color: Colors.text, marginTop: 1 },

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
  rowInputs: { flexDirection: 'row', gap: spacing.sm },
  halfInput: { flex: 1 },
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

  submitBtn: { marginTop: spacing.xl, borderRadius: radius.full, overflow: 'hidden' },
  submitBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 16,
  },
  submitBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },

  // Item detail
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  detailCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  detailImage: { width: '100%', height: 380 },
  detailGradient: { ...StyleSheet.absoluteFillObject },
  detailCloseBtn: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
  },
  detailName: { ...typography.h3, color: 'white', marginBottom: spacing.sm },
  detailTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.md },
  detailTagChip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  detailTagChipText: { fontSize: 11, fontWeight: '600', color: 'white' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  deleteBtnText: { fontSize: 13, fontWeight: '600', color: Colors.error },
});
