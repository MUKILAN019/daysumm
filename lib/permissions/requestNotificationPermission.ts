import { PermissionsAndroid, Platform } from 'react-native';

export async function requestNotificationPermission(): Promise<boolean> {
  const androidVersion =
    typeof Platform.Version === 'number' ? Platform.Version : Number.parseInt(Platform.Version, 10);

  if (androidVersion < 33) {
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
