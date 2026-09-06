import { useEffect, useState } from 'react';
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCredential,
  linkWithCredential,
  GoogleAuthProvider,
  signOut,
  type User,
} from '@react-native-firebase/auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { fetchUserSettings, completeOnboarding, syncUserTimezone } from '../firestore/userSettings';
import { getUserTimezone } from '../utils/date';
import { syncFcmToken, subscribeToTokenRefresh } from '../notifications/fcmToken';
import { configureRevenueCat, logoutRevenueCat } from '../purchases/revenueCat';
import { refreshEntitlement } from '../purchases/checkEntitlement';
import { requestNotificationPermission } from '../permissions/requestNotificationPermission';
import { migrateUnsyncedEntriesToUser } from '../db/entries';

const GOOGLE_WEB_CLIENT_ID = '710945440659-br81lghmsqm8lmrg0f441a1vtq68rln8.apps.googleusercontent.com';

export function useAuthManager() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showGoogleSignIn, setShowGoogleSignIn] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [showNotificationStep, setShowNotificationStep] = useState(false);
  const [pendingRole, setPendingRole] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
    });
  }, []);

  async function refreshEntitlementState() {
    try {
      const entitled = await refreshEntitlement();
      setIsPro(entitled);
    } catch (error) {
      console.warn('Failed to refresh entitlement state', error);
    }
  }

  // 1. Core Auth State Listener
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // Guest expiration check (24h cleanup)
        const isGuest = currentUser.isAnonymous || currentUser.providerData.length === 0;
        if (isGuest && currentUser.metadata.creationTime) {
          const creationDate = new Date(currentUser.metadata.creationTime);
          const ageHours = (Date.now() - creationDate.getTime()) / (1000 * 60 * 60);
          if (ageHours > 24) {
            await signOut(auth);
            return;
          }
        }

        setShowGoogleSignIn(false);
        setAuthReady(true);
        setGoogleError(null);

        await migrateUnsyncedEntriesToUser(currentUser.uid);
        syncUserTimezone(currentUser.uid).catch((err) =>
          console.warn('Failed to sync user timezone', err)
        );

        try {
          configureRevenueCat(currentUser.uid);
        } catch (error) {
          console.warn('Failed to sync RevenueCat identity', error);
        }
        return;
      }

      // No user signed in — show landing sign-in screen
      setShowGoogleSignIn(true);
      setAuthReady(true);
      setUserRole(null);
      setNeedsOnboarding(false);
      setOnboardingChecked(false);
      setIsPro(false);
    });

    return unsubscribe;
  }, []);

  // 2. Fetch User Settings & Determine Onboarding state when user is active & Google Sign-In is dismissed
  useEffect(() => {
    if (!authReady || showGoogleSignIn) {
      return;
    }

    const uid = user?.uid;
    if (!uid) {
      return;
    }

    setOnboardingChecked(false);

    let isMounted = true;
    fetchUserSettings(uid)
      .then((settings) => {
        if (!isMounted) return;
        syncFcmToken(uid, settings?.fcmToken).catch((err) =>
          console.warn('Failed to sync FCM token', err)
        );

        if (settings?.role) {
          setUserRole(settings.role);
          setNeedsOnboarding(false);
        } else {
          setUserRole(null);
          setNeedsOnboarding(true);
        }
        setOnboardingChecked(true);
        refreshEntitlementState();
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        console.warn('Failed to fetch user settings', error);
        setNeedsOnboarding(false);
        setOnboardingChecked(true);
        refreshEntitlementState();
      });

    const unsubscribeTokenRefresh = subscribeToTokenRefresh(uid);

    return () => {
      isMounted = false;
      if (unsubscribeTokenRefresh) unsubscribeTokenRefresh();
    };
  }, [authReady, showGoogleSignIn, user?.uid]);

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

      if (auth.currentUser) {
        try {
          await linkWithCredential(auth.currentUser, credential);
        } catch (linkError: any) {
          if (linkError.code === 'auth/credential-already-in-use') {
            await signInWithCredential(auth, credential);
          } else {
            throw linkError;
          }
        }
      } else {
        await signInWithCredential(auth, credential);
      }

      setShowGoogleSignIn(false);
    } catch (error: any) {
      if (error?.code === statusCodes.SIGN_IN_CANCELLED) {
        setGoogleError('Google sign-in was cancelled.');
      } else if (error?.code === 'auth/credential-already-in-use') {
        setGoogleError('This Google account is already connected to another DaySumm account.');
      } else {
        setGoogleError(error?.message ?? 'Google sign-in failed. Please try again.');
      }
      console.warn('Google sign-in error', error);
    } finally {
      setGoogleBusy(false);
    }
  }

  async function handleContinueAsGuest() {
    const auth = getAuth();
    if (!auth.currentUser) {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.warn('Anonymous sign in failed', err);
      }
    }
    setShowGoogleSignIn(false);
  }

  async function handleSignOut() {
    try {
      await logoutRevenueCat();
      await signOut(getAuth());
    } catch (error) {
      console.warn('Sign out error', error);
    } finally {
      setOnboardingChecked(false);
      setNeedsOnboarding(false);
      setUserRole(null);
      setShowGoogleSignIn(true);
    }
  }

  async function handleRoleSelect(role: string) {
    setPendingRole(role);
    const granted = await requestNotificationPermission();
    const tz = getUserTimezone();
    if (granted) {
      const currentUser = getAuth().currentUser;
      if (currentUser) {
        await completeOnboarding(currentUser.uid, role, tz);
        setUserRole(role);
      }
      setNeedsOnboarding(false);
    } else {
      setShowNotificationStep(true);
    }
  }

  async function handleNotificationPermissionComplete() {
    const currentUser = getAuth().currentUser;
    const tz = getUserTimezone();
    if (currentUser && pendingRole) {
      await completeOnboarding(currentUser.uid, pendingRole, tz);
      setUserRole(pendingRole);
    }
    setShowNotificationStep(false);
    setNeedsOnboarding(false);
  }

  return {
    authReady,
    user,
    userName: user?.displayName || 'User',
    onboardingChecked,
    needsOnboarding,
    userRole,
    showGoogleSignIn,
    setShowGoogleSignIn,
    googleError,
    setGoogleError,
    googleBusy,
    setGoogleBusy,
    showNotificationStep,
    isPro,
    refreshEntitlementState,
    handleGoogleLink,
    handleContinueAsGuest,
    handleSignOut,
    handleRoleSelect,
    handleNotificationPermissionComplete,
  };
}
