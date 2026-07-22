import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from '@react-native-firebase/firestore';

import type { DailyUsage } from './types';

export async function fetchDailyUsage(uid: string, dateKey: string): Promise<DailyUsage | null> {
  const db = getFirestore();
  const snapshot = await getDoc(doc(db, 'dailyUsage', `${uid}_${dateKey}`));
  return snapshot.exists() ? (snapshot.data() as DailyUsage) : null;
}

export async function updateDailyUsageForTimeChange(
  uid: string,
  dateKey: string,
  newTimeChangesCount: number
): Promise<void> {
  const db = getFirestore();
  await setDoc(
    doc(db, 'dailyUsage', `${uid}_${dateKey}`),
    {
      uid,
      date: dateKey,
      pushSent: false,
      timeChangesAfterPush: newTimeChangesCount,
    },
    { merge: true },
  );
}
