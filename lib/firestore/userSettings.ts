import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from '@react-native-firebase/firestore';

import type { UserSettings } from './types';

export async function fetchUserSettings(uid: string): Promise<UserSettings | null> {
  const db = getFirestore();
  const snapshot = await getDoc(doc(db, 'userSettings', uid));
  return snapshot.exists() ? (snapshot.data() as UserSettings) : null;
}

export async function completeOnboarding(
  uid: string,
  role: string,
  timezone: string,
): Promise<void> {
  const db = getFirestore();
  await setDoc(
    doc(db, 'userSettings', uid),
    {
      role,
      timezone,
      onboardingComplete: true,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}