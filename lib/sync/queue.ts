import { getAuth } from '@react-native-firebase/auth';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import {
  doc,
  getFirestore,
  setDoc,
  Timestamp,
} from '@react-native-firebase/firestore';

import {
  getUnsyncedEntries,
  markEntrySynced,
  getUnclassifiedEntries,
  updateEntryClassification,
  type LocalEntry,
} from '../db/entries';
import type { Entry } from '../firestore/types';

export async function getPendingSyncEntries(uid: string): Promise<LocalEntry[]> {
  return getUnsyncedEntries(uid);
}

export interface SyncEntriesResult {
  attempted: number;
  synced: number;
  failed: number;
}

let syncInFlight: Promise<SyncEntriesResult> | null = null;

export async function syncEntries(): Promise<SyncEntriesResult> {
  if (syncInFlight) {
    return syncInFlight;
  }

  syncInFlight = syncEntriesBatch().finally(() => {
    syncInFlight = null;
  });

  return syncInFlight;
}

async function syncEntriesBatch(): Promise<SyncEntriesResult> {
  const user = getAuth().currentUser;

  if (!user) {
    console.log('Sync skipped: no authenticated user');
    return {
      attempted: 0,
      synced: 0,
      failed: 0,
    };
  }

  // Pre-sync classification step
  await classifyPendingEntriesBatch(user.uid);

  const pendingEntries = await getPendingSyncEntries(user.uid);

  if (pendingEntries.length === 0) {
    console.log('Sync skipped: no pending entries');
    return {
      attempted: 0,
      synced: 0,
      failed: 0,
    };
  }

  console.log(`Syncing ${pendingEntries.length} pending entries`);
  const db = getFirestore();
  const result: SyncEntriesResult = {
    attempted: pendingEntries.length,
    synced: 0,
    failed: 0,
  };

  for (const entry of pendingEntries) {
    try {
      const firestoreEntry: Entry = {
        uid: user.uid,
        text: entry.text,
        createdAt: Timestamp.fromDate(new Date(entry.createdAt)),
        source: entry.source,
        localId: entry.localId,
        ...(entry.textEn != null && { textEn: entry.textEn }),
        ...(entry.tags != null && { tags: entry.tags }),
        ...(entry.confidence != null && { confidence: entry.confidence }),
        ...(entry.classifierVersion != null && { classifierVersion: entry.classifierVersion }),
        ...(entry.userCorrected != null && { userCorrected: entry.userCorrected }),
      };

      await setDoc(doc(db, 'entries', entry.localId), firestoreEntry);
      await markEntrySynced(entry.localId, user.uid);
      result.synced += 1;
    } catch (error) {
      result.failed += 1;
      console.warn('Entry sync failed', entry.localId, error);
    }
  }

  console.log('Sync complete', result);
  return result;
}

async function classifyPendingEntriesBatch(uid: string) {
  const unclassified = await getUnclassifiedEntries(uid);
  if (unclassified.length === 0) return;

  console.log(`Classifying ${unclassified.length} pending entries`);
  
  const entriesToClassify = unclassified.map(e => ({
    localId: e.localId,
    text: e.text,
    textEn: e.textEn,
  }));

  try {
    const functions = getFunctions();
    const callable = httpsCallable(functions, 'classifyEntries');
    const result = await callable({ entries: entriesToClassify });
    const { results } = result.data as { results: any[] };

    if (Array.isArray(results)) {
      for (const res of results) {
        if (res && res.localId && res.tags) {
          await updateEntryClassification(
            res.localId,
            uid,
            res.tags,
            res.confidence ?? 0,
            res.classifierVersion ?? 1,
            res.textEn
          );
        }
      }
    }
  } catch (error) {
    console.warn('Classification sync step failed', error);
  }
}
