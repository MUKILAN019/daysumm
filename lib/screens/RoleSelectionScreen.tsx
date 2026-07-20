import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ScreenTransition } from '../components/ScreenTransition';

interface RoleSelectionScreenProps {
  onSelect: (role: string) => Promise<void>;
}

const ROLE_OPTIONS = ['Software Engineer', 'Manager', 'Freelancer', 'Other'];

/**
 * Screen 2 — Role. White-first layout, slim teal header with owl-peek
 * peeking DOWN over the header edge.
 */
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
      <View style={styles.header}>
        <View style={styles.progressRow}>
          <View style={[styles.progressDot, styles.progressDotDone]} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={styles.progressDot} />
        </View>
        <Image
          source={require('../../assets/owl-peek.png')}
          style={styles.peek}
          resizeMode="contain"
        />
      </View>

      <View style={styles.body}>
        <View style={styles.contentBlock}>
          <Text style={styles.eyebrow}>Step 2 of 3</Text>
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
                      <ActivityIndicator size="small" color="#10B981" />
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
                placeholder="Tell us your role"
                placeholderTextColor="#9CA3AF"
                style={styles.otherInput}
                value={otherText}
                onChangeText={setOtherText}
                editable={!isSaving}
                onSubmitEditing={handleOtherSubmit}
                returnKeyType="done"
              />
              <Pressable
                accessibilityRole="button"
                disabled={isSaving || otherText.trim().length === 0}
                onPress={handleOtherSubmit}
                style={[
                  styles.otherSubmitButton,
                  (isSaving || otherText.trim().length === 0) && styles.otherSubmitDisabled,
                ]}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.otherSubmitText}>Continue</Text>
                )}
              </Pressable>
            </View>
          ) : null}
        </View>

        <Text style={styles.footerNote}>You can change this anytime in settings.</Text>
      </View>
    </ScreenTransition>
  );
}

const HEADER_HEIGHT = 140;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    height: HEADER_HEIGHT,
    backgroundColor: '#10B981',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingTop: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  progressRow: { flexDirection: 'row', gap: 6 },
  progressDot: {
    width: 24,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  progressDotActive: { backgroundColor: '#FFFFFF' },
  progressDotDone: { backgroundColor: '#FFFFFF' },
  peek: {
    position: 'absolute',
    bottom: -46,
    width: 120,
    height: 96,
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  contentBlock: {
    marginTop: 16,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#10B981',
    textTransform: 'uppercase',
    marginBottom: 8,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4B5563',
    marginBottom: 20,
    textAlign: 'center',
  },
  optionList: { gap: 10 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    minHeight: 60,
    paddingHorizontal: 20,
  },
  optionSelected: { borderColor: '#10B981', backgroundColor: '#ECFDF5' },
  optionPressed: { backgroundColor: '#F9FAFB' },
  optionText: { fontSize: 15, fontWeight: '600', color: '#111827' },
  optionTextSelected: { color: '#065F46' },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: '#10B981' },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  otherRow: { marginTop: 14, gap: 10 },
  otherInput: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    minHeight: 52,
    paddingHorizontal: 18,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  otherSubmitButton: {
    minHeight: 52,
    borderRadius: 999,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otherSubmitDisabled: { backgroundColor: '#9CA3AF' },
  otherSubmitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  footerNote: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
