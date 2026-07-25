import { getFirestore, collection, query, where, orderBy, limit, getDocs } from '@react-native-firebase/firestore';

import type { Digest } from '../functions/generateDigest';

/**
 * Fetches the latest digest for today's date key for a given user.
 * Returns null if no digest exists for today.
 */
export async function fetchTodayDigest(uid: string): Promise<Digest | null> {
  const db = getFirestore();

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const digestQuery = query(
    collection(db, 'digestRecords'),
    where('uid', '==', uid),
    where('dateKey', '==', todayKey),
    orderBy('generatedAt', 'desc'),
    limit(1),
  );

  const snapshot = await getDocs(digestQuery);

  if (snapshot.empty) {
    return null;
  }

  return snapshot.docs[0].data() as Digest;
}
