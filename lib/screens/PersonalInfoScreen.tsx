import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { getAuth, updateProfile } from '@react-native-firebase/auth';
import { GlobalHeader } from '../components/GlobalHeader';
import { Colors, Spacing, Typography, Radii } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { fetchUserSettings, updateUserRole } from '../firestore/userSettings';
import { CustomModal, type CustomModalType } from '../components/CustomModal';
import { MainBackground } from '../components/MainBackground';

interface PersonalInfoScreenProps {
  onBack: () => void;
}

export function PersonalInfoScreen({ onBack }: PersonalInfoScreenProps) {
  const { colors } = useTheme();
  const auth = getAuth();
  const user = auth.currentUser;
  
  const [name, setName] = useState(user?.displayName || '');
  const [role, setRole] = useState('');
  const [initialRole, setInitialRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalConfig, setModalConfig] = useState<{ visible: boolean; title: string; message: string; type: CustomModalType } | null>(null);

  const hasChanges = name !== (user?.displayName || '') || role !== initialRole;
  const canSave = hasChanges && !saving;

  useEffect(() => {
    async function loadRole() {
      if (user?.uid) {
        try {
          const settings = await fetchUserSettings(user.uid);
          if (settings?.role) {
            setRole(settings.role);
            setInitialRole(settings.role);
          }
        } catch (error) {
          console.warn('Failed to load role:', error);
        }
      }
      setLoading(false);
    }
    loadRole();
  }, [user]);

  async function handleSave() {
    setSaving(true);
    try {
      if (user) {
        await updateProfile(user, { displayName: name });
        await updateUserRole(user.uid, role);
        setModalConfig({ visible: true, title: 'Success', message: 'Personal information updated successfully.', type: 'success' });
      }
    } catch (error) {
      console.warn('Failed to save personal info:', error);
      setModalConfig({ visible: true, title: 'Error', message: 'Failed to update personal information. Please try again.', type: 'warning' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <MainBackground />
      <GlobalHeader title="Profile Settings" subtitle="Manage your account details" onBack={onBack} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        
        {loading ? (
          <ActivityIndicator size="large" color={colors.Primary} style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.TextPrimary }]}>Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.Surface, borderColor: colors.Border, color: colors.TextPrimary }]}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor={colors.TextMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.TextPrimary }]}>Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.Card, borderColor: colors.Border, color: colors.TextMuted }]}
                value={user?.email || 'No email associated'}
                editable={false}
              />
              <Text style={[styles.hint, { color: colors.TextMuted }]}>Email cannot be changed.</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.TextPrimary }]}>Role</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.Surface, borderColor: colors.Border, color: colors.TextPrimary }]}
                value={role}
                onChangeText={setRole}
                placeholder="e.g. Software Engineer"
                placeholderTextColor={colors.TextMuted}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={handleSave}
              disabled={!canSave}
              style={({ pressed }) => [
                styles.saveButton,
                { backgroundColor: pressed ? colors.PrimaryDeep : colors.Primary },
                !canSave && styles.saveButtonDisabled,
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>
      <CustomModal
        visible={!!modalConfig?.visible}
        title={modalConfig?.title ?? ''}
        message={modalConfig?.message ?? ''}
        type={modalConfig?.type ?? 'info'}
        onPrimaryPress={() => setModalConfig(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  form: {
    gap: Spacing.lg,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    ...Typography.Label,
    color: Colors.TextPrimary,
    fontWeight: '600',
  },
  input: {
    backgroundColor: Colors.Surface,
    borderWidth: 1,
    borderColor: Colors.Border,
    borderRadius: Radii.button,
    paddingHorizontal: Spacing.md,
    height: 52,
    color: Colors.TextPrimary,
    ...Typography.Body,
  },
  readOnlyInput: {
    backgroundColor: Colors.Card,
    color: Colors.TextMuted,
  },
  hint: {
    ...Typography.Secondary,
    color: Colors.TextMuted,
    fontSize: 12,
  },
  saveButton: {
    height: 54,
    borderRadius: 999,
    backgroundColor: Colors.Primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  saveButtonPressed: {
    backgroundColor: Colors.PrimaryDeep,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: Colors.White,
    fontSize: 16,
    fontWeight: '700',
  },
});
