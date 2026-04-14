import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useWardrobe } from '../../contexts/WardrobeContext';
import { useToast } from '../../contexts/ToastContext';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import Colors from '../../constants/Colors';
import { spacing, typography, radius } from '../../constants/Theme';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';

const BACKEND_URL =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL ||
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  'http://127.0.0.1:3001';

interface SuggestedOutfit {
  name: string;
  item_ids: string[];
  description: string;
}

interface Message {
  message_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  suggested_outfit?: SuggestedOutfit;
}

function TypingIndicator() {
  return (
    <View style={styles.typingRow}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.dot, { opacity: 1 - i * 0.25 }]} />
      ))}
    </View>
  );
}

interface ViewLookCardProps {
  outfit: SuggestedOutfit;
  onView: () => void;
}

function ViewLookCard({ outfit, onView }: ViewLookCardProps) {
  return (
    <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.viewLookCard}>
      <View style={styles.viewLookLeft}>
        <LinearGradient
          colors={[Colors.gradientStart, Colors.gradientEnd]}
          style={styles.viewLookIcon}
        >
          <Ionicons name="color-palette" size={18} color="white" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={styles.viewLookTitle}>{outfit.name}</Text>
          <Text style={styles.viewLookSubtitle}>{outfit.item_ids.length} pieces selected from your wardrobe</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.viewLookBtn} onPress={onView} activeOpacity={0.85}>
        <Text style={styles.viewLookBtnText}>View Look</Text>
        <Ionicons name="arrow-forward" size={14} color="white" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const QUICK_PROMPTS = [
  { icon: 'sunny-outline' as const, text: "What should I wear today?", color: '#F4A835' },
  { icon: 'briefcase-outline' as const, text: "Style me for work", color: '#4A90D9' },
  { icon: 'wine-outline' as const, text: "Outfit for a date night", color: Colors.primary },
  { icon: 'color-palette-outline' as const, text: "Color combination tips", color: '#8E4585' },
];

export default function Stylist() {
  const { items, outfits, addOutfit } = useWardrobe();
  const { showToast } = useToast();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [savingOutfit, setSavingOutfit] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await fetch(`${BACKEND_URL}/api/stylist/history`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const sendMessage = async (messageText?: string) => {
    const text = (messageText ?? input).trim();
    if (!text || loading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setInput('');
    Keyboard.dismiss();

    const tempId = `temp_${Date.now()}`;
    const tempUserMsg: Message = {
      message_id: tempId,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(`${BACKEND_URL}/api/stylist/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
        credentials: 'include',
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        const assistantMsg: Message = {
          message_id: data.message_id || `asst_${Date.now()}`,
          role: 'assistant',
          content: data.response,
          created_at: new Date().toISOString(),
          suggested_outfit: data.suggested_outfit,
        };
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.message_id !== tempId);
          return [
            ...filtered,
            { ...tempUserMsg, message_id: `user_${Date.now()}` },
            assistantMsg,
          ];
        });
      } else {
        setMessages((prev) => prev.filter((m) => m.message_id !== tempId));
        const err = await response.json().catch(() => ({}));
        const detail = Array.isArray(err.detail) ? err.detail[0]?.msg : err.detail;
        Alert.alert('Error', detail || 'Failed to send message. Is the backend running?');
      }
    } catch (error: any) {
      clearTimeout(timeout);
      setMessages((prev) => prev.filter((m) => m.message_id !== tempId));
      if (error?.name === 'AbortError') {
        Alert.alert('Timeout', 'Steffy is taking too long. Please try again.');
      } else {
        Alert.alert('Connection Error', 'Could not reach the server. Is the backend running on port 3001?');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewLook = async (outfit: SuggestedOutfit, msgId: string) => {
    setSavingOutfit(msgId);
    try {
      const saved = await addOutfit({
        name: outfit.name,
        item_ids: outfit.item_ids,
        description: outfit.description,
        ai_generated: true,
      });
      if (saved) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        showToast('Look saved');
        router.push({ pathname: '/(tabs)/looks', params: { outfitId: saved.outfit_id } } as any);
      }
    } catch {
      Alert.alert('Error', 'Could not save the outfit. Please try again.');
    } finally {
      setSavingOutfit(null);
    }
  };

  const clearHistory = () => {
    Alert.alert('Clear Chat', 'Delete all chat history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${BACKEND_URL}/api/stylist/history`, {
              method: 'DELETE',
              credentials: 'include',
            });
          } catch {
            // Silently fail
          }
          setMessages([]);
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>AI Stylist</Text>
            <Text style={styles.subtitle}>
              {loading ? 'Steffy is thinking...' : 'Chat with Steffy'}
            </Text>
          </View>
          <View style={styles.headerRight}>
            {messages.length > 0 && (
              <TouchableOpacity style={styles.clearBtn} onPress={clearHistory}>
                <Ionicons name="trash-outline" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
            <View style={styles.avatarBadge}>
              <LinearGradient
                colors={[Colors.gradientStart, Colors.gradientEnd]}
                style={styles.avatarGradient}
              >
                <Ionicons name="sparkles" size={18} color="white" />
              </LinearGradient>
            </View>
          </View>
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesScroll}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
          >
            {loadingHistory ? (
              <View style={styles.centeredState}>
                <ActivityIndicator color={Colors.primary} />
              </View>
            ) : messages.length === 0 ? (
              <Animated.View entering={FadeIn} style={styles.welcomeScreen}>
                <View style={styles.welcomeAvatarWrap}>
                  <LinearGradient
                    colors={[Colors.gradientStart, Colors.gradientEnd]}
                    style={styles.welcomeAvatar}
                  >
                    <Ionicons name="sparkles" size={40} color="white" />
                  </LinearGradient>
                </View>
                <Text style={styles.welcomeTitle}>Hi, I'm Steffy</Text>
                <Text style={styles.welcomeSubtitle}>Your personal AI fashion stylist</Text>
                <Text style={styles.welcomeBody}>
                  I know your wardrobe — {items.length} items, {outfits.length} outfits — and I'm here to help you look amazing every day.
                </Text>
                <View style={styles.quickPromptsSection}>
                  <Text style={styles.quickPromptsLabel}>Try asking</Text>
                  {QUICK_PROMPTS.map((prompt, i) => (
                    <Animated.View key={i} entering={FadeInUp.delay(i * 80)}>
                      <TouchableOpacity
                        style={styles.quickPrompt}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                          sendMessage(prompt.text);
                        }}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.quickPromptIcon, { backgroundColor: prompt.color + '20' }]}>
                          <Ionicons name={prompt.icon} size={18} color={prompt.color} />
                        </View>
                        <Text style={styles.quickPromptText}>{prompt.text}</Text>
                        <Ionicons name="arrow-forward-outline" size={14} color={Colors.textMuted} />
                      </TouchableOpacity>
                    </Animated.View>
                  ))}
                </View>
              </Animated.View>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <Animated.View
                    key={msg.message_id}
                    entering={FadeInDown.delay(30)}
                    style={[
                      styles.msgRow,
                      msg.role === 'user' ? styles.msgRowUser : styles.msgRowAssistant,
                    ]}
                  >
                    {msg.role === 'assistant' && (
                      <View style={styles.msgAvatar}>
                        <LinearGradient
                          colors={[Colors.gradientStart, Colors.gradientEnd]}
                          style={styles.msgAvatarGradient}
                        >
                          <Ionicons name="sparkles" size={12} color="white" />
                        </LinearGradient>
                      </View>
                    )}
                    <View style={{ flex: 1, maxWidth: '80%' }}>
                      <View
                        style={[
                          styles.bubble,
                          msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
                        ]}
                      >
                        <Text
                          style={[
                            styles.bubbleText,
                            msg.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAssistant,
                          ]}
                        >
                          {msg.content}
                        </Text>
                      </View>
                      {msg.role === 'assistant' && msg.suggested_outfit && (
                        savingOutfit === msg.message_id ? (
                          <View style={[styles.viewLookCard, { justifyContent: 'center', alignItems: 'center' }]}>
                            <ActivityIndicator color={Colors.primary} />
                          </View>
                        ) : (
                          <ViewLookCard
                            outfit={msg.suggested_outfit}
                            onView={() => handleViewLook(msg.suggested_outfit!, msg.message_id)}
                          />
                        )
                      )}
                    </View>
                  </Animated.View>
                ))}

                {loading && (
                  <View style={[styles.msgRow, styles.msgRowAssistant]}>
                    <View style={styles.msgAvatar}>
                      <LinearGradient
                        colors={[Colors.gradientStart, Colors.gradientEnd]}
                        style={styles.msgAvatarGradient}
                      >
                        <Ionicons name="sparkles" size={12} color="white" />
                      </LinearGradient>
                    </View>
                    <View style={[styles.bubble, styles.bubbleAssistant, styles.typingBubble]}>
                      <TypingIndicator />
                    </View>
                  </View>
                )}
              </>
            )}
          </ScrollView>

          {/* Input bar */}
          <View style={styles.inputBar}>
            {messages.length === 0 && !loadingHistory && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipScrollContent}
                style={styles.chipScroll}
              >
                {QUICK_PROMPTS.map((p, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.inputChip}
                    onPress={() => sendMessage(p.text)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.inputChipText}>{p.text}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder="Ask Steffy anything..."
                placeholderTextColor={Colors.textMuted}
                multiline
                maxLength={500}
                editable={!loading}
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
                onPress={() => sendMessage()}
                disabled={!input.trim() || loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={
                    input.trim() && !loading
                      ? [Colors.gradientStart, Colors.gradientEnd]
                      : [Colors.border, Colors.border]
                  }
                  style={styles.sendBtnGradient}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={Colors.textMuted} />
                  ) : (
                    <Ionicons
                      name="send"
                      size={18}
                      color={input.trim() ? 'white' : Colors.textMuted}
                    />
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  clearBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadge: { borderRadius: 22, overflow: 'hidden' },
  avatarGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  keyboardView: { flex: 1 },
  messagesScroll: { flex: 1 },
  messagesContent: { padding: spacing.lg, paddingBottom: spacing.sm },
  centeredState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },

  welcomeScreen: { alignItems: 'center', paddingTop: spacing.xl },
  welcomeAvatarWrap: { marginBottom: spacing.lg, borderRadius: 44, overflow: 'hidden' },
  welcomeAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeTitle: { ...typography.h2, color: Colors.text, marginBottom: 4 },
  welcomeSubtitle: { ...typography.body, color: Colors.primary, fontWeight: '600', marginBottom: spacing.md },
  welcomeBody: {
    ...typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
  },
  quickPromptsSection: { width: '100%' },
  quickPromptsLabel: { ...typography.caption, color: Colors.textMuted, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.8 },
  quickPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  quickPromptIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickPromptText: { flex: 1, ...typography.body, color: Colors.text },

  msgRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    alignItems: 'flex-start',
  },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAssistant: { justifyContent: 'flex-start' },
  msgAvatar: { marginRight: spacing.sm, borderRadius: radius.full, overflow: 'hidden' },
  msgAvatarGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radius.xxl,
    maxWidth: '100%',
  },
  bubbleUser: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: radius.sm,
    alignSelf: 'flex-end',
  },
  bubbleAssistant: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  bubbleTextUser: { color: 'white' },
  bubbleTextAssistant: { color: Colors.text },
  typingBubble: { paddingVertical: 14, paddingHorizontal: spacing.md },
  typingRow: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },

  viewLookCard: {
    marginTop: spacing.sm,
    backgroundColor: Colors.primaryMuted,
    borderRadius: radius.xxl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    gap: spacing.sm,
  },
  viewLookLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  viewLookIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewLookTitle: { ...typography.label, color: Colors.text },
  viewLookSubtitle: { ...typography.caption, color: Colors.textSecondary, marginTop: 2 },
  viewLookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  viewLookBtnText: { color: 'white', fontSize: 13, fontWeight: '700' },

  inputBar: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: Colors.background,
  },
  chipScroll: { marginBottom: spacing.sm, maxHeight: 36 },
  chipScrollContent: { gap: spacing.sm, alignItems: 'center' },
  inputChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: Colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputChipText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingLeft: spacing.md,
    paddingRight: 6,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    paddingVertical: 8,
    fontSize: 15,
    color: Colors.text,
  },
  sendBtn: { borderRadius: radius.full, overflow: 'hidden' },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
