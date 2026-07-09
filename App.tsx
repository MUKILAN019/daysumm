import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import NetInfo from '@react-native-community/netinfo';
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
} from '@react-native-firebase/auth';
import {
  AppState,
  type AppStateStatus,
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
import { EntryListScreen } from './lib/screens/EntryListScreen';
import { syncEntries } from './lib/sync/queue';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

export default function App() {
  const [text, setText] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [entries, setEntries] = useState<LocalEntry[]>([]);
  const [showEntryList, setShowEntryList] = useState(false);
  const [entriesRefreshVersion, setEntriesRefreshVersion] = useState(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const wasOnlineRef = useRef<boolean | null>(null);

  async function loadEntries() {
    const localEntries = await getAllEntries();

    setEntries(localEntries);
    console.log('Local SQLite entries', localEntries);
  }

  async function refreshEntries() {
    await loadEntries();
    setEntriesRefreshVersion((value) => value + 1);
  }

  async function runSync(reason: string) {
    try {
      const networkState = await NetInfo.fetch();
      const isOnline =
        networkState.isConnected === true && networkState.isInternetReachable !== false;

      if (!isOnline) {
        console.log(`Sync ${reason} skipped offline`);
        return;
      }

      const result = await syncEntries();

      if (result.attempted > 0) {
        console.log(`Sync ${reason}`, result);
      }

      await loadEntries();
      setEntriesRefreshVersion((value) => value + 1);
    } catch (error) {
      console.warn(`Sync ${reason} failed`, error);
    }
  }

  useEffect(() => {
    const auth = getAuth();
    let isSigningIn = false;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const token = await user.getIdToken();
          console.log('Firebase client auth ID token:', token);
        } catch (error) {
          console.warn('Unable to retrieve Firebase auth token', error);
        }

        runSync('auth-ready');
        return;
      }

      if (isSigningIn) {
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
      .then(refreshEntries)
      .catch((error: unknown) => {
        console.warn('SQLite initialization failed', error);
      });
  }, []);

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      const previousAppState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (previousAppState !== 'active' && nextAppState === 'active') {
        runSync('foreground');
      }
    });

    const netInfoUnsubscribe = NetInfo.addEventListener((state) => {
      const isOnline = state.isConnected === true && state.isInternetReachable !== false;
      const wasOnline = wasOnlineRef.current;
      wasOnlineRef.current = isOnline;

      if (wasOnline === false && isOnline) {
        runSync('reconnect');
      }
    });

    const intervalId = setInterval(() => {
      if (appStateRef.current === 'active') {
        runSync('interval');
      }
    }, FIFTEEN_MINUTES_MS);

    return () => {
      appStateSubscription.remove();
      netInfoUnsubscribe();
      clearInterval(intervalId);
    };
  }, []);

  async function handleSave() {
    const trimmedText = text.trim();

    if (!trimmedText) {
      return;
    }

    try {
      await insertEntry(trimmedText, 'text');
      await refreshEntries();
      setText('');
      setSavedMessage('Saved locally');

      await runSync('save');

      setTimeout(() => {
        setSavedMessage('');
      }, 1800);
    } catch (error) {
      console.warn('Local entry save failed', error);
      setSavedMessage('Save failed');
    }
  }

  const canSave = text.trim().length > 0;

  if (showEntryList) {
    return (
      <EntryListScreen
        onBack={() => setShowEntryList(false)}
        refreshKey={entriesRefreshVersion}
      />
    );
  }

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
        <View style={styles.buttonRow}>
          <Pressable
            accessibilityRole="button"
            style={styles.secondaryButton}
            onPress={() => setShowEntryList(true)}
          >
            <Text style={styles.secondaryButtonText}>View Entries</Text>
          </Pressable>
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
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  secondaryButton: {
    minWidth: 112,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 12,
  },
  secondaryButtonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
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
