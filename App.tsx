import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Asset } from 'expo-asset';
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
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  getTodayEntries,
  getHasSeenSampleDigest,
  initDb,
  insertEntry,
  cleanupOldLocalEntries,
  softDeleteEntry,
  restoreSoftDeletedEntry,
  markEntryDeletionPending,
  hardDeleteLocalEntry,
  type LocalEntry,
} from './lib/db/entries';
import { GoogleSignInScreen } from './lib/screens/GoogleSignInScreen';
import { HomeScreen } from './lib/screens/HomeScreen';
import { TextCaptureScreen } from './lib/screens/TextCaptureScreen';
import { NotificationPermissionScreen } from './lib/screens/NotificationPermissionScreen';
import { requestNotificationPermission } from './lib/permissions/requestNotificationPermission';
import { syncFcmToken, subscribeToTokenRefresh } from './lib/notifications/fcmToken';
import { fetchUserSettings, completeOnboarding, syncUserTimezone } from './lib/firestore/userSettings';
import { RoleSelectionScreen } from './lib/screens/RoleSelectionScreen';
import { getMessaging, onMessage, onNotificationOpenedApp, getInitialNotification } from '@react-native-firebase/messaging';
import { DigestViewScreen } from './lib/screens/DigestViewScreen';
import { DigestReadyBanner } from './lib/components/DigestReadyBanner';
import { extractDigestRecordId } from './lib/notifications/notificationRouting';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { syncEntries, syncPendingDeletedEntries } from './lib/sync/queue';
import { updateEntryClassification, updateEntryText, updateEntryTextAndTags, markEntryUserCorrected, migrateLocalEntriesUid, migrateUnsyncedEntriesToUser } from './lib/db/entries';
import { refreshWidgetData } from './lib/widgets/refreshWidget';
import { DigestHistoryScreen } from './lib/screens/DigestHistoryScreen';
import { Linking } from 'react-native';
import { StreakBadge } from './lib/components/StreakBadge';
import { fetchCurrentStreak } from './lib/firestore/userStats';
import Purchases, { type CustomerInfo } from 'react-native-purchases';
import { configureRevenueCat } from './lib/purchases/revenueCat';
import { PaywallScreen } from './lib/screens/PaywallScreen';
import { hasProEntitlementCached, isProEntitled, refreshEntitlement } from './lib/purchases/checkEntitlement';
import { BottomTabBar, type TabName } from './lib/components/BottomTabBar';
import { SettingsScreen } from './lib/screens/SettingsScreen';
import { markSampleDigestSeen } from './lib/db/entries';
import { transcribeAudio } from './lib/functions/transcribeAudio';
import { DigestScreen } from './lib/screens/DigestScreen';
import { generateDigest, type Digest } from './lib/functions/generateDigest';
import { PersonalInfoScreen } from './lib/screens/PersonalInfoScreen';
import { NotificationSettingsScreen } from './lib/screens/NotificationSettingsScreen';
import { fetchTodayDigest } from './lib/firestore/fetchTodayDigest';
import { EntryDetailSheet, type EntryDetailSaveParams } from './lib/components/EntryDetailSheet';
import { translateText } from './lib/functions/translateText';
import { Colors, Elevation, Radii, Spacing, Typography } from './lib/theme/tokens';
import { CustomModal } from './lib/components/CustomModal';
import { ScreenTransition } from './lib/components/ScreenTransition';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const SYNC_DEBOUNCE_MS = 10 * 1000; // 10-second debounce for entry-save syncs
const DELETE_UNDO_MS = 4500;
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
  const [screenMode, setScreenMode] = useState<'capture' | 'digest' | 'paywall' | 'personalInfo' | 'notificationSettings'>('capture');
  const [activeTab, setActiveTab] = useState<TabName>('write');
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [pendingRole, setPendingRole] = useState<string | null>(null);
  const [showNotificationStep, setShowNotificationStep] = useState(false);
  const wasOnlineRef = useRef<boolean | null>(null);
  const syncDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deleteUndoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDeleteRef = useRef<LocalEntry | null>(null);
  const [openedDigestRecordId, setOpenedDigestRecordId] = useState<string | null>(null);
  const [showForegroundBanner, setShowForegroundBanner] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);

  // ── Today's Digest state (Generate Now flow) ──────────────────
  const [digest, setDigest] = useState<Digest | null>(null);
  const [digestRefreshVersion, setDigestRefreshVersion] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [digestError, setDigestError] = useState<string | null>(null);
  const [isLimitError, setIsLimitError] = useState(false);
  const [showSampleDigest, setShowSampleDigest] = useState(false);
  
  // ── Entry Detail Sheet state ───────────────────────────────────────
  const [selectedEntry, setSelectedEntry] = useState<LocalEntry | null>(null);
  const [deletedEntryToast, setDeletedEntryToast] = useState<LocalEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<LocalEntry | null>(null);


  async function loadEntries() {
    const uid = getAuth().currentUser?.uid;
    if (!uid) {
      setEntries([]);
      return;
    }
    const localEntries = await getTodayEntries(uid);

    setEntries(localEntries);
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
        await loadEntries();
        setEntriesRefreshVersion((value) => value + 1);
        return;
      }

      const result = await syncEntries();

      await loadEntries();
      setEntriesRefreshVersion((value) => value + 1);
    } catch (error) {
      console.warn(`Sync ${reason} failed`, error);
    }
  }

  /**
   * Schedule a debounced sync — waits SYNC_DEBOUNCE_MS before firing so that
   * entries saved in quick succession are batched into a single classify call.
   * Each new call resets the timer.
   */
  function scheduleDebouncedSync(reason: string) {
    if (syncDebounceTimerRef.current) {
      clearTimeout(syncDebounceTimerRef.current);
    }
    syncDebounceTimerRef.current = setTimeout(() => {
      syncDebounceTimerRef.current = null;
      runSync(reason);
    }, SYNC_DEBOUNCE_MS);
  }

  /** Immediately fire any pending debounced sync (e.g. app backgrounding). */
  function flushDebouncedSync() {
    if (syncDebounceTimerRef.current) {
      clearTimeout(syncDebounceTimerRef.current);
      syncDebounceTimerRef.current = null;
      runSync('debounce-flush');
    }
  }

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
    });
  }, []);


  useEffect(() => {
    // Preload heavy image assets in the background
    Asset.loadAsync([
      require('./assets/cat-hero.png'),
      require('./assets/cat-peek.png'),
      require('./assets/cat-lying-waiting.png'),
      require('./assets/cat-king.png'),
      require('./assets/cat-widget-cheer.png'),
    ]).catch((err) => console.warn('Asset preload failed', err));

    initDb()
      .then(async () => {
        const uid = getAuth().currentUser?.uid;
        await cleanupOldLocalEntries(uid);
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
        flushDebouncedSync();
        runSync('foreground');
        const uid = getAuth().currentUser?.uid;
        refreshWidgetData(uid);
        refreshStreak();
        refreshTodayDigest();
        refreshEntitlementState();
      }

      // Flush any pending debounced sync before the app goes to background
      if (previousAppState === 'active' && nextAppState !== 'active') {
        flushDebouncedSync();
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
        refreshEntitlementState();
      }
    }, FIFTEEN_MINUTES_MS);

    return () => {
      appStateSubscription.remove();
      netInfoUnsubscribe();
      clearInterval(intervalId);
      if (deleteUndoTimerRef.current) {
        clearTimeout(deleteUndoTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const customerInfoListener = (info: CustomerInfo) => {
      setIsPro(isProEntitled(info));
    };

    Purchases.addCustomerInfoUpdateListener(customerInfoListener);

    return () => {
      Purchases.removeCustomerInfoUpdateListener(customerInfoListener);
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
        refreshTodayDigest();
        refreshEntitlement().then(setIsPro);
      })
      .catch((error: unknown) => {
        console.warn('Failed to fetch user settings', error);
        setNeedsOnboarding(false);
        setOnboardingChecked(true);
        refreshEntitlement().then(setIsPro);
      });
  }, [authReady, showGoogleSignIn]);

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setOnboardingChecked(false);
      
      if (user) {
        const isGuest = user.isAnonymous || user.providerData.length === 0;
        if (isGuest && user.metadata.creationTime) {
          const creationDate = new Date(user.metadata.creationTime);
          const ageHours = (Date.now() - creationDate.getTime()) / (1000 * 60 * 60);
          if (ageHours > 24) {
            await auth.signOut();
            return; // onAuthStateChanged will fire again with user=null
          }
        }

        const hasGoogleProvider = user.providerData.some(
          (provider) => provider.providerId === 'google.com'
        );
        setShowGoogleSignIn(false);
        setAuthReady(true);
        setGoogleError(null);

        // Adopt any local unsynced entries on device for this user UID
        await migrateUnsyncedEntriesToUser(user.uid);
        syncUserTimezone(user.uid).catch((err) =>
          console.warn('Failed to sync user timezone', err)
        );

        try {
          configureRevenueCat(user.uid);
        } catch (error) {
          console.warn('Failed to sync RevenueCat identity', error);
        }

        runSync('auth-ready');
        return;
      }

      // No user at all — show the sign-in screen and wait for an explicit choice.
      setEntries([]);
      setDigest(null);
      setCurrentStreak(0);
      setUserRole(null);
      setIsPro(false);
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
    const messaging = getMessaging();
    
    // Case: app was in background, user tapped the notification to foreground it
    const unsubscribeOpenedApp = onNotificationOpenedApp(messaging, (remoteMessage) => {
      const digestRecordId = extractDigestRecordId(remoteMessage);
      if (digestRecordId) {
        setOpenedDigestRecordId(digestRecordId);
        setScreenMode('digest');
      }
    });

    // Case: app was fully killed, tapping the notification launched it fresh
    getInitialNotification(messaging)
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
    const unsubscribeForeground = onMessage(messaging, async (remoteMessage) => {
      const digestRecordId = extractDigestRecordId(remoteMessage);
      if (digestRecordId) {
        setOpenedDigestRecordId(digestRecordId);
        setShowForegroundBanner(true);
        // Refresh the digest state so the Digest tab shows the latest content
        refreshTodayDigest();
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
      const uid = getAuth().currentUser?.uid;
      if (!uid) return;

      await insertEntry(trimmedText, 'text', uid);
      await refreshEntries();
      setText('');
      setSavedMessage('Saved locally');

      scheduleDebouncedSync('save');
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
            const oldUid = currentUser.uid;
            const userCredential = await signInWithCredential(auth, credential);
            const newUid = userCredential.user.uid;

            if (oldUid && newUid && oldUid !== newUid) {
              await migrateLocalEntriesUid(oldUid, newUid);
              await syncEntries();
            }
          } else {
            throw linkError;
          }
        }
      } else {
        // No guest session at all — straightforward sign-in.
        const userCredential = await signInWithCredential(auth, credential);
        if (userCredential.user?.uid) {
          await migrateUnsyncedEntriesToUser(userCredential.user.uid);
          await syncEntries();
        }
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

  async function handleNotificationStepContinue(time: string) {
    const granted = await requestNotificationPermission();

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
      await completeOnboarding(uid, pendingRole, timezone, time);
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
      // Flush pending local entries first so recent saves are included in digest
      await syncEntries();
      const nextDigest = await generateDigest();
      setDigest(nextDigest);

      setDigestRefreshVersion(v => v + 1);
      await markSampleDigestSeen();
      setShowSampleDigest(false);

      // Refresh streak + widget immediately after digest generation
      refreshStreak();
      const uid = getAuth().currentUser?.uid;
      refreshWidgetData(uid);
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string; details?: unknown };
      const codeStr = String(err?.code || '').toLowerCase();
      const msgStr = String(err?.message || '').toLowerCase();
      const detailsStr = JSON.stringify(err || {}).toLowerCase();

      const isQuotaLimit =
        codeStr.includes('resource-exhausted') ||
        codeStr.includes('quota') ||
        msgStr.includes('3 free digests') ||
        msgStr.includes('resource-exhausted') ||
        msgStr.includes('limit') ||
        msgStr.includes('quota') ||
        detailsStr.includes('resource-exhausted') ||
        detailsStr.includes('quota');

      if (isQuotaLimit) {
        setDigestError("You've reached your daily limit of 3 free AI digests today. Upgrade to Pro for unlimited digest generations!");
        setIsLimitError(true);
      } else {
        console.warn('Digest generation failed', error);
        setDigestError('Could not generate a digest right now. Please try again.');
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

  async function refreshTodayDigest() {
    const uid = getAuth().currentUser?.uid;
    if (!uid) return;
    try {
      const todayDigest = await fetchTodayDigest(uid);
      if (todayDigest) {
        setDigest(todayDigest);
        setDigestRefreshVersion(v => v + 1);
      }
    } catch (error) {
      console.warn('Failed to refresh today digest', error);
    }
  }

  async function refreshEntitlementState() {
    try {
      const entitled = await refreshEntitlement();
      setIsPro(entitled);
    } catch (error) {
      console.warn('Failed to refresh entitlement state', error);
    }
  }

  // Helper to switch tabs and keep screenMode in sync
  function handleTabPress(tab: TabName) {
    setActiveTab(tab);
    setScreenMode('capture'); // reset screen mode on tab change
  }

  const userName = getAuth().currentUser?.displayName || 'User';

  async function handleRecordFinished(uri: string) {
    try {
      const { text, textEn } = await transcribeAudio(uri);
      const trimmedText = text.trim();
      if (!trimmedText) {
        console.warn('No speech detected in recording.');
        return;
      }
      
      const uid = getAuth().currentUser?.uid;
      if (!uid) return;

      await insertEntry(trimmedText, 'voice', uid, textEn);
      await refreshEntries();
      scheduleDebouncedSync('voice-save');
      await refreshWidgetData(uid);
    } catch (error) {
      console.warn('Voice transcription/save failed', error);
      alert('Transcription failed. Please try again.');
    }
  }

  async function finalizePendingDelete(entry: LocalEntry, uid: string) {
    try {
      if (entry.synced) {
        await markEntryDeletionPending(entry.localId, uid);
        const networkState = await NetInfo.fetch();
        const isOnline =
          networkState.isConnected === true && networkState.isInternetReachable !== false;

        if (isOnline) {
          await syncPendingDeletedEntries();
          await refreshEntries();
        }
      } else {
        await hardDeleteLocalEntry(entry.localId, uid);
      }
      await refreshWidgetData(uid);
    } catch (error) {
      console.warn('Entry delete finalize failed', error);
    }
  }

  function startDeleteUndoWindow(entry: LocalEntry, uid: string) {
    if (deleteUndoTimerRef.current) {
      clearTimeout(deleteUndoTimerRef.current);
      deleteUndoTimerRef.current = null;
    }

    const previousPendingDelete = pendingDeleteRef.current;
    if (previousPendingDelete && previousPendingDelete.localId !== entry.localId) {
      finalizePendingDelete(previousPendingDelete, uid);
    }

    pendingDeleteRef.current = entry;
    setDeletedEntryToast(entry);

    deleteUndoTimerRef.current = setTimeout(() => {
      deleteUndoTimerRef.current = null;
      pendingDeleteRef.current = null;
      setDeletedEntryToast(null);
      finalizePendingDelete(entry, uid);
    }, DELETE_UNDO_MS);
  }

  async function handleUndoDelete() {
    const entry = pendingDeleteRef.current;
    const uid = getAuth().currentUser?.uid;
    if (!entry || !uid) return;

    if (deleteUndoTimerRef.current) {
      clearTimeout(deleteUndoTimerRef.current);
      deleteUndoTimerRef.current = null;
    }

    pendingDeleteRef.current = null;
    setDeletedEntryToast(null);

    try {
      await restoreSoftDeletedEntry(entry.localId, uid);
      await refreshEntries();
      await refreshWidgetData(uid);
    } catch (error) {
      console.warn('Entry delete undo failed', error);
    }
  }

  function handleDeleteEntryPress(entry: LocalEntry) {
    setEntryToDelete(entry);
  }

  async function confirmDeleteEntry() {
    if (!entryToDelete) return;
    const uid = getAuth().currentUser?.uid;
    if (!uid) {
      setEntryToDelete(null);
      return;
    }

    try {
      await softDeleteEntry(entryToDelete.localId, uid);
      if (selectedEntry?.localId === entryToDelete.localId) {
        setSelectedEntry(null);
      }
      await refreshEntries();
      await refreshWidgetData(uid);
      startDeleteUndoWindow(entryToDelete, uid);
    } catch (error) {
      console.warn('Entry delete failed', error);
    } finally {
      setEntryToDelete(null);
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
          onPersonalInformationPress={() => setScreenMode('personalInfo')}
          onNotificationSettingsPress={() => setScreenMode('notificationSettings')}
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
          refreshKey={digestRefreshVersion}
          todayDigest={digest}
        />
      );
    }

    if (activeTab === 'write') {
      return (
        <TextCaptureScreen
          currentStreak={currentStreak}
          onSave={async (newText) => {
            const uid = getAuth().currentUser?.uid;
            if (!uid) return;
            await insertEntry(newText, 'text', uid);
            await refreshEntries();
            scheduleDebouncedSync('save');
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
        onEntryPress={(entry) => setSelectedEntry(entry)}
        onDeleteEntryPress={handleDeleteEntryPress}
      />
    );
  }

  function renderMainContent() {
    if (!authReady) {
      return (
        <View style={styles.loadingContainer}>
          <StatusBar style="dark" />
          <ActivityIndicator size="large" color={Colors.BluePrimary} />
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
          <StatusBar style="dark" />
          <ActivityIndicator size="large" color={Colors.BluePrimary} />
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

    if (screenMode === 'personalInfo') {
      return <PersonalInfoScreen onBack={() => setScreenMode('capture')} />;
    }

    if (screenMode === 'notificationSettings') {
      return <NotificationSettingsScreen onBack={() => setScreenMode('capture')} />;
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

        <EntryDetailSheet
          entry={selectedEntry}
          visible={!!selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onSave={async (params: EntryDetailSaveParams) => {
            const uid = getAuth().currentUser?.uid;
            if (!uid) return;

            const { localId, newText, newTags, didTextChange, didUserSetTags } = params;

            if (didTextChange && didUserSetTags) {
              // Case A: Text changed + User set tags. Translate text, update tags.
              // Fast optimistic update
              await updateEntryTextAndTags(localId, uid, newText, newTags);
              await refreshEntries();

              // Background translation
              try {
                const textEn = await translateText(newText);
                await updateEntryTextAndTags(localId, uid, newText, newTags, textEn);
              } catch (err) {
                console.warn('Translate failed in Case A', err);
              }
              runSync('edit-case-a');
            } else if (didTextChange && !didUserSetTags) {
              // Case B: Text changed, tags untouched. Clear tags and textEn, re-classify.
              await updateEntryText(localId, uid, newText);
              runSync('edit-case-b');
            } else if (!didTextChange && didUserSetTags) {
              // Case C: Tags changed, text untouched. Update tags locally.
              const entry = entries.find(e => e.localId === localId);
              const currentClassifierVersion = entry?.classifierVersion ?? 1;
              const currentTextEn = entry?.textEn;
              await updateEntryClassification(
                localId,
                uid,
                newTags,
                1.0, // Confidence is 1.0 because user set it
                currentClassifierVersion,
                currentTextEn,
                true,
                false
              );
              runSync('edit-case-c');
            } else if (!didTextChange && !didUserSetTags) {
              // Case D: No-op Save. User looked and said it's fine.
              await markEntryUserCorrected(localId, uid);
              runSync('edit-case-noop');
            }
            await refreshEntries();
          }}
        />

        {/* Main content area */}
        <View style={styles.contentArea}>
          <ScreenTransition key={activeTab}>
            {renderTabContent()}
          </ScreenTransition>
        </View>

        {/* Bottom tab bar */}
        <BottomTabBar activeTab={activeTab} onTabPress={handleTabPress} />

        {deletedEntryToast ? (
          <View style={styles.undoToast}>
            <Text style={styles.undoToastText}>Entry deleted</Text>
            <Pressable
              accessibilityRole="button"
              onPress={handleUndoDelete}
              style={({ pressed }) => [
                styles.undoToastAction,
                pressed && styles.undoToastActionPressed,
              ]}
            >
              <Text style={styles.undoToastActionText}>Undo</Text>
            </Pressable>
          </View>
        ) : null}

        <CustomModal
          visible={!!entryToDelete}
          title="Delete entry?"
          message="This entry will be removed from today's list."
          type="warning"
          primaryButtonText="Delete"
          onPrimaryPress={confirmDeleteEntry}
          secondaryButtonText="Cancel"
          onSecondaryPress={() => setEntryToDelete(null)}
        />

        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <SafeAreaProvider initialMetrics={{ insets: { top: 0, right: 0, bottom: 0, left: 0 }, frame: { x: 0, y: 0, width: 0, height: 0 } }}>
      {renderMainContent()}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  // ── Root shells ──────────────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: Colors.GrayBg,
  },
  contentArea: {
    flex: 1,
    overflow: 'hidden',
  },

  // ── Capture tab (home) ────────────────────────────────────────
  captureScroll: {
    flex: 1,
    backgroundColor: Colors.GrayBg,
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
    color: Colors.TextDark,
    fontSize: 32,
    fontWeight: '700',
  },
  subtitle: {
    color: Colors.TextSubtle,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },

  // Input card with floating mic
  inputCard: {
    backgroundColor: Colors.White,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.Border,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 56, // room for mic button
    shadowColor: Colors.Ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  input: {
    minHeight: 140,
    color: Colors.TextDark,
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
    backgroundColor: Colors.BluePrimary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.BluePrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  micFloatButtonPressed: {
    backgroundColor: Colors.BlueDark,
  },
  micFloatIcon: {
    fontSize: 20,
  },

  // Save CTA
  saveCta: {
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.BluePrimary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.BluePrimary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveCtaDisabled: {
    backgroundColor: Colors.Border,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveCtaPressed: {
    backgroundColor: Colors.BlueDark,
  },
  saveCtaText: {
    color: Colors.White,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  saveCtaTextDisabled: {
    color: Colors.TextMuted,
  },
  savedMessage: {
    color: Colors.PrimaryDeep,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  undoToast: {
    position: 'absolute',
    left: Spacing.screenPadding,
    right: Spacing.screenPadding,
    bottom: 82,
    minHeight: 48,
    borderRadius: Radii.card,
    backgroundColor: Colors.Card,
    borderWidth: 1,
    borderColor: Colors.Border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    ...Elevation,
  },
  undoToastText: {
    ...Typography.Secondary,
    color: Colors.PrimaryDeep,
    fontWeight: '600',
  },
  undoToastAction: {
    borderRadius: Radii.button,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    backgroundColor: Colors.PrimaryTint,
  },
  undoToastActionPressed: {
    backgroundColor: 'rgba(16,185,129,0.15)',
  },
  undoToastActionText: {
    ...Typography.Label,
    color: Colors.PrimaryDeep,
    fontWeight: '700',
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
    color: Colors.TextDark,
  },
  digestSectionSub: {
    fontSize: 12,
    color: Colors.TextMuted,
    marginTop: 1,
  },
  generateButton: {
    height: 38,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: Colors.BluePrimary,
    shadowColor: Colors.BluePrimary,
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
    backgroundColor: Colors.BlueDark,
  },
  generateButtonText: {
    color: Colors.White,
    fontSize: 13,
    fontWeight: '700',
  },
  skeletonCard: {
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.Border,
    borderRadius: 14,
    backgroundColor: Colors.White,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  skeletonHeadline: {
    height: 18,
    width: '70%',
    borderRadius: 6,
    backgroundColor: Colors.Border,
  },
  skeletonLine: {
    height: 11,
    width: '100%',
    borderRadius: 6,
    backgroundColor: Colors.TagNoteBg,
  },
  sampleBanner: {
    backgroundColor: Colors.BlueLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.BlueBorder,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  sampleBannerText: {
    fontSize: 14,
    color: Colors.BlueDark,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },
  digestErrorCard: {
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.DangerBorder,
    borderRadius: 14,
    backgroundColor: Colors.DangerBg,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  digestErrorText: {
    color: Colors.DangerDark,
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
    backgroundColor: Colors.TagBlockerText,
  },
  digestErrorButtonText: {
    color: Colors.White,
    fontSize: 13,
    fontWeight: '700',
  },
  digestEmptyState: {
    backgroundColor: Colors.GraySubtle,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.Border,
    borderStyle: 'dashed',
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  digestEmptyText: {
    fontSize: 13,
    color: Colors.TextMuted,
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
    color: Colors.TextSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  emptyState: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    color: Colors.TextMuted,
    fontSize: 14,
  },
  entryItem: {
    backgroundColor: Colors.White,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.Border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  entryText: {
    color: Colors.TextDark,
    fontSize: 14,
    lineHeight: 20,
  },
  entryMeta: {
    color: Colors.TextMuted,
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
    color: Colors.TextSubtle,
    fontSize: 15,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.GrayBg,
  },
  loadingText: {
    marginTop: 18,
    color: Colors.TextSecondary,
    fontSize: 16,
  },
});
