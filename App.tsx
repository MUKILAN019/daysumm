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
  getHasSeenSampleDigest,
  initDb,
  insertEntry,
  type LocalEntry,
} from './lib/db/entries';
import { GoogleSignInScreen } from './lib/screens/GoogleSignInScreen';
import { HomeScreen } from './lib/screens/HomeScreen';
import { TextCaptureScreen } from './lib/screens/TextCaptureScreen';
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
import { StreakBadge } from './lib/components/StreakBadge';
import { fetchCurrentStreak } from './lib/firestore/userStats';
import { configureRevenueCat } from './lib/purchases/revenueCat';
import { PaywallScreen } from './lib/screens/PaywallScreen';
import { hasProEntitlementCached } from './lib/purchases/checkEntitlement';
import { BottomTabBar, type TabName } from './lib/components/BottomTabBar';
import { SettingsScreen } from './lib/screens/SettingsScreen';
import { markSampleDigestSeen } from './lib/db/entries';
import { transcribeAudio } from './lib/functions/transcribeAudio';
import { DigestScreen } from './lib/screens/DigestScreen';
import { generateDigest, type Digest } from './lib/functions/generateDigest';

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
  const [screenMode, setScreenMode] = useState<'capture' | 'digest' | 'paywall'>('capture');
  const [activeTab, setActiveTab] = useState<TabName>('write');
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [pendingRole, setPendingRole] = useState<string | null>(null);
  const [showNotificationStep, setShowNotificationStep] = useState(false);
  const wasOnlineRef = useRef<boolean | null>(null);
  const [openedDigestRecordId, setOpenedDigestRecordId] = useState<string | null>(null);
  const [showForegroundBanner, setShowForegroundBanner] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);

  // ── Today's Digest state (Generate Now flow) ──────────────────
  const [digest, setDigest] = useState<Digest | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [digestError, setDigestError] = useState<string | null>(null);
  const [isLimitError, setIsLimitError] = useState(false);
  const [showSampleDigest, setShowSampleDigest] = useState(false);


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
      .then(async () => {
        await refreshEntries();
        const hasSeenSample = await getHasSeenSampleDigest();
        if (!hasSeenSample) {
          setShowSampleDigest(true);
        }
      })
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
        refreshStreak();
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
        refreshStreak();
        hasProEntitlementCached().then(setIsPro);
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
          configureRevenueCat(user.uid);
        } catch (error) {
          console.warn('Failed to sync RevenueCat identity', error);
        }

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
        setActiveTab('voice');
        setScreenMode('capture');
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


  async function handleGenerateNow() {
    setIsGenerating(true);
    setDigestError(null);
    setIsLimitError(false);

    try {
      const nextDigest = await generateDigest();
      setDigest(nextDigest);
      await markSampleDigestSeen();
      setShowSampleDigest(false);
    } catch (error: unknown) {
      const err = error as { code?: string };
      if (err.code === 'functions/resource-exhausted') {
        setDigestError("You've used your 3 free digests today — upgrade for unlimited.");
        setIsLimitError(true);
      } else {
        console.warn('Digest generation failed', error);
        setDigestError('Could not generate a digest right now. Try again.');
        setIsLimitError(false);
      }
    } finally {
      setIsGenerating(false);
    }
  }

  async function refreshStreak() {
    const uid = getAuth().currentUser?.uid;
    if (!uid) return;
    try {
      const streak = await fetchCurrentStreak(uid);
      setCurrentStreak(streak);
    } catch (error) {
      console.warn('Failed to refresh streak', error);
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


  if (screenMode === 'paywall') {
    return (
      <PaywallScreen
        role={userRole}
        onBack={() => setScreenMode('capture')}
        onPurchaseSuccess={() => {
          setIsPro(true);
          setScreenMode('capture');
        }}
      />
    );
  }

  // Helper to switch tabs and keep screenMode in sync
  function handleTabPress(tab: TabName) {
    setActiveTab(tab);
    setScreenMode('capture'); // reset screen mode on tab change
  }

  const userName = getAuth().currentUser?.displayName || 'User';

  async function handleRecordFinished(uri: string) {
    try {
      const text = await transcribeAudio(uri);
      const trimmedText = text.trim();
      if (!trimmedText) {
        console.warn('No speech detected in recording.');
        return;
      }
      await insertEntry(trimmedText, 'voice');
      await refreshEntries();
      await runSync('voice-save');
      const uid = getAuth().currentUser?.uid;
      await refreshWidgetData(uid);
    } catch (error) {
      console.warn('Voice transcription/save failed', error);
      alert('Transcription failed. Please try again.');
    }
  }

  // Render the tab-specific content area
  function renderTabContent() {
    if (activeTab === 'profile') {
      return (
        <SettingsScreen
          currentStreak={currentStreak}
          isPro={isPro}
          onUpgradePress={() => setScreenMode('paywall')}
        />
      );
    }

    if (activeTab === 'history') {
      const uid = getAuth().currentUser?.uid;
      if (!uid) {
        return (
          <View style={styles.centeredMessage}>
            <Text style={styles.centeredMessageText}>Sign in to view history.</Text>
          </View>
        );
      }
      return (
        <DigestHistoryScreen
          uid={uid}
          onUpgradePress={() => setScreenMode('paywall')}
          isPro={isPro}
        />
      );
    }

    if (activeTab === 'write') {
      return (
        <TextCaptureScreen
          currentStreak={currentStreak}
          onSave={async (newText) => {
            await insertEntry(newText, 'text');
            await refreshEntries();
            await runSync('save');
            const uid = getAuth().currentUser?.uid;
            await refreshWidgetData(uid);
          }}
        />
      );
    }

    if (activeTab === 'digest') {
      return (
        <DigestScreen
          currentStreak={currentStreak}
          digest={digest}
          isGeneratingDigest={isGenerating}
          digestError={digestError}
          isLimitError={isLimitError}
          onGenerateDigest={handleGenerateNow}
          onUpgradePress={() => setScreenMode('paywall')}
        />
      );
    }

    // Default: Voice (Home)
    return (
      <HomeScreen
        userName={userName}
        currentStreak={currentStreak}
        entries={entries}
        onRecordFinished={handleRecordFinished}
      />
    );
  }

  return (
    <View style={styles.container}>
      {showForegroundBanner && (
        <DigestReadyBanner
          onPress={() => {
            setShowForegroundBanner(false);
            setScreenMode('digest');
          }}
        />
      )}

      {/* Main content area */}
      <View style={styles.contentArea}>
        {renderTabContent()}
      </View>

      {/* Bottom tab bar */}
      <BottomTabBar activeTab={activeTab} onTabPress={handleTabPress} />

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Root shells ──────────────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  contentArea: {
    flex: 1,
    overflow: 'hidden',
  },

  // ── Capture tab (home) ────────────────────────────────────────
  captureScroll: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  captureContent: {
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 40,
    gap: 16,
  },
  header: {
    marginBottom: 4,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  title: {
    color: '#111827',
    fontSize: 32,
    fontWeight: '700',
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },

  // Input card with floating mic
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 56, // room for mic button
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  input: {
    minHeight: 140,
    color: '#111827',
    fontSize: 16,
    lineHeight: 24,
  },
  micFloatButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  micFloatButtonPressed: {
    backgroundColor: '#1D4ED8',
  },
  micFloatIcon: {
    fontSize: 20,
  },

  // Save CTA
  saveCta: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveCtaDisabled: {
    backgroundColor: '#E5E7EB',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveCtaPressed: {
    backgroundColor: '#1D4ED8',
  },
  saveCtaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  saveCtaTextDisabled: {
    color: '#9CA3AF',
  },
  savedMessage: {
    color: '#047857',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  // ── Today's Digest section ────────────────────────────────────
  digestSection: {
    gap: 12,
  },
  digestSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  digestSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  digestSectionSub: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 1,
  },
  generateButton: {
    height: 38,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  generateButtonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  generateButtonPressed: {
    backgroundColor: '#1D4ED8',
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  skeletonCard: {
    gap: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  skeletonHeadline: {
    height: 18,
    width: '70%',
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
  },
  skeletonLine: {
    height: 11,
    width: '100%',
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  sampleBanner: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  sampleBannerText: {
    fontSize: 14,
    color: '#1D4ED8',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },
  digestErrorCard: {
    gap: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  digestErrorText: {
    color: '#B91C1C',
    fontSize: 14,
    lineHeight: 20,
  },
  digestErrorButton: {
    alignSelf: 'flex-start',
    height: 36,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#DC2626',
  },
  digestErrorButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  digestEmptyState: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  digestEmptyText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 19,
  },

  // Recent entries preview
  recentSection: {
    gap: 10,
  },
  recentTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  emptyState: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  entryItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  entryText: {
    color: '#111827',
    fontSize: 14,
    lineHeight: 20,
  },
  entryMeta: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
  },

  // ── Shared utility ────────────────────────────────────────────
  centeredMessage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  centeredMessageText: {
    color: '#6B7280',
    fontSize: 15,
    textAlign: 'center',
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
