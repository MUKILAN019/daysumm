import { useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
} from 'react-native';
import { Colors, Typography, Spacing, Radii } from '../theme/tokens';
import * as Haptics from 'expo-haptics';
import { GlobalHeader } from '../components/GlobalHeader';
import { StreakBadge } from '../components/StreakBadge';
import { AmbientBackground } from '../components/AmbientBackground';

interface TextCaptureScreenProps {
  currentStreak: number;
  onSave: (text: string) => Promise<void>;
}

const SUGGESTED_TAGS = ['Meeting', 'Deep Work', 'Decision', 'Bug Fix'];
const MAX_CHARS = 500;

function hasEntryText(value: string) {
  return value
    .replace(/#[\p{L}\p{N}_-]+/gu, '')
    .trim()
    .length > 0;
}

export function TextCaptureScreen({ currentStreak, onSave }: TextCaptureScreenProps) {
  const [text, setText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;

  const canSave = hasEntryText(text);

  function handleFocus() {
    Animated.timing(focusAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }

  function handleBlur() {
    Animated.timing(focusAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }

  const animatedBorderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(229, 231, 235, 0.8)', Colors.Primary],
  });

  const animatedShadowOpacity = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.06, 0.16],
  });

  async function handleSave() {
    if (!canSave || isSaving) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSaving(true);
    try {
      await onSave(text.trim());
      setText(''); // clear on success
    } finally {
      setIsSaving(false);
    }
  }

  function handleTagPress(tag: string) {
    if (!hasEntryText(text)) return;
    const newText = text ? `${text} #${tag} ` : `#${tag} `;
    setText(newText);
  }

  const isEmpty = text.length === 0;

  return (
    <KeyboardAvoidingView style={styles.container}>
      <AmbientBackground />
      <GlobalHeader
        title="Quick Log"
        subtitle="Jot down your recent work"
        rightAction={<StreakBadge currentStreak={currentStreak} />}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Editor */}
        <Animated.View
          style={[
            styles.inputCard,
            {
              borderColor: animatedBorderColor,
              shadowOpacity: animatedShadowOpacity,
            },
          ]}
        >
          {/* Mascot inside the text box */}
          <View style={{ position: 'absolute', bottom: 0, right: 16, zIndex: 0, opacity: 0.75 }} pointerEvents="none">
            <Image
              source={require('../../assets/cat-peek.png')}
              style={{ width: 100, height: 80 }}
              resizeMode="contain"
            />
          </View>

          <View style={styles.inputHeaderRow}>
            <Text style={styles.inputLabel}>YOUR ENTRY</Text>
          </View>

          <TextInput
            style={[styles.input, { zIndex: 1 }]}
            multiline
            placeholder="What did you finish, decide, or promise today?"
            placeholderTextColor={Colors.TextMuted}
            value={text}
            onChangeText={setText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            textAlignVertical="top"
          />

        </Animated.View>

        {isEmpty ? (
          <View style={styles.hintRow}>
            <View style={styles.hintDot} />
            <Text style={styles.hintText}>
              Tip: start with a verb, like shipped, decided, or blocked.
            </Text>
          </View>
        ) : null}

        {/* Tags */}
        <View style={styles.tagsBlock}>
          <Text style={styles.sectionLabel}>QUICK TAGS</Text>
          <View style={styles.tagsRow}>
            {SUGGESTED_TAGS.map((tag) => {
              const active = text.includes(`#${tag}`);
              return (
                <Pressable
                  key={tag}
                  accessibilityRole="button"
                  disabled={!hasEntryText(text)}
                  onPress={() => handleTagPress(tag)}
                  style={({ pressed }) => [
                    styles.tagChip,
                    !hasEntryText(text) && styles.tagChipDisabled,
                    active && styles.tagChipActive,
                    pressed && styles.tagChipPressed,
                  ]}
                >
                  <Text style={[styles.tagText, active && styles.tagTextActive]}>
                    {active ? tag : `+ ${tag}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Sticky action bar */}
      <View style={styles.actionBar}>
        <Pressable
          accessibilityRole="button"
          disabled={!canSave || isSaving || text.length > MAX_CHARS}
          onPress={handleSave}
          style={({ pressed }) => [
            styles.saveButton,
            (!canSave || isSaving || text.length > MAX_CHARS) && styles.saveButtonDisabled,
            pressed && canSave && text.length <= MAX_CHARS && styles.saveButtonPressed,
          ]}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Saving…' : 'Save entry'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const MASCOT = 92;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Background,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },

  /* Prompt banner */
  promptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.PrimaryTint,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.18)',
    paddingLeft: 18,
    paddingRight: 10,
    paddingVertical: 16,
    gap: 12,
    overflow: 'hidden',
  },
  promptTextCol: { flex: 1, gap: 4 },
  promptEyebrow: {
    ...Typography.Label,
    color: Colors.PrimaryDark,
    letterSpacing: 1,
  },
  promptTitle: {
    ...Typography.SectionHeader,
    fontSize: 18,
    lineHeight: 24,
    color: Colors.PrimaryDeep,
  },
  promptBody: {
    ...Typography.Secondary,
    color: Colors.TextSecondary,
    lineHeight: 19,
  },
  promptMascotWrap: {
    width: MASCOT,
    height: MASCOT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptMascotHalo: {
    position: 'absolute',
    width: MASCOT,
    height: MASCOT,
    borderRadius: MASCOT / 2,
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  promptMascot: {
    width: MASCOT - 8,
    height: MASCOT - 8,
  },

  /* Editor */
  inputCard: {
    backgroundColor: Colors.Card,
    borderWidth: 1.5,
    borderColor: Colors.Border,
    borderRadius: Radii.card,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 16,
    minHeight: 220,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  inputCardFocused: {
    borderColor: Colors.Primary,
    shadowColor: Colors.Primary,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 4,
  },
  inputHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  inputLabel: {
    ...Typography.Label,
    color: Colors.TextMuted,
  },
  counterTextOver: { color: Colors.Danger },
  input: {
    flex: 1,
    minHeight: 130,
    ...Typography.Body,
    lineHeight: 24,
    color: Colors.TextPrimary,
    padding: 0,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
    paddingHorizontal: 8,
  },
  hintDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.Accent,
  },
  hintText: {
    ...Typography.Secondary,
    fontSize: 13,
    color: Colors.TextMuted,
    flex: 1,
  },

  /* Tags */
  tagsBlock: { gap: 10, marginTop: 4 },
  sectionLabel: {
    ...Typography.Label,
    color: Colors.TextMuted,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    backgroundColor: Colors.Surface,
    borderWidth: 1,
    borderColor: Colors.Border,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  tagChipPressed: { backgroundColor: Colors.PrimaryTint },
  tagChipDisabled: {
    opacity: 0.45,
  },
  tagChipActive: {
    backgroundColor: Colors.Primary,
    borderColor: Colors.Primary,
  },
  tagText: {
    ...Typography.Secondary,
    fontSize: 13,
    color: Colors.TextSecondary,
    fontWeight: '600',
  },
  tagTextActive: { color: '#FFFFFF' },

  /* Action bar */
  actionBar: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: Colors.Surface,
    borderTopWidth: 1,
    borderTopColor: Colors.Divider,
  },
  saveButton: {
    height: 54,
    borderRadius: Radii.button,
    backgroundColor: Colors.Primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.Primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 4,
  },
  saveButtonPressed: { backgroundColor: Colors.PrimaryDark },
  saveButtonDisabled: {
    backgroundColor: Colors.Border,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    ...Typography.Body,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
