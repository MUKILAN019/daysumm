import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from '@react-native-firebase/firestore';

import type { UserSettings } from './types';
import { getUserTimezone } from '../utils/date';

export async function fetchUserSettings(uid: string): Promise<UserSettings | null> {
  const db = getFirestore();
  const snapshot = await getDoc(doc(db, 'userSettings', uid));
  return snapshot.exists() ? (snapshot.data() as UserSettings) : null;
}

export async function completeOnboarding(
  uid: string,
  role: string,
  timezone: string,
  notificationTime: string = '17:00'
): Promise<void> {
  const db = getFirestore();
  await setDoc(
    doc(db, 'userSettings', uid),
    {
      role,
      timezone,
      notificationTime,
      onboardingComplete: true,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function updateNotificationTime(uid: string, notificationTime: string): Promise<void> {
  const db = getFirestore();
  await setDoc(
    doc(db, 'userSettings', uid),
    { notificationTime, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function updateUserRole(uid: string, role: string): Promise<void> {
  const db = getFirestore();
  await setDoc(
    doc(db, 'userSettings', uid),
    { role, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function updateFcmToken(uid: string, fcmToken: string): Promise<void> {
  const db = getFirestore();
  await setDoc(
    doc(db, 'userSettings', uid),
    { fcmToken, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function syncUserTimezone(uid: string): Promise<void> {
  const timezone = getUserTimezone();
  const db = getFirestore();
  await setDoc(
    doc(db, 'userSettings', uid),
    { timezone, updatedAt: serverTimestamp() },
    { merge: true },
  );
}