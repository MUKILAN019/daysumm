import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
} from 'react-native';
import { Colors, Typography, Spacing, Radii } from '../theme/tokens';
import { GlobalHeader } from '../components/GlobalHeader';
import { StreakBadge } from '../components/StreakBadge';

interface TextCaptureScreenProps {
  currentStreak: number;
  onSave: (text: string) => Promise<void>;
}

const SUGGESTED_TAGS = ['Meeting', 'Deep Work', 'Decision', 'Bug Fix'];

export function TextCaptureScreen({ currentStreak, onSave }: TextCaptureScreenProps) {
  const [text, setText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const canSave = text.trim().length > 0;

  async function handleSave() {
    if (!canSave || isSaving) return;
    setIsSaving(true);
    try {
      await onSave(text.trim());
      setText(''); // clear on success
    } finally {
      setIsSaving(false);
    }
  }

  function handleTagPress(tag: string) {
    const newText = text ? `${text} #${tag} ` : `#${tag} `;
    setText(newText);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <GlobalHeader 
        title="Text Log" 
        subtitle="Write down the details" 
        rightAction={<StreakBadge currentStreak={currentStreak} />}
      />

      <View style={styles.content}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            multiline
            placeholder="What did you just finish, decide, or promise?"
            placeholderTextColor={Colors.TextMuted}
            value={text}
            onChangeText={setText}
            textAlignVertical="top"
          />
          <Image
            source={require('../../assets/owl-peek.png')}
            style={styles.owlWatermark}
            resizeMode="contain"
          />
          <Text style={styles.charCounter}>{text.length} chars</Text>
        </View>

        <View style={styles.bottomSection}>
          {/* Tag chips above keyboard */}
          <View style={styles.tagsRow}>
            {SUGGESTED_TAGS.map((tag) => (
              <Pressable
                key={tag}
                accessibilityRole="button"
                onPress={() => handleTagPress(tag)}
                style={({ pressed }) => [
                  styles.tagChip,
                  pressed && styles.tagChipPressed,
                ]}
              >
                <Text style={styles.tagText}>+{tag}</Text>
              </Pressable>
            ))}
          </View>

          {/* Primary Pill */}
          <Pressable
            accessibilityRole="button"
            disabled={!canSave || isSaving}
            onPress={handleSave}
            style={({ pressed }) => [
              styles.saveButton,
              (!canSave || isSaving) && styles.saveButtonDisabled,
              pressed && canSave && styles.saveButtonPressed,
            ]}
          >
            <Text style={styles.saveButtonText}>
              {isSaving ? 'Saving...' : 'Save entry'}
            </Text>
          </Pressable>
        </View>

        </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Background,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: Radii.card,
    padding: 20, // 20px inner padding per spec
    marginBottom: Spacing.md,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: Colors.Primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    flex: 1,
    ...Typography.Body,
    color: Colors.TextPrimary,
  },
  charCounter: {
    ...Typography.Secondary,
    color: Colors.TextMuted,
    textAlign: 'right',
    marginTop: Spacing.xs,
    zIndex: 2,
  },
  owlWatermark: {
    position: 'absolute',
    bottom: -10,
    left: -10,
    width: 120,
    height: 96,
    opacity: 0.6,
    zIndex: 1,
  },
  bottomSection: {
    gap: Spacing.md,
    // 12px safe-area gap is handled by the container's paddingBottom or can be adjusted here
    paddingBottom: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    backgroundColor: Colors.PrimaryTint,
    borderRadius: Radii.chip,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  tagChipPressed: {
    backgroundColor: 'rgba(16,185,129,0.15)', // slightly darker tint
  },
  tagText: {
    ...Typography.Secondary,
    color: Colors.PrimaryDeep,
    fontWeight: '600',
  },
  saveButton: {
    height: 48,
    borderRadius: Radii.button,
    backgroundColor: Colors.Primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonPressed: {
    backgroundColor: Colors.PrimaryDark,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    ...Typography.Body,
    fontWeight: '600',
    color: Colors.Background,
  },
});
