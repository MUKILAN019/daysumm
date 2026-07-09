import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

import type { DigestRecord } from '../firestore/types';

export type Digest = DigestRecord;

export async function generateDigest(): Promise<Digest> {
  const functions = getFunctions();
  const callable = httpsCallable<{ data?: unknown }, { digest?: Digest }>(functions, 'generateDigest');
  const result = await callable({ data: {} });

  if (!result.data?.digest) {
    throw new Error('Digest generation returned no digest data.');
  }

  return result.data.digest;
}
