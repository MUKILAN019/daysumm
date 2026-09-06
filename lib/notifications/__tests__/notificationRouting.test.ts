import { describe, it, expect } from '@jest/globals';
import { extractDigestRecordId } from '../notificationRouting';
import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging';

describe('extractDigestRecordId', () => {
  it('extracts digestRecordId when present in remote message data', () => {
    const message = {
      data: {
        digestRecordId: 'digest_rec_999',
        type: 'digest_ready',
      },
    } as unknown as FirebaseMessagingTypes.RemoteMessage;

    expect(extractDigestRecordId(message)).toBe('digest_rec_999');
  });

  it('returns null when digestRecordId is missing from data', () => {
    const message = {
      data: {
        type: 'welcome',
      },
    } as unknown as FirebaseMessagingTypes.RemoteMessage;

    expect(extractDigestRecordId(message)).toBeNull();
  });

  it('returns null when message or data is undefined', () => {
    expect(extractDigestRecordId(null)).toBeNull();
    expect(extractDigestRecordId(undefined)).toBeNull();
    expect(extractDigestRecordId({} as unknown as FirebaseMessagingTypes.RemoteMessage)).toBeNull();
  });
});
