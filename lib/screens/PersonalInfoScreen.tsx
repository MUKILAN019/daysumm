import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { getAuth, updateProfile } from '@react-native-firebase/auth';
import { GlobalHeader } from '../components/GlobalHeader';
import { Colors, Spacing, Typography, Radii } from '../theme/tokens';
import { fetchUserSettings, updateUserRole } from '../firestore/userSettings';

interface PersonalInfoScreenProps {
  onBack: () => void;
}

export function PersonalInfoScreen({ onBack }: PersonalInfoScreenProps) {
  const auth = getAuth();
  const user = auth.currentUser;
  
  const [name, setName] = useState(user?.displayName || '');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadRole() {
      if (user?.uid) {
        try {
          const settings = await fetchUserSettings(user.uid);
          if (settings?.role) {
            setRole(settings.role);
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
        Alert.alert('Success', 'Personal information updated successfully.');
      }
    } catch (error) {
      console.warn('Failed to save personal info:', error);
      Alert.alert('Error', 'Failed to update personal information. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <GlobalHeader title="Personal Info" onBack={onBack} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        
        {loading ? (
          <ActivityIndicator size="large" color={Colors.Primary} style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor={Colors.TextMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, styles.readOnlyInput]}
                value={user?.email || 'No email associated'}
                editable={false}
              />
              <Text style={styles.hint}>Email cannot be changed.</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Role</Text>
              <TextInput
                style={styles.input}
                value={role}
                onChangeText={setRole}
                placeholder="e.g. Software Engineer"
                placeholderTextColor={Colors.TextMuted}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={handleSave}
              disabled={saving}
              style={({ pressed }) => [
                styles.saveButton,
                pressed && styles.saveButtonPressed,
                saving && styles.saveButtonDisabled,
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Background,
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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
