import { getFirestore, doc, getDoc } from '@react-native-firebase/firestore';

import type { Digest } from '../functions/generateDigest';

export async function fetchDigestRecordById(digestRecordId: string): Promise<Digest | null> {
  const db = getFirestore();
  const snapshot = await getDoc(doc(db, 'digestRecords', digestRecordId));

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as Digest;
}