import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

import type { DigestRecord } from '../firestore/types';
import { syncEntries } from '../sync/queue';

export type Digest = DigestRecord;

export async function generateDigest(): Promise<Digest> {
  // Flush all pending local entries to Firestore so the server sees recent saves
  try {
    await syncEntries();
  } catch (error) {
    console.warn('Pre-digest sync failed, generating digest with existing synced entries', error);
  }

  const functions = getFunctions();
  const callable = httpsCallable<{ data?: unknown }, { digest?: Digest }>(functions, 'generateDigest');
  const result = await callable({ data: {} });

  if (!result.data?.digest) {
    throw new Error('Digest generation returned no digest data.');
  }

  return result.data.digest;
}

