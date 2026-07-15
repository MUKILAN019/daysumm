import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging';

export function extractDigestRecordId(
  remoteMessage: FirebaseMessagingTypes.RemoteMessage | null | undefined,
): string | null {
  const digestRecordId = remoteMessage?.data?.digestRecordId;
  return typeof digestRecordId === 'string' ? digestRecordId : null;
}