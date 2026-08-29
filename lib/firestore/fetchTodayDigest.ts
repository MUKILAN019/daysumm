import { getFirestore, collection, query, where, orderBy, limit, getDocs } from '@react-native-firebase/firestore';

import type { Digest } from '../functions/generateDigest';
import { getDateKey } from '../utils/date';

/**
 * Fetches the latest digest for today's date key for a given user.
 * Returns null if no digest exists for today.
 */
export async function fetchTodayDigest(uid: string): Promise<Digest | null> {
  const db = getFirestore();

  const todayKey = getDateKey();

  const digestQuery = query(
    collection(db, 'digestRecords'),
    where('uid', '==', uid),
    where('dateKey', '==', todayKey),
    limit(1),
  );

  const snapshot = await getDocs(digestQuery);

  if (snapshot.empty) {
    return null;
  }

  return snapshot.docs[0].data() as Digest;
}
