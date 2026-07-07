import { getAuth } from '@react-native-firebase/auth';
import {
  doc,
  getFirestore,
  setDoc,
  Timestamp,
} from '@react-native-firebase/firestore';

import {
  getUnsyncedEntries,
  markEntrySynced,
  type LocalEntry,
} from '../db/entries';
import type { Entry } from '../firestore/types';

export async function getPendingSyncEntries(): Promise<LocalEntry[]> {
  return getUnsyncedEntries();
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

  const pendingEntries = await getPendingSyncEntries();

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
