import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

interface RoleSelectionScreenProps {
  onSelect: (role: string) => Promise<void>;
}

const ROLE_OPTIONS = ['Software Engineer', 'Manager', 'Freelancer', 'Other'];

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
    <View style={styles.container}>
      <View style={styles.card}>
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
                {isSelected && isSaving && role !== 'Other' ? (
                  <ActivityIndicator size="small" color="#2563EB" />
                ) : null}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  title: { fontSize: 26, fontWeight: '700', color: '#111827', marginBottom: 10 },
  subtitle: { fontSize: 15, lineHeight: 21, color: '#4B5563', marginBottom: 24 },
  optionList: { gap: 12 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    minHeight: 52,
    paddingHorizontal: 16,
  },
  optionSelected: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  optionPressed: { backgroundColor: '#F3F4F6' },
  optionText: { fontSize: 16, fontWeight: '600', color: '#111827' },
  optionTextSelected: { color: '#2563EB' },
  otherRow: { marginTop: 16, gap: 10 },
  otherInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    minHeight: 48,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  otherSubmitButton: {
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otherSubmitDisabled: { backgroundColor: '#9CA3AF' },
  otherSubmitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});