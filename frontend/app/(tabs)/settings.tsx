import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useWardrobe } from '../../contexts/WardrobeContext';
import GlassCard from '../../components/GlassCard';
import Colors from '../../constants/Colors';
import { spacing, typography, radius } from '../../constants/Theme';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

export default function Settings() {
  const { items, outfits, profile, updateProfile, fetchProfile } = useWardrobe();

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [bodyType, setBodyType] = useState('');
  const [stylePrefs, setStylePrefs] = useState('');
  const [favoriteColors, setFavoriteColors] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (profile) {
      setBodyType(profile.body_type || '');
      setStylePrefs(profile.style_preferences?.join(', ') || '');
      setFavoriteColors(profile.favorite_colors?.join(', ') || '');
    }
  }, [profile]);

  const pickPhotoWebFallback = (): Promise<string | null> =>
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

  const handleUploadBodyPhoto = async () => {
    try {
      if (Platform.OS !== 'web') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permission needed', 'Please allow photo library access.');
          return;
        }
      }

      let base64: string | null = null;

      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [2, 3],
          quality: 0.7,
          base64: true,
        });
        if (!result.canceled && result.assets?.[0]) {
          base64 = result.assets[0].base64 || null;
        }
      } catch {
        if (Platform.OS === 'web') {
          base64 = await pickPhotoWebFallback();
        }
      }

      if (!base64) return;

      setUploadingPhoto(true);
      await updateProfile({ body_photo_base64: base64 });
      Alert.alert('Photo saved', 'Your photo is saved. Steffy will analyze your body type and use it for Try-On images and personalized styling.');
    } catch {
      Alert.alert('Error', 'Failed to upload photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemoveBodyPhoto = () => {
    Alert.alert('Remove photo', 'Remove your body photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => updateProfile({ body_photo_base64: undefined }),
      },
    ]);
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await updateProfile({
        body_type: bodyType || undefined,
        style_preferences: stylePrefs ? stylePrefs.split(',').map((s) => s.trim()) : undefined,
        favorite_colors: favoriteColors ? favoriteColors.split(',').map((c) => c.trim()) : undefined,
      });
      Alert.alert('Saved', 'Profile updated.');
      setShowProfileModal(false);
    } catch {
      Alert.alert('Error', 'Failed to save profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const CATEGORY_BREAKDOWN = [
    { id: 'tops', label: 'Tops', icon: 'shirt-outline' as const },
    { id: 'bottoms', label: 'Bottoms', icon: 'git-branch-outline' as const },
    { id: 'dresses', label: 'Dresses', icon: 'woman-outline' as const },
    { id: 'jackets', label: 'Jackets', icon: 'layers-outline' as const },
    { id: 'shoes', label: 'Shoes', icon: 'footsteps-outline' as const },
    { id: 'accessories', label: 'Accessories', icon: 'watch-outline' as const },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Profile card */}
          <Animated.View entering={FadeIn}>
            <GlassCard style={styles.profileCard}>
              <View style={styles.profileHeader}>
                <LinearGradient
                  colors={[Colors.gradientStart, Colors.gradientEnd]}
                  style={styles.avatarGradient}
                >
                  <Ionicons name="person" size={36} color="white" />
                </LinearGradient>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>Fashion Lover</Text>
                  <Text style={styles.profileSub}>Steffy AI Wardrobe</Text>
                  {profile?.body_type && (
                    <View style={styles.profileTag}>
                      <Text style={styles.profileTagText}>{profile.body_type}</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.statsRow}>
                {[
                  { value: items.length, label: 'Items' },
                  { value: outfits.length, label: 'Outfits' },
                  { value: new Set(items.map((i) => i.category)).size, label: 'Categories' },
                ].map((s, i) => (
                  <React.Fragment key={s.label}>
                    {i > 0 && <View style={styles.statDivider} />}
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{s.value}</Text>
                      <Text style={styles.statName}>{s.label}</Text>
                    </View>
                  </React.Fragment>
                ))}
              </View>
            </GlassCard>
          </Animated.View>

          {/* Your Model (Body Photo) — KEY FEATURE */}
          <Animated.View entering={FadeInDown.delay(80)}>
            <Text style={styles.sectionTitle}>Your Model</Text>
            <GlassCard style={styles.modelCard} padding={spacing.md}>
              <View style={styles.modelCardHeader}>
                <View>
                  <Text style={styles.modelCardTitle}>Full Body Photo</Text>
                  <Text style={styles.modelCardSubtitle}>
                    Used by AI Try-On for personalized style descriptions
                  </Text>
                </View>
                {profile?.body_photo_base64 && (
                  <TouchableOpacity onPress={handleRemoveBodyPhoto}>
                    <Ionicons name="trash-outline" size={18} color={Colors.error} />
                  </TouchableOpacity>
                )}
              </View>

              {profile?.body_photo_base64 ? (
                <TouchableOpacity
                  style={styles.photoPreviewWrap}
                  onPress={handleUploadBodyPhoto}
                  activeOpacity={0.85}
                >
                  <Image
                    source={{ uri: `data:image/jpeg;base64,${profile.body_photo_base64}` }}
                    style={styles.photoPreview}
                    resizeMode="cover"
                  />
                  <View style={styles.changePhotoOverlay}>
                    <Ionicons name="camera" size={18} color="white" />
                    <Text style={styles.changePhotoText}>Change Photo</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.photoUploadArea}
                  onPress={handleUploadBodyPhoto}
                  disabled={uploadingPhoto}
                  activeOpacity={0.85}
                >
                  {uploadingPhoto ? (
                    <ActivityIndicator color={Colors.primary} />
                  ) : (
                    <>
                      <LinearGradient
                        colors={[Colors.gradientStart, Colors.gradientEnd]}
                        style={styles.photoUploadIcon}
                      >
                        <Ionicons name="body" size={28} color="white" />
                      </LinearGradient>
                      <Text style={styles.photoUploadTitle}>Upload your photo</Text>
                      <Text style={styles.photoUploadSubtitle}>
                        Stand against a plain background, full body visible
                      </Text>
                      <View style={styles.photoUploadBtn}>
                        <Ionicons name="camera-outline" size={14} color={Colors.primary} />
                        <Text style={styles.photoUploadBtnText}>Choose Photo</Text>
                      </View>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {profile?.body_analysis && (
                <View style={styles.bodyAnalysisSection}>
                  <Text style={styles.bodyAnalysisTitle}>Your style profile</Text>
                  {profile.body_analysis.body_type && (
                    <View style={styles.bodyAnalysisRow}>
                      <Text style={styles.bodyAnalysisLabel}>Body type:</Text>
                      <Text style={styles.bodyAnalysisValue}>{profile.body_analysis.body_type}</Text>
                    </View>
                  )}
                  {profile.body_analysis.height_range && (
                    <View style={styles.bodyAnalysisRow}>
                      <Text style={styles.bodyAnalysisLabel}>Height:</Text>
                      <Text style={styles.bodyAnalysisValue}>{profile.body_analysis.height_range}</Text>
                    </View>
                  )}
                  {profile.body_analysis.styling_tips && (
                    <View style={styles.bodyAnalysisTips}>
                      <Text style={styles.bodyAnalysisLabel}>Styling tips:</Text>
                      {(Array.isArray(profile.body_analysis.styling_tips) ? profile.body_analysis.styling_tips : [profile.body_analysis.styling_tips]).map((t, i) => (
                        <Text key={i} style={styles.bodyAnalysisTip}>• {String(t)}</Text>
                      ))}
                    </View>
                  )}
                </View>
              )}
              <View style={styles.modelCardTips}>
                {['Stand against a light wall', 'Full body in frame', 'Natural light works best'].map((tip) => (
                  <View key={tip} style={styles.tip}>
                    <Ionicons name="checkmark-circle" size={13} color={Colors.success} />
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            </GlassCard>
          </Animated.View>

          {/* Wardrobe Breakdown */}
          <Animated.View entering={FadeInDown.delay(160)}>
            <Text style={styles.sectionTitle}>Wardrobe</Text>
            <GlassCard style={styles.breakdownCard} padding={spacing.md}>
              {CATEGORY_BREAKDOWN.map((cat) => {
                const count = items.filter((i) => i.category === cat.id).length;
                const pct = items.length > 0 ? count / items.length : 0;
                return (
                  <View key={cat.id} style={styles.breakdownRow}>
                    <View style={styles.breakdownLeft}>
                      <View style={styles.breakdownIcon}>
                        <Ionicons name={cat.icon} size={16} color={Colors.primary} />
                      </View>
                      <Text style={styles.breakdownLabel}>{cat.label}</Text>
                    </View>
                    <View style={styles.breakdownRight}>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${Math.round(pct * 100)}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.breakdownCount}>{count}</Text>
                    </View>
                  </View>
                );
              })}
            </GlassCard>
          </Animated.View>

          {/* Account */}
          <Animated.View entering={FadeInDown.delay(240)}>
            <Text style={styles.sectionTitle}>Account</Text>
            <GlassCard style={styles.menuCard} padding={0}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setShowProfileModal(true)}
              >
                <View style={styles.menuLeft}>
                  <View style={[styles.menuIcon, { backgroundColor: Colors.primaryMuted }]}>
                    <Ionicons name="person-circle-outline" size={20} color={Colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.menuLabel}>Edit Profile</Text>
                    <Text style={styles.menuSub}>Body type, style preferences</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            </GlassCard>
          </Animated.View>

          <Text style={styles.versionText}>Steffy v1.0 — AI Wardrobe</Text>
        </ScrollView>
      </SafeAreaView>

      {/* Edit Profile Modal */}
      <Modal
        visible={showProfileModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowProfileModal(false)}>
                <Ionicons name="close" size={26} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              <Text style={styles.label}>Body Type</Text>
              <View style={styles.chipRow}>
                {['Petite', 'Athletic', 'Curvy', 'Tall', 'Plus Size'].map((bt) => (
                  <TouchableOpacity
                    key={bt}
                    style={[styles.chip, bodyType === bt && styles.chipActive]}
                    onPress={() => setBodyType(bodyType === bt ? '' : bt)}
                  >
                    <Text style={[styles.chipText, bodyType === bt && styles.chipTextActive]}>
                      {bt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.input}
                value={bodyType}
                onChangeText={setBodyType}
                placeholder="Or describe your body type..."
                placeholderTextColor={Colors.textMuted}
              />

              <Text style={styles.label}>Style Preferences</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={stylePrefs}
                onChangeText={setStylePrefs}
                placeholder="e.g. Minimalist, Streetwear, Bohemian..."
                placeholderTextColor={Colors.textMuted}
                multiline
              />

              <Text style={styles.label}>Favorite Colors</Text>
              <TextInput
                style={styles.input}
                value={favoriteColors}
                onChangeText={setFavoriteColors}
                placeholder="e.g. Black, Navy, Blush Pink..."
                placeholderTextColor={Colors.textMuted}
              />

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={saveProfile}
                disabled={savingProfile}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[Colors.gradientStart, Colors.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveBtnGradient}
                >
                  {savingProfile ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  title: { ...typography.h1, color: Colors.text },
  scrollContent: { padding: spacing.lg, paddingBottom: 100 },

  profileCard: { marginBottom: spacing.xl },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  avatarGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  profileInfo: { flex: 1 },
  profileName: { ...typography.h3, color: Colors.text, marginBottom: 2 },
  profileSub: { ...typography.caption, color: Colors.textSecondary, marginBottom: 6 },
  profileTag: {
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  profileTagText: { fontSize: 11, fontWeight: '600', color: Colors.primary },

  statsRow: { flexDirection: 'row', alignItems: 'center', paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { ...typography.h3, color: Colors.primary, marginBottom: 2 },
  statName: { ...typography.caption, color: Colors.textSecondary },
  statDivider: { width: 1, height: 36, backgroundColor: Colors.border },

  sectionTitle: { ...typography.h4, color: Colors.text, marginBottom: spacing.md, marginTop: spacing.sm },

  modelCard: { marginBottom: spacing.xl },
  modelCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  modelCardTitle: { ...typography.label, color: Colors.text },
  modelCardSubtitle: { ...typography.caption, color: Colors.textSecondary, marginTop: 2, maxWidth: 240 },

  photoPreviewWrap: { height: 220, borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.md },
  photoPreview: { width: '100%', height: '100%' },
  changePhotoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  changePhotoText: { color: 'white', fontSize: 13, fontWeight: '700' },

  photoUploadArea: {
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary + '30',
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.md,
  },
  photoUploadIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  photoUploadTitle: { ...typography.h4, color: Colors.text, marginBottom: 6 },
  photoUploadSubtitle: {
    ...typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  photoUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  photoUploadBtnText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  bodyAnalysisSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  bodyAnalysisTitle: { ...typography.label, color: Colors.primary, marginBottom: spacing.sm },
  bodyAnalysisRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  bodyAnalysisLabel: { ...typography.caption, color: Colors.textMuted },
  bodyAnalysisValue: { ...typography.caption, color: Colors.text, flex: 1 },
  bodyAnalysisTips: { marginTop: spacing.sm },
  bodyAnalysisTip: { ...typography.caption, color: Colors.textSecondary, marginBottom: 2 },
  modelCardTips: { gap: 6, marginTop: spacing.md },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tipText: { ...typography.caption, color: Colors.textSecondary },

  breakdownCard: { marginBottom: spacing.xl },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  breakdownLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, width: 130 },
  breakdownIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownLabel: { ...typography.bodySmall, color: Colors.text, fontWeight: '600' },
  breakdownRight: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  progressBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: Colors.border, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2, backgroundColor: Colors.primary },
  breakdownCount: { ...typography.label, color: Colors.primary, minWidth: 20, textAlign: 'right' },

  menuCard: { marginBottom: spacing.xl },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  menuIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { ...typography.label, color: Colors.text },
  menuSub: { ...typography.caption, color: Colors.textSecondary, marginTop: 2 },

  versionText: { ...typography.caption, color: Colors.textMuted, textAlign: 'center', marginTop: spacing.md },

  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '85%',
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

  label: { ...typography.label, color: Colors.text, marginBottom: spacing.sm, marginTop: spacing.lg },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 15,
    color: Colors.text,
  },
  textArea: { height: 90, textAlignVertical: 'top' },
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

  saveBtn: { marginTop: spacing.xl, borderRadius: radius.full, overflow: 'hidden' },
  saveBtnGradient: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
});
