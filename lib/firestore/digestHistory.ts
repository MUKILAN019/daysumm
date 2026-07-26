import { getFirestore, collection, query, where, orderBy, getDocs } from '@react-native-firebase/firestore';

import type { Digest } from '../functions/generateDigest';

export interface DigestHistoryEntry extends Digest {
  dateKey: string;
}

/**
 * Fetches this user's digestRecords, most recent first, limited to the last
 * `maxDaysBack` calendar days. Defaults to a generous 30 — Day 32's RevenueCat
 * wiring will pass 3 for free-tier users instead of hardcoding a limit here.
 */
export async function fetchDigestHistory(
  uid: string,
  maxDaysBack: number = 30,
): Promise<DigestHistoryEntry[]> {
  const db = getFirestore();

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxDaysBack);
  const cutoffDateKey = cutoff.toISOString().slice(0, 10);

  const digestQuery = query(
    collection(db, 'digestRecords'),
    where('uid', '==', uid),
    where('dateKey', '>=', cutoffDateKey),
    orderBy('dateKey', 'desc'),
  );

  const snapshot = await getDocs(digestQuery);

  return snapshot.docs.map((doc) => {
    const data = doc.data() as Digest & { dateKey: string };
    return { ...data, dateKey: data.dateKey };
  });
}
