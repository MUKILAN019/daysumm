import { PermissionsAndroid, Platform } from 'react-native';

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false; // this project targets Android only, per the app's scope
  }

  if (Platform.Version < 33) {
    return true; // pre-Android 13 doesn't require runtime permission at all
  }

  try {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch (error) {
    console.warn('Notification permission request failed', error);
    return false;
  }
}