import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import NetInfo from '@react-native-community/netinfo';
import {
  getAuth,
  GoogleAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCredential,
} from '@react-native-firebase/auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import {
  AppState,
  type AppStateStatus,
  ActivityIndicator,
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
import { GoogleSignInScreen } from './lib/screens/GoogleSignInScreen';
import { VoiceCaptureScreen } from './lib/screens/VoiceCaptureScreen';
import { NotificationPermissionScreen } from './lib/screens/NotificationPermissionScreen';
import { requestNotificationPermission } from './lib/permissions/requestNotificationPermission';
import { syncFcmToken, subscribeToTokenRefresh } from './lib/notifications/fcmToken';
import { fetchUserSettings, completeOnboarding } from './lib/firestore/userSettings';
import { RoleSelectionScreen } from './lib/screens/RoleSelectionScreen';
import messaging from '@react-native-firebase/messaging';
import { DigestViewScreen } from './lib/screens/DigestViewScreen';
import { DigestReadyBanner } from './lib/components/DigestReadyBanner';
import { extractDigestRecordId } from './lib/notifications/notificationRouting';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { syncEntries } from './lib/sync/queue';
import { refreshWidgetData } from './lib/widgets/refreshWidget';
import { DigestHistoryScreen } from './lib/screens/DigestHistoryScreen';
import { Linking } from 'react-native';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const GOOGLE_WEB_CLIENT_ID = '710945440659-br81lghmsqm8lmrg0f441a1vtq68rln8.apps.googleusercontent.com';

export default function App() {
  const [text, setText] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [entries, setEntries] = useState<LocalEntry[]>([]);
  const [entriesRefreshVersion, setEntriesRefreshVersion] = useState(0);
  const [authReady, setAuthReady] = useState(false);
  const [showGoogleSignIn, setShowGoogleSignIn] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [screenMode, setScreenMode] = useState<'capture' | 'entries' | 'voice' | 'digest' | 'history'>('capture');
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [pendingRole, setPendingRole] = useState<string | null>(null);
  const [showNotificationStep, setShowNotificationStep] = useState(false);
  const wasOnlineRef = useRef<boolean | null>(null);
  const [openedDigestRecordId, setOpenedDigestRecordId] = useState<string | null>(null);
  const [showForegroundBanner, setShowForegroundBanner] = useState(false);

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
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
    });
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
        const uid = getAuth().currentUser?.uid;
        refreshWidgetData(uid);
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

  useEffect(() => {
    if (!authReady || showGoogleSignIn) {
      return;
    }

    const auth = getAuth();
    const uid = auth.currentUser?.uid;

    if (!uid) {
      return;
    }

    fetchUserSettings(uid)
      .then((settings) => {
        setNeedsOnboarding(!settings?.onboardingComplete);
        setOnboardingChecked(true);
      })
      .catch((error: unknown) => {
        console.warn('Failed to fetch user settings', error);
        setNeedsOnboarding(false);
        setOnboardingChecked(true);
      });
  }, [authReady, showGoogleSignIn]);

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const hasGoogleProvider = user.providerData.some(
          (provider) => provider.providerId === 'google.com'
        );
        setShowGoogleSignIn(false);
        setAuthReady(true);
        setGoogleError(null);

        try {
          const token = await user.getIdToken();
          console.log('Firebase client auth ID token:', token);
        } catch (error) {
          console.warn('Unable to retrieve Firebase auth token', error);
        }

        runSync('auth-ready');
        return;
      }

      // No user at all — show the sign-in screen and wait for an explicit choice.
      // No automatic signInAnonymously here anymore.
      setShowGoogleSignIn(true);
      setAuthReady(true);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!authReady || showGoogleSignIn) {
      return;
    }

    const auth = getAuth();
    const uid = auth.currentUser?.uid;

    if (!uid) {
      return;
    }

    fetchUserSettings(uid)
      .then((settings) => syncFcmToken(uid, settings?.fcmToken))
      .catch((error: unknown) => {
        console.warn('Failed to sync FCM token on launch', error);
      });

    const unsubscribeRefresh = subscribeToTokenRefresh(uid);

    return () => {
      unsubscribeRefresh();
    };
  }, [authReady, showGoogleSignIn]);

  useEffect(() => {
    // Case: app was backgrounded, user tapped the notification
    const unsubscribeOpenedApp = messaging().onNotificationOpenedApp((remoteMessage) => {
      const digestRecordId = extractDigestRecordId(remoteMessage);
      if (digestRecordId) {
        setOpenedDigestRecordId(digestRecordId);
        setScreenMode('digest');
      }
    });

    // Case: app was fully killed, tapping the notification launched it fresh
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        const digestRecordId = extractDigestRecordId(remoteMessage);
        if (digestRecordId) {
          setOpenedDigestRecordId(digestRecordId);
          setScreenMode('digest');
        }
      })
      .catch((error: unknown) => {
        console.warn('Failed to read initial notification', error);
      });

    // Case: app already open in the foreground when the push arrives
    const unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
      const digestRecordId = extractDigestRecordId(remoteMessage);
      if (digestRecordId) {
        setOpenedDigestRecordId(digestRecordId);
        setShowForegroundBanner(true);
      }
    });

    return () => {
      unsubscribeOpenedApp();
      unsubscribeForeground();
    };
  }, []);

  useEffect(() => {
    function handleDeepLinkUrl(url: string | null) {
      if (url === 'daysumm://voice-capture') {
        setScreenMode('voice');
      }
    }

    // Cold start: app was fully closed, launched by tapping the widget
    Linking.getInitialURL()
      .then(handleDeepLinkUrl)
      .catch((error: unknown) => {
        console.warn('Failed to read initial URL', error);
      });

    // App already running (foreground or backgrounded): widget tap fires this event
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLinkUrl(url);
    });

    return () => {
      subscription.remove();
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
      const uid = getAuth().currentUser?.uid;
      await refreshWidgetData(uid);

      setTimeout(() => {
        setSavedMessage('');
      }, 1800);
    } catch (error) {
      console.warn('Local entry save failed', error);
      setSavedMessage('Save failed');
    }
  }

  const canSave = text.trim().length > 0;

  async function handleGoogleLink() {
    setGoogleBusy(true);
    setGoogleError(null);

    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const signInResponse = await GoogleSignin.signIn();

      if (signInResponse.type !== 'success') {
        throw new Error('Google sign-in was not successful.');
      }

      const tokens = await GoogleSignin.getTokens();
      const { idToken, accessToken } = tokens;

      if (!idToken || !accessToken) {
        throw new Error('Google sign-in did not return valid ID and access tokens.');
      }

      const auth = getAuth();
      const credential = GoogleAuthProvider.credential(idToken, accessToken);
      const currentUser = auth.currentUser;

      if (currentUser) {
        // Existing guest session — try to link it to preserve their entries.
        try {
          await linkWithCredential(currentUser, credential);
        } catch (linkError: unknown) {
          const err = linkError as { code?: string };
          if (err.code === 'auth/credential-already-in-use') {
            // This Google account already belongs to a different (older) account — sign into that instead.
            await signInWithCredential(auth, credential);
          } else {
            throw linkError;
          }
        }
      } else {
        // No guest session at all — straightforward sign-in.
        await signInWithCredential(auth, credential);
      }
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        setGoogleError('Google sign-in was cancelled. Please try again.');
      } else if (err.code === 'auth/provider-already-linked') {
        setGoogleError('This app is already connected to that Google account.');
      } else {
        setGoogleError(err.message ?? 'Google sign-in failed. Please try again.');
      }
      console.warn('Google sign-in/link error', error);
    } finally {
      setGoogleBusy(false);
    }
  }

  async function handleContinueAsGuest() {
    setGoogleBusy(true);
    setGoogleError(null);
    try {
      await signInAnonymously(getAuth());
    } catch (error: unknown) {
      console.warn('Anonymous sign-in failed', error);
      setGoogleError('Could not continue as guest. Please try again.');
    } finally {
      setGoogleBusy(false);
    }
  }

  async function handleRoleSelect(role: string) {
    setPendingRole(role);
    setShowNotificationStep(true);
  }

  async function handleNotificationStepContinue() {
    const granted = await requestNotificationPermission();
    console.log(`Notification permission ${granted ? 'granted' : 'denied'}`);

    const auth = getAuth();
    const uid = auth.currentUser?.uid;

    if (!uid || !pendingRole) {
      console.warn('Missing uid or pending role when completing onboarding');
      setShowNotificationStep(false);
      return;
    }

    if (granted) {
      await syncFcmToken(uid, null); // first-time grant, nothing stored yet
    }

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    try {
      await completeOnboarding(uid, pendingRole, timezone);
      setNeedsOnboarding(false);
    } catch (error) {
      console.warn('Failed to save onboarding info', error);
    } finally {
      setShowNotificationStep(false);
      setPendingRole(null);
    }
  }

  async function handleDebugTriggerDigest() {
    try {
      const functions = getFunctions();
      const callable = httpsCallable(functions, 'triggerDigestForUser');
      await callable({});
      console.log('Debug digest trigger fired');
    } catch (error) {
      console.warn('Debug digest trigger failed', error);
    }
  }

  if (!authReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading your account…</Text>
      </View>
    );
  }

  if (showGoogleSignIn) {
    return (
      <GoogleSignInScreen
        isLoading={googleBusy}
        errorMessage={googleError ?? undefined}
        onContinue={handleGoogleLink}
        onContinueAsGuest={handleContinueAsGuest}
      />
    );
  }

  if (!onboardingChecked) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Setting things up…</Text>
      </View>
    );
  }

  if (needsOnboarding && !showNotificationStep) {
    return <RoleSelectionScreen onSelect={handleRoleSelect} />;
  }

  if (showNotificationStep) {
    return <NotificationPermissionScreen onContinue={handleNotificationStepContinue} />;
  }

  if (screenMode === 'entries') {
    return (
      <EntryListScreen
        onBack={() => setScreenMode('capture')}
        refreshKey={entriesRefreshVersion}
      />
    );
  }

  if (screenMode === 'voice') {
    return (
      <VoiceCaptureScreen
        onBack={() => setScreenMode('capture')}
        onSaved={async () => {
          await refreshEntries();
          await runSync('voice-save');
          const uid = getAuth().currentUser?.uid;
          await refreshWidgetData(uid);
          setScreenMode('capture');
        }}
      />
    );
  }

  if (screenMode === 'digest' && openedDigestRecordId) {
    return (
      <DigestViewScreen
        digestRecordId={openedDigestRecordId}
        onBack={() => {
          setScreenMode('capture');
          setOpenedDigestRecordId(null);
        }}
      />
    );
  }

  if (screenMode === 'history') {
    const uid = getAuth().currentUser?.uid;
    if (!uid) {
      setScreenMode('capture');
      return null;
    }
    return (
      <DigestHistoryScreen
        uid={uid}
        onBack={() => setScreenMode('capture')}
      />
    );
  }

  return (
    <>
      {showForegroundBanner && (
        <DigestReadyBanner
          onPress={() => {
            setShowForegroundBanner(false);
            setScreenMode('digest');
          }}
        />
      )}
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
              onPress={() => setScreenMode('entries')}
            >
              <Text style={styles.secondaryButtonText}>View Entries</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={styles.secondaryButton}
              onPress={() => setScreenMode('voice')}
            >
              <Text style={styles.secondaryButtonText}>🎤 Voice</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={styles.secondaryButton}
              onPress={handleDebugTriggerDigest}
            >
              <Text style={styles.secondaryButtonText}>🐞 Debug Digest</Text>
            </Pressable>
            <View style={styles.saveButtonContainer}>
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
            <Pressable
              accessibilityRole="button"
              style={styles.secondaryButton}
              onPress={() => setScreenMode('history')}
            >
              <Text style={styles.secondaryButtonText}>📅 History</Text>
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
    </>
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
    gap: 12,
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
    flexWrap: 'wrap',
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
    width: 120,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#2563EB',
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
  saveButtonContainer: {
    alignItems: 'flex-end',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F8FA',
  },
  loadingText: {
    marginTop: 18,
    color: '#4B5563',
    fontSize: 16,
  },
});
