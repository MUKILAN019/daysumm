import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  AppState,
  type AppStateStatus,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { getAuth } from '@react-native-firebase/auth';

import { useAuthManager } from './lib/hooks/useAuthManager';
import { useEntriesManager } from './lib/hooks/useEntriesManager';
import { useDigestManager } from './lib/hooks/useDigestManager';

import { GoogleSignInScreen } from './lib/screens/GoogleSignInScreen';
import { HomeScreen } from './lib/screens/HomeScreen';
import { TextCaptureScreen } from './lib/screens/TextCaptureScreen';
import { NotificationPermissionScreen } from './lib/screens/NotificationPermissionScreen';
import { RoleSelectionScreen } from './lib/screens/RoleSelectionScreen';
import { DigestViewScreen } from './lib/screens/DigestViewScreen';
import { DigestReadyBanner } from './lib/components/DigestReadyBanner';
import { DigestHistoryScreen } from './lib/screens/DigestHistoryScreen';
import { PaywallScreen } from './lib/screens/PaywallScreen';
import { BottomTabBar, type TabName } from './lib/components/BottomTabBar';
import { SettingsScreen } from './lib/screens/SettingsScreen';
import { DigestScreen } from './lib/screens/DigestScreen';
import { PersonalInfoScreen } from './lib/screens/PersonalInfoScreen';
import { NotificationSettingsScreen } from './lib/screens/NotificationSettingsScreen';
import { EntryDetailSheet, type EntryDetailSaveParams } from './lib/components/EntryDetailSheet';
import { translateText } from './lib/functions/translateText';
import { Colors } from './lib/theme/tokens';
import { ThemeProvider, useTheme } from './lib/theme/ThemeContext';
import { CustomModal } from './lib/components/CustomModal';
import { ScreenTransition } from './lib/components/ScreenTransition';
import {
  updateEntryClassification,
  updateEntryText,
  updateEntryTextAndTags,
  markEntryUserCorrected,
  type LocalEntry,
} from './lib/db/entries';

// ---------------------------------------------------------------------------
// AppShell — keyed by uid so ALL hook state is torn down on account switch.
// This prevents entries/digest data from leaking between accounts.
// ---------------------------------------------------------------------------
interface AppShellProps {
  uid: string;
  authState: ReturnType<typeof useAuthManager>;
}

function AppShell({ uid, authState }: AppShellProps) {
  const { isDark, colors } = useTheme();
  const entriesState = useEntriesManager();
  const digestState = useDigestManager(authState.isPro, entriesState.entries.length);

  const [screenMode, setScreenMode] = useState<
    'capture' | 'digest' | 'paywall' | 'personalInfo' | 'notificationSettings'
  >('capture');
  const [activeTab, setActiveTab] = useState<TabName>('write');
  const [selectedEntry, setSelectedEntry] = useState<LocalEntry | null>(null);

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Load entries for this user on mount
  useEffect(() => {
    entriesState.loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        entriesState.flushDebouncedSync();
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [entriesState]);

  function handleTabPress(tab: TabName) {
    setActiveTab(tab);
    setScreenMode('capture');
  }

  function renderTabContent() {
    if (activeTab === 'profile') {
      return (
        <SettingsScreen
          currentStreak={digestState.currentStreak}
          isPro={authState.isPro}
          onUpgradePress={() => setScreenMode('paywall')}
          onPersonalInformationPress={() => setScreenMode('personalInfo')}
          onNotificationSettingsPress={() => setScreenMode('notificationSettings')}
          onSignOut={authState.handleSignOut}
        />
      );
    }

    if (activeTab === 'history') {
      return (
        <DigestHistoryScreen
          uid={uid}
          onUpgradePress={() => setScreenMode('paywall')}
          isPro={authState.isPro}
          refreshKey={digestState.digestRefreshVersion}
          todayDigest={digestState.digest}
        />
      );
    }

    if (activeTab === 'write') {
      return (
        <TextCaptureScreen
          currentStreak={digestState.currentStreak}
          onSave={entriesState.handleSaveText}
        />
      );
    }

    if (activeTab === 'digest') {
      return (
        <DigestScreen
          currentStreak={digestState.currentStreak}
          digest={digestState.digest}
          isGeneratingDigest={digestState.isGenerating}
          digestError={digestState.digestError}
          isLimitError={digestState.isLimitError}
          onGenerateDigest={digestState.handleGenerateDigest}
          onUpgradePress={() => setScreenMode('paywall')}
        />
      );
    }

    // Default: Voice (Home)
    return (
      <HomeScreen
        userName={authState.userName}
        currentStreak={digestState.currentStreak}
        entries={entriesState.entries}
        onRecordFinished={entriesState.handleRecordFinished}
        onEntryPress={(entry) => setSelectedEntry(entry)}
        onDeleteEntryPress={(entry) => entriesState.setEntryToDelete(entry)}
      />
    );
  }

  if (screenMode === 'digest' && digestState.openedDigestRecordId) {
    return (
      <DigestViewScreen
        digestRecordId={digestState.openedDigestRecordId}
        onBack={() => {
          setScreenMode('capture');
          digestState.setOpenedDigestRecordId(null);
        }}
      />
    );
  }

  if (screenMode === 'paywall') {
    return (
      <PaywallScreen
        role={authState.userRole}
        onBack={() => setScreenMode('capture')}
        onPurchaseSuccess={() => {
          authState.refreshEntitlementState();
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
    <View style={[styles.container, { backgroundColor: colors.GrayBg }]}>
      {digestState.showForegroundBanner && (
        <DigestReadyBanner
          onPress={() => {
            digestState.setShowForegroundBanner(false);
            setScreenMode('digest');
          }}
        />
      )}

      <EntryDetailSheet
        entry={selectedEntry}
        visible={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        onSave={async (params: EntryDetailSaveParams) => {
          const currentUid = getAuth().currentUser?.uid;
          if (!currentUid) return;

          const { localId, newText, newTags, didTextChange, didUserSetTags } = params;

          if (didTextChange && didUserSetTags) {
            await updateEntryTextAndTags(localId, currentUid, newText, newTags);
            await entriesState.refreshEntries();
            try {
              const textEn = await translateText(newText);
              await updateEntryTextAndTags(localId, currentUid, newText, newTags, textEn);
            } catch (err) {
              console.warn('Translate failed in Case A', err);
            }
            entriesState.scheduleDebouncedSync('edit-case-a');
          } else if (didTextChange && !didUserSetTags) {
            await updateEntryText(localId, currentUid, newText);
            entriesState.scheduleDebouncedSync('edit-case-b');
          } else if (!didTextChange && didUserSetTags) {
            const entry = entriesState.entries.find((e) => e.localId === localId);
            const currentClassifierVersion = entry?.classifierVersion ?? 1;
            const currentTextEn = entry?.textEn;
            await updateEntryClassification(
              localId,
              currentUid,
              newTags,
              1.0,
              currentClassifierVersion,
              currentTextEn,
              true,
              false
            );
            entriesState.scheduleDebouncedSync('edit-case-c');
          } else if (!didTextChange && !didUserSetTags) {
            await markEntryUserCorrected(localId, currentUid);
            entriesState.scheduleDebouncedSync('edit-case-noop');
          }
          await entriesState.refreshEntries();
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

      {entriesState.deletedEntryToast ? (
        <View style={[styles.undoToast, { backgroundColor: isDark ? '#2A2840' : '#1E293B' }]}>
          <Text style={[styles.undoToastText, { color: colors.TextPrimary }]}>Entry deleted</Text>
          <Pressable
            accessibilityRole="button"
            onPress={entriesState.handleUndoDelete}
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
        visible={!!entriesState.entryToDelete}
        title="Delete entry?"
        message="This entry will be removed from today's list."
        type="warning"
        primaryButtonText="Delete"
        onPrimaryPress={async () => {
          if (entriesState.entryToDelete) {
            await entriesState.handleSoftDelete(entriesState.entryToDelete);
            if (selectedEntry?.localId === entriesState.entryToDelete.localId) {
              setSelectedEntry(null);
            }
            entriesState.setEntryToDelete(null);
          }
        }}
        secondaryButtonText="Cancel"
        onSecondaryPress={() => entriesState.setEntryToDelete(null)}
      />

      <StatusBar style="dark" />
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  const authState = useAuthManager();

  function renderMainContent() {
    if (!fontsLoaded) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.BluePrimary} />
        </View>
      );
    }

    if (!authState.authReady) {
      return (
        <View style={styles.loadingContainer}>
          <StatusBar style="dark" />
          <ActivityIndicator size="large" color={Colors.BluePrimary} />
          <Text style={styles.loadingText}>Loading your account…</Text>
        </View>
      );
    }

    if (authState.showGoogleSignIn) {
      return (
        <GoogleSignInScreen
          isLoading={authState.googleBusy}
          errorMessage={authState.googleError ?? undefined}
          onContinue={authState.handleGoogleLink}
          onContinueAsGuest={authState.handleContinueAsGuest}
        />
      );
    }

    if (!authState.onboardingChecked) {
      return (
        <View style={styles.loadingContainer}>
          <StatusBar style="dark" />
          <ActivityIndicator size="large" color={Colors.BluePrimary} />
          <Text style={styles.loadingText}>Setting things up…</Text>
        </View>
      );
    }

    if (authState.needsOnboarding && !authState.showNotificationStep) {
      return <RoleSelectionScreen onSelect={authState.handleRoleSelect} />;
    }

    if (authState.showNotificationStep) {
      return <NotificationPermissionScreen onContinue={authState.handleNotificationPermissionComplete} />;
    }

    // AppShell is keyed by uid — React will fully unmount + remount it
    // whenever the user changes, wiping all stale entries/digest state.
    const uid = authState.user?.uid;
    if (!uid) {
      return (
        <View style={styles.loadingContainer}>
          <StatusBar style="dark" />
          <ActivityIndicator size="large" color={Colors.BluePrimary} />
        </View>
      );
    }

    return (
      <ThemeProvider>
        <AppShell key={uid} uid={uid} authState={authState} />
      </ThemeProvider>
    );
  }

  return (
    <SafeAreaProvider>
      {renderMainContent()}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.GrayBg,
  },
  contentArea: {
    flex: 1,
    overflow: 'hidden',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.GrayBg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: Colors.TextSubtle,
    fontSize: 14,
  },
  undoToast: {
    position: 'absolute',
    bottom: 84,
    left: 20,
    right: 20,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 999,
  },
  undoToastText: {
    color: Colors.White,
    fontSize: 14,
    fontWeight: '500',
  },
  undoToastAction: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  undoToastActionPressed: {
    opacity: 0.7,
  },
  undoToastActionText: {
    color: '#60A5FA',
    fontSize: 14,
    fontWeight: '600',
  },
});
