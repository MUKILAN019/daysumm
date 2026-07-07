import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
} from '@react-native-firebase/auth';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  getAllEntries,
  initDb,
  insertEntry,
  type LocalEntry,
} from './lib/db/entries';

export default function App() {
  const [text, setText] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [entries, setEntries] = useState<LocalEntry[]>([]);

  async function loadEntries() {
    const localEntries = await getAllEntries();

    setEntries(localEntries);
    console.log('Local SQLite entries', localEntries);
  }

  useEffect(() => {
    const auth = getAuth();
    let isSigningIn = false;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user || isSigningIn) {
        return;
      }

      isSigningIn = true;
      signInAnonymously(auth)
        .catch((error: unknown) => {
          console.warn('Anonymous sign-in failed', error);
        })
        .finally(() => {
          isSigningIn = false;
        });
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    initDb()
      .then(loadEntries)
      .catch((error: unknown) => {
        console.warn('SQLite initialization failed', error);
      });
  }, []);

  async function handleSave() {
    const trimmedText = text.trim();

    if (!trimmedText) {
      return;
    }

    try {
      await insertEntry(trimmedText, 'text');
      await loadEntries();
      setText('');
      setSavedMessage('Saved locally');

      setTimeout(() => {
        setSavedMessage('');
      }, 1800);
    } catch (error) {
      console.warn('Local entry save failed', error);
      setSavedMessage('Save failed');
    }
  }

  const canSave = text.trim().length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Capture</Text>
        <Text style={styles.subtitle}>Jot the work note now. Clean digest later.</Text>
      </View>

      <TextInput
        multiline
        placeholder="What did you just finish, decide, or promise?"
        placeholderTextColor="#6B7280"
        style={styles.input}
        textAlignVertical="top"
        value={text}
        onChangeText={setText}
      />

      <View style={styles.actionRow}>
        <Text style={styles.savedMessage}>{savedMessage}</Text>
        <Pressable
          accessibilityRole="button"
          disabled={!canSave}
          style={({ pressed }) => [
            styles.saveButton,
            !canSave && styles.saveButtonDisabled,
            pressed && canSave && styles.saveButtonPressed,
          ]}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </Pressable>
      </View>

      <View style={styles.debugPanel}>
        <Text style={styles.debugTitle}>Recent local entries ({entries.length})</Text>
        <ScrollView style={styles.entryList} contentContainerStyle={styles.entryListContent}>
          {entries.length === 0 ? (
            <Text style={styles.emptyText}>No local entries yet.</Text>
          ) : (
            entries.slice(0, 5).map((entry) => (
              <View key={entry.localId} style={styles.entryItem}>
                <Text style={styles.entryText}>{entry.text}</Text>
                <Text style={styles.entryMeta}>
                  {entry.source} · {entry.synced ? 'synced' : 'local only'}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 18,
    backgroundColor: '#F7F8FA',
    paddingHorizontal: 20,
    paddingTop: 72,
  },
  header: {
    gap: 6,
  },
  title: {
    color: '#111827',
    fontSize: 32,
    fontWeight: '700',
  },
  subtitle: {
    color: '#4B5563',
    fontSize: 16,
    lineHeight: 22,
  },
  input: {
    minHeight: 180,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    color: '#111827',
    fontSize: 17,
    lineHeight: 24,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  actionRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  savedMessage: {
    flex: 1,
    color: '#047857',
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    minWidth: 96,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#2563EB',
    paddingHorizontal: 18,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonPressed: {
    backgroundColor: '#1D4ED8',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  debugPanel: {
    flex: 1,
    minHeight: 180,
    gap: 10,
  },
  debugTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '700',
  },
  entryList: {
    flex: 1,
  },
  entryListContent: {
    gap: 8,
    paddingBottom: 24,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 15,
  },
  entryItem: {
    gap: 5,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  entryText: {
    color: '#111827',
    fontSize: 15,
    lineHeight: 21,
  },
  entryMeta: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
});
