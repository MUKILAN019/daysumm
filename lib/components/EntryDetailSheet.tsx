import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Mic, FileText, X, Sparkles } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radii } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import type { LocalEntry } from '../db/entries';

const TAG_OPTIONS: { key: string; label: string }[] = [
  { key: 'highlight', label: 'Done' },
  { key: 'actionItem', label: 'To-do' },
  { key: 'blocker', label: 'Blocked' },
  { key: 'decision', label: 'Decision' },
  { key: 'note', label: 'Note' },
];

function getTagStyle(tag: string) {
  switch (tag) {
    case 'blocker':
      return { bg: Colors.TagBlockerBg, text: Colors.TagBlockerText, border: Colors.TagBlockerBorder };
    case 'highlight':
      return { bg: Colors.TagHighlightBg, text: Colors.TagHighlightText, border: Colors.TagHighlightBorder };
    case 'actionItem':
      return { bg: Colors.TagActionBg, text: Colors.TagActionText, border: Colors.TagActionBorder };
    case 'decision':
      return { bg: Colors.TagDecisionBg, text: Colors.TagDecisionText, border: Colors.TagDecisionBorder };
    case 'note':
    default:
      return { bg: Colors.TagNoteBg, text: Colors.TagNoteText, border: Colors.TagNoteBorder };
  }
}

function getConfidencePhrase(confidence?: number): string | null {
  if (confidence === undefined || confidence === null) return null;
  if (confidence < 0.6) return 'Not sure — worth a quick check';
  if (confidence <= 0.85) return 'Fairly confident';
  return 'Confident';
}

function getConfidenceColor(confidence?: number): string {
  if (confidence === undefined || confidence === null) return Colors.TextMuted;
  if (confidence < 0.6) return Colors.Warning;
  if (confidence <= 0.85) return Colors.Info;
  return Colors.Success;
}

export interface EntryDetailSaveParams {
  localId: string;
  newText: string;
  newTags: string[];
  didTextChange: boolean;
  didUserSetTags: boolean;
}

interface EntryDetailSheetProps {
  entry: LocalEntry | null;
  visible: boolean;
  onClose: () => void;
  onSave: (params: EntryDetailSaveParams) => Promise<void>;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const MASCOT_SIZE = 108;

export function EntryDetailSheet({
  entry,
  visible,
  onClose,
  onSave,
}: EntryDetailSheetProps) {
  const { colors } = useTheme();
  const [editText, setEditText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [didUserSetTags, setDidUserSetTags] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [emptyError, setEmptyError] = useState(false);

  const originalTextRef = useRef('');
  const inputRef = useRef<TextInput | null>(null);
  const originalTagsRef = useRef<string[]>([]);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (entry && visible) {
      const text = entry.text ?? '';
      const tags = entry.tags ?? [];
      setEditText(text);
      setSelectedTags([...tags]);
      setDidUserSetTags(false);
      setIsSaving(false);
      setEmptyError(false);
      originalTextRef.current = text;
      originalTagsRef.current = [...tags];

      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 18,
        stiffness: 140,
        useNativeDriver: true,
      }).start();
    }
  }, [entry, visible, slideAnim]);

  function handleClose() {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onClose());
  }

  function toggleTag(tagKey: string) {
    setDidUserSetTags(true);
    setSelectedTags((prev) =>
      prev.includes(tagKey)
        ? prev.filter((t) => t !== tagKey)
        : [...prev, tagKey]
    );
  }

  async function handleSave() {
    const trimmed = editText.trim();
    if (!trimmed) {
      setEmptyError(true);
      return;
    }
    setEmptyError(false);

    const didTextChange = trimmed !== originalTextRef.current;
    const tagsMatch =
      selectedTags.length === originalTagsRef.current.length &&
      selectedTags.every((t) => originalTagsRef.current.includes(t));

    // Proceed to save even if nothing changed, so we can mark it as userCorrected.

    setIsSaving(true);
    try {
      await onSave({
        localId: entry!.localId,
        newText: trimmed,
        newTags: [...selectedTags],
        didTextChange,
        didUserSetTags,
      });
      handleClose();
    } catch (error) {
      console.warn('Entry detail save failed', error);
    } finally {
      setIsSaving(false);
    }
  }

  if (!entry || !visible) return null;

  const confidencePhrase = getConfidencePhrase(entry.confidence);
  const confidenceColor = getConfidenceColor(entry.confidence);
  const timestamp = new Date(entry.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const dateStr = new Date(entry.createdAt).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      hardwareAccelerated={true}
      statusBarTranslucent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdropTap} onPress={handleClose} />

        <Animated.View
          style={[styles.sheetWrap, { transform: [{ translateY: slideAnim }] }]}
        >
          {/* Floating mascot seated on top-right edge of the sheet */}
          <View pointerEvents="none" style={styles.mascotWrap}>
            {/* <View style={styles.mascotGlow} /> */}
            <Image
              source={require('../../assets/cat-modal-friendly.png')}
              style={styles.mascot}
              resizeMode="contain"
            />
          </View>

          <View style={[styles.sheet, { backgroundColor: colors.Card }]}>
            <KeyboardAvoidingView
              style={styles.keyboardWrap}
              behavior="height"
            >
              {/* Teal accent band with drag handle */}
              <View style={[styles.topBand, { backgroundColor: colors.Surface, borderBottomColor: colors.Border }]}>
                <View style={[styles.handle, { backgroundColor: colors.TextSecondary }]} />
              </View>

                <ScrollView
                  style={styles.scrollContent}
                  contentContainerStyle={styles.scrollContentInner}
                  keyboardShouldPersistTaps="always"
                  showsVerticalScrollIndicator={false}
                >
                {/* Header: source pill + close */}
                <View style={styles.header}>
                  <View style={[styles.sourcePill, { backgroundColor: colors.PrimaryTint, borderColor: colors.Border }]}>
                    {entry.source === 'voice' ? (
                      <Mic size={13} color={colors.PrimaryDeep} strokeWidth={2} />
                    ) : (
                      <FileText size={13} color={colors.PrimaryDeep} strokeWidth={2} />
                    )}
                    <Text style={[styles.sourcePillText, { color: colors.PrimaryDeep }]}>
                      {entry.source === 'voice' ? 'Voice' : 'Text'}
                    </Text>
                    <View style={[styles.dot, { backgroundColor: colors.PrimaryDeep }]} />
                    <Text style={[styles.sourcePillMeta, { color: colors.TextSecondary }]}>
                      {dateStr} · {timestamp}
                    </Text>
                  </View>
                  <Pressable
                    onPress={handleClose}
                    style={[styles.closeButton, { backgroundColor: colors.Surface, borderColor: colors.Border }]}
                    hitSlop={10}
                  >
                    <X size={18} color={colors.TextSecondary} strokeWidth={2.2} />
                  </Pressable>
                </View>

                <View
                  style={[
                    styles.textInputContainer,
                    { backgroundColor: colors.Surface, borderColor: colors.Border },
                    emptyError && styles.textInputContainerError,
                  ]}
                >
                  <TextInput
                    ref={inputRef}
                    style={[styles.textInput, { color: colors.TextPrimary }]}
                    multiline
                    value={editText}
                    onChangeText={(val) => {
                      setEditText(val);
                      if (emptyError && val.trim()) setEmptyError(false);
                    }}
                    placeholder="What happened today?"
                    placeholderTextColor={colors.TextMuted}
                    textAlignVertical="top"
                    selectionColor={colors.Primary}
                    autoCorrect={false}
                    autoCapitalize="sentences"
                    returnKeyType="default"
                  />
                </View>
                {emptyError && (
                  <Text style={styles.errorText}>Entry can't be empty</Text>
                )}

                {/* AI Analysis section */}
                <View style={[styles.analysisCard, { backgroundColor: colors.Surface, borderColor: colors.Border }]}>
                  <View style={styles.analysisHeader}>
                    <View style={[styles.analysisIconBadge, { backgroundColor: colors.PrimaryTint }]}>
                      <Sparkles size={13} color={colors.PrimaryDeep} strokeWidth={2.2} />
                    </View>
                    <Text style={[styles.analysisTitle, { color: colors.TextPrimary }]}>AI Analysis</Text>
                    {confidencePhrase && (
                      <View
                        style={[
                          styles.confidencePill,
                          { backgroundColor: `${confidenceColor}1A` },
                        ]}
                      >
                        <View
                          style={[styles.confidenceDot, { backgroundColor: confidenceColor }]}
                        />
                        <Text style={[styles.confidenceText, { color: confidenceColor }]}>
                          {confidencePhrase}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={[styles.chipHint, { color: colors.TextMuted }]}>Tap to tag this entry</Text>

                  <View style={styles.chipContainer}>
                    {TAG_OPTIONS.map((tag) => {
                      const isSelected = selectedTags.includes(tag.key);
                      const styleInfo = getTagStyle(tag.key);
                      return (
                        <Pressable
                          key={tag.key}
                          onPress={() => toggleTag(tag.key)}
                          style={[
                            styles.chip,
                            { backgroundColor: colors.Card, borderColor: colors.Border },
                            isSelected && {
                              backgroundColor: styleInfo.bg,
                              borderColor: styleInfo.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              { color: colors.TextSecondary },
                              isSelected && {
                                color: styleInfo.text,
                                fontWeight: '700',
                              },
                            ]}
                          >
                            {tag.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </ScrollView>

              {/* Action buttons */}
              <View style={[styles.actions, { borderTopColor: colors.Border, backgroundColor: colors.Card }]}>
                <Pressable
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.cancelButton,
                    { backgroundColor: colors.Surface, borderColor: colors.Border },
                    pressed && { backgroundColor: colors.Border },
                  ]}
                  onPress={handleClose}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.TextPrimary }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.saveButton,
                    { backgroundColor: colors.Primary },
                    pressed && { backgroundColor: colors.PrimaryDeep },
                    isSaving && styles.saveButtonDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  <Text style={styles.saveButtonText}>
                    {isSaving ? 'Saving…' : 'Save changes'}
                  </Text>
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: `${Colors.Ink}45`,
    justifyContent: 'flex-end',
  },
  backdropTap: { flex: 1 },
  sheetWrap: {
    position: 'relative',
  },
  mascotWrap: {
    position: 'absolute',
    top: -MASCOT_SIZE * 0.62,
    right: 20,
    width: MASCOT_SIZE,
    height: MASCOT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  mascotGlow: {
    position: 'absolute',
    width: MASCOT_SIZE + 24,
    height: MASCOT_SIZE + 24,
    borderRadius: (MASCOT_SIZE + 24) / 2,
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
  },
  mascot: {
    width: MASCOT_SIZE,
    height: MASCOT_SIZE,
  },
  sheet: {
    backgroundColor: Colors.Card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: SCREEN_HEIGHT * 0.88,
    shadowColor: Colors.TextPrimary,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  keyboardWrap: {
    maxHeight: SCREEN_HEIGHT * 0.88,
  },
  topBand: {
    backgroundColor: Colors.Surface,
    paddingTop: 10,
    paddingBottom: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.Border,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.TextSecondary,
    opacity: 0.4,
  },
  scrollContent: {
    flexGrow: 0,
    maxHeight: SCREEN_HEIGHT * 0.62,
  },
  scrollContentInner: {
    paddingHorizontal: Spacing.screenPadding + 4,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sourcePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.PrimaryTint,
    borderWidth: 1,
    borderColor: Colors.Border,
  },
  sourcePillText: {
    ...Typography.Secondary,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.PrimaryDeep,
    textTransform: 'none',
    letterSpacing: 0.2,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.PrimaryDeep,
    opacity: 0.5,
    marginHorizontal: 2,
  },
  sourcePillMeta: {
    ...Typography.Secondary,
    fontSize: 12,
    color: Colors.TextSecondary,
    textTransform: 'none',
    letterSpacing: 0,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.Surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.Border,
  },
  textInputContainer: {
    backgroundColor: Colors.Surface,
    borderWidth: 1,
    borderColor: Colors.Border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 120,
  },
  textInputContainerError: {
    borderColor: Colors.Danger,
  },
  textInput: {
    ...Typography.Body,
    color: Colors.TextPrimary,
    minHeight: 90,
    lineHeight: 22,
    padding: 0,
    backgroundColor: 'transparent',
  },
  errorText: {
    ...Typography.Secondary,
    color: Colors.Danger,
    marginTop: 6,
    marginLeft: 4,
  },
  analysisCard: {
    backgroundColor: Colors.Surface,
    borderWidth: 1,
    borderColor: Colors.Border,
    borderRadius: 18,
    padding: 14,
    marginTop: Spacing.md,
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  analysisIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.PrimaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analysisTitle: {
    ...Typography.Body,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.TextPrimary,
    textTransform: 'none',
    letterSpacing: 0,
    flex: 1,
  },
  confidencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  confidenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  confidenceText: {
    ...Typography.Secondary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'none',
    letterSpacing: 0,
  },
  chipHint: {
    ...Typography.Secondary,
    fontSize: 12,
    color: Colors.TextMuted,
    marginBottom: 10,
    textTransform: 'none',
    letterSpacing: 0,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.Card,
    borderWidth: 1.5,
    borderColor: Colors.Border,
  },
  chipSelected: {
    backgroundColor: Colors.Primary,
    borderColor: Colors.Primary,
    shadowColor: Colors.Primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  chipText: {
    ...Typography.Secondary,
    fontSize: 13,
    color: Colors.TextSecondary,
    fontWeight: '600',
    textTransform: 'none',
    letterSpacing: 0,
  },
  chipTextSelected: {
    color: Colors.White,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.screenPadding + 4,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md + 4,
    borderTopWidth: 1,
    borderTopColor: Colors.Border,
    backgroundColor: Colors.Card,
  },
  actionButton: {
    flex: 1,
    height: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.Surface,
    borderWidth: 1.5,
    borderColor: Colors.Border,
  },
  cancelButtonPressed: {
    backgroundColor: Colors.Border,
  },
  cancelButtonText: {
    ...Typography.Body,
    color: Colors.TextPrimary,
    fontWeight: '700',
  },
  saveButton: {
    backgroundColor: Colors.Primary,
    shadowColor: Colors.Primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
    flex: 1.4,
  },
  saveButtonPressed: {
    backgroundColor: Colors.PrimaryDark,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...Typography.Body,
    color: Colors.White,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
