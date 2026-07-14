import { PermissionsAndroid, Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { updateFcmToken } from '../firestore/userSettings';

async function hasNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }
  if (Platform.Version < 33) {
    return true; // pre-Android 13 doesn't gate this behind runtime permission
  }
  return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
}

/**
 * Fetches the current FCM token and writes it to Firestore ONLY if:
 * - the user has actually granted notification permission, and
 * - the token differs from what's already stored (avoids redundant writes).
 */
export async function syncFcmToken(uid: string, storedToken?: string | null): Promise<void> {
  const permitted = await hasNotificationPermission();

  if (!permitted) {
    return; // denied — skip silently, no retry, per Step 1's spec
  }

  try {
    const currentToken = await messaging().getToken();

    if (currentToken && currentToken !== storedToken) {
      await updateFcmToken(uid, currentToken);
    }
  } catch (error) {
    console.warn('Failed to sync FCM token', error);
  }
}

/**
 * Keeps Firestore in sync whenever FCM rotates the token, for the lifetime
 * of this app session. Returns an unsubscribe function.
 */
export function subscribeToTokenRefresh(uid: string): () => void {
  return messaging().onTokenRefresh(async (newToken) => {
    try {
      await updateFcmToken(uid, newToken);
    } catch (error) {
      console.warn('Failed to update refreshed FCM token', error);
    }
  });
}