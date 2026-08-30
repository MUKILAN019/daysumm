import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Colors } from '../theme/tokens';
import { ScreenTransition } from '../components/ScreenTransition';
import { AmbientBackground } from '../components/AmbientBackground';
import { StatusBar } from 'expo-status-bar';

interface RoleSelectionScreenProps {
  onSelect: (role: string) => Promise<void>;
}

const ROLE_OPTIONS = ['Software Engineer', 'Manager', 'Freelancer', 'Other'];

const HEADER_HEIGHT = 148;

/** Screen 2 — Role. Pinned indigo header with the cat peeking down over its edge. */
export function RoleSelectionScreen({ onSelect }: RoleSelectionScreenProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherText, setOtherText] = useState('');

  async function handlePress(role: string) {
    if (isSaving) return;
    if (role === 'Other') {
      setSelectedRole(role);
      setShowOtherInput(true);
      return;
    }
    setSelectedRole(role);
    setIsSaving(true);
    try {
      await onSelect(role);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleOtherSubmit() {
    const trimmed = otherText.trim();
    if (!trimmed || isSaving) return;
    setIsSaving(true);
    try {
      await onSelect(trimmed);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScreenTransition style={styles.container}>
      <StatusBar style="dark" />
      <AmbientBackground />
      {/* Pinned header — sits above the scroll layer, so it never moves */}
      <View pointerEvents="none" style={styles.headerLayer}>
        <View style={styles.header}>
          <View style={styles.progressRow}>
            <View style={[styles.progressDot, styles.progressDotDone]} />
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={styles.progressDot} />
          </View>
          <Text style={styles.headerStep}>Step 2 of 3</Text>
        </View>
        <Image
          source={require('../../assets/cat-peek.png')}
          style={styles.peek}
          resizeMode="contain"
        />
      </View>

      <KeyboardAvoidingView
        behavior="height"
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentBlock}>
            <Text style={styles.title}>What best describes your work?</Text>
            <Text style={styles.subtitle}>
              This helps us tailor your daily digest to how you work.
            </Text>

            <View style={styles.optionList}>
              {ROLE_OPTIONS.map((role) => {
                const isSelected = selectedRole === role;
                return (
                  <Pressable
                    key={role}
                    accessibilityRole="button"
                    disabled={isSaving}
                    onPress={() => handlePress(role)}
                    style={({ pressed }) => [
                      styles.option,
                      isSelected && styles.optionSelected,
                      pressed && styles.optionPressed,
                    ]}
                  >
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                      {role}
                    </Text>
                    <View style={[styles.radio, isSelected && styles.radioSelected]}>
                      {isSelected && isSaving && role !== 'Other' ? (
                        <ActivityIndicator size="small" color={Colors.Primary} />
                      ) : isSelected ? (
                        <View style={styles.radioInner} />
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {showOtherInput ? (
              <View style={styles.otherRow}>
                <TextInput
                  autoFocus
                  placeholder="Tell us your role…"
                  placeholderTextColor={Colors.TextMuted}
                  style={styles.otherInput}
                  value={otherText}
                  onChangeText={setOtherText}
                  editable={!isSaving}
                  onSubmitEditing={handleOtherSubmit}
                  returnKeyType="done"
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={handleOtherSubmit}
                  disabled={!otherText.trim() || isSaving}
                  style={({ pressed }) => [
                    styles.otherSubmitButton,
                    (!otherText.trim() || isSaving) && styles.otherSubmitDisabled,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  {isSaving ? (
                    <ActivityIndicator color={Colors.White} />
                  ) : (
                    <Text style={styles.otherSubmitText}>Continue</Text>
                  )}
                </Pressable>
              </View>
            ) : null}
          </View>

          <Text style={styles.footerNote}>You can change this anytime in settings.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.White },

  headerLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  header: {
    height: HEADER_HEIGHT,
    backgroundColor: Colors.PrimaryDeep,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingTop: 52,
    paddingHorizontal: 24,
    alignItems: 'center',
    overflow: 'hidden',
  },
  progressRow: { flexDirection: 'row', gap: 6 },
  progressDot: { width: 24, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)' },
  progressDotActive: { backgroundColor: Colors.White },
  progressDotDone: { backgroundColor: Colors.White },
  headerStep: {
    marginTop: 12,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  peek: {
    position: 'absolute',
    top: HEADER_HEIGHT - 52,
    alignSelf: 'center',
    width: 124,
    height: 100,
  },

  body: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: HEADER_HEIGHT + 66,
    paddingBottom: 28,
    justifyContent: 'space-between',
  },
  contentBlock: {},
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.TextPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.TextSecondary,
    marginBottom: 22,
    textAlign: 'center',
  },
  optionList: { gap: 10 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.Border,
    backgroundColor: Colors.White,
    minHeight: 60,
    paddingHorizontal: 20,
  },
  optionSelected: { borderColor: Colors.Primary, backgroundColor: Colors.PrimaryTint },
  optionPressed: { backgroundColor: '#F9FAFB' },
  optionText: { fontSize: 15, fontWeight: '600', color: Colors.TextPrimary },
  optionTextSelected: { color: Colors.PrimaryDark },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: Colors.Primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.Primary },

  otherRow: { marginTop: 14, gap: 10 },
  otherInput: {
    borderWidth: 1.5,
    borderColor: Colors.Border,
    borderRadius: 16,
    minHeight: 52,
    paddingHorizontal: 18,
    fontSize: 15,
    color: Colors.TextPrimary,
    backgroundColor: Colors.White,
  },
  otherSubmitButton: {
    minHeight: 52,
    borderRadius: 999,
    backgroundColor: Colors.Primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otherSubmitDisabled: { backgroundColor: '#C7C2F0' },
  otherSubmitText: { color: Colors.White, fontSize: 15, fontWeight: '700' },

  footerNote: { fontSize: 12, color: Colors.TextMuted, textAlign: 'center', marginTop: 24 },
});
