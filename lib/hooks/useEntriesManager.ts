import { useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { getAuth } from '@react-native-firebase/auth';
import {
  getTodayEntries,
  insertEntry,
  softDeleteEntry,
  restoreSoftDeletedEntry,
  markEntryDeletionPending,
  hardDeleteLocalEntry,
  updateEntryTextAndTags,
  markEntryUserCorrected,
  type LocalEntry,
} from '../db/entries';
import { syncEntries, syncPendingDeletedEntries } from '../sync/queue';
import { refreshWidgetData } from '../widgets/refreshWidget';
import { transcribeAudio, TranscriptionTimeoutError, TranscriptionOfflineError } from '../functions/transcribeAudio';

const SYNC_DEBOUNCE_MS = 10 * 1000;
const DELETE_UNDO_MS = 4500;

export function useEntriesManager() {
  const [entries, setEntries] = useState<LocalEntry[]>([]);
  const [entriesRefreshVersion, setEntriesRefreshVersion] = useState(0);
  const [savedMessage, setSavedMessage] = useState('');
  const [deletedEntryToast, setDeletedEntryToast] = useState<LocalEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<LocalEntry | null>(null);

  const syncDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deleteUndoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDeleteRef = useRef<LocalEntry | null>(null);

  async function loadEntries() {
    const uid = getAuth().currentUser?.uid;
    if (!uid) {
      setEntries([]);
      return;
    }
    const localEntries = await getTodayEntries(uid);
    setEntries(localEntries);
  }

  async function refreshEntries() {
    await loadEntries();
    setEntriesRefreshVersion((prev) => prev + 1);
  }

  async function runSync(reason: string) {
    try {
      const networkState = await NetInfo.fetch();
      const isOnline =
        networkState.isConnected === true && networkState.isInternetReachable !== false;

      if (!isOnline) {
        await loadEntries();
        setEntriesRefreshVersion((prev) => prev + 1);
        return;
      }

      await syncEntries();
      await loadEntries();
      setEntriesRefreshVersion((prev) => prev + 1);
    } catch (error) {
      console.warn(`Sync ${reason} failed`, error);
    }
  }

  function scheduleDebouncedSync(reason: string) {
    if (syncDebounceTimerRef.current) {
      clearTimeout(syncDebounceTimerRef.current);
    }
    syncDebounceTimerRef.current = setTimeout(() => {
      syncDebounceTimerRef.current = null;
      runSync(reason);
    }, SYNC_DEBOUNCE_MS);
  }

  function flushDebouncedSync() {
    if (syncDebounceTimerRef.current) {
      clearTimeout(syncDebounceTimerRef.current);
      syncDebounceTimerRef.current = null;
      runSync('debounce-flush');
    }
  }

  async function handleSaveText(textToSave: string) {
    const trimmedText = textToSave.trim();
    if (!trimmedText) return;

    const uid = getAuth().currentUser?.uid;
    if (!uid) return;

    await insertEntry(trimmedText, 'text', uid);
    await refreshEntries();

    setSavedMessage('Entry saved!');
    scheduleDebouncedSync('text-save');

    await refreshWidgetData(uid);
    setTimeout(() => {
      setSavedMessage('');
    }, 3500);
  }

  async function handleRecordFinished(uri: string) {
    const uid = getAuth().currentUser?.uid;
    if (!uid) return;

    try {
      const { text, textEn } = await transcribeAudio(uri);
      const trimmedText = text.trim();
      if (!trimmedText) {
        setSavedMessage('No speech detected in recording.');
        setTimeout(() => setSavedMessage(''), 3500);
        return;
      }

      await insertEntry(trimmedText, 'voice', uid, textEn);
      await refreshEntries();
      scheduleDebouncedSync('voice-save');
      await refreshWidgetData(uid);
      setSavedMessage('Voice note saved & transcribed!');
      setTimeout(() => setSavedMessage(''), 3500);
    } catch (error) {
      console.warn('Voice transcription failed/timed out, saving fallback voice entry', error);
      const isTimeout = error instanceof TranscriptionTimeoutError;
      const isOffline = error instanceof TranscriptionOfflineError;

      const fallbackText = '[Voice Entry - Saved Offline] Tap to edit or transcribe.';
      const fallbackEntry = await insertEntry(fallbackText, 'voice', uid);
      await markEntryUserCorrected(fallbackEntry.localId, uid);
      await refreshEntries();
      await refreshWidgetData(uid);

      if (isOffline) {
        setSavedMessage('Offline: Voice note saved! Tap to edit or transcribe later.');
      } else if (isTimeout) {
        setSavedMessage('Transcription timed out. Voice note saved safely locally!');
      } else {
        setSavedMessage('Cloud transcription failed. Voice note saved safely locally!');
      }
      setTimeout(() => setSavedMessage(''), 5000);
    }
  }

  async function finalizePendingDelete(entry: LocalEntry, uid: string) {
    try {
      if (entry.synced) {
        await markEntryDeletionPending(entry.localId, uid);
        const networkState = await NetInfo.fetch();
        const isOnline =
          networkState.isConnected === true && networkState.isInternetReachable !== false;

        if (isOnline) {
          await syncPendingDeletedEntries();
          await refreshEntries();
        }
      } else {
        await hardDeleteLocalEntry(entry.localId, uid);
      }
      await refreshWidgetData(uid);
    } catch (error) {
      console.warn('Entry delete finalize failed', error);
    }
  }

  async function handleSoftDelete(entry: LocalEntry) {
    const uid = getAuth().currentUser?.uid;
    if (!uid) return;

    if (pendingDeleteRef.current && pendingDeleteRef.current.localId !== entry.localId) {
      if (deleteUndoTimerRef.current) {
        clearTimeout(deleteUndoTimerRef.current);
        deleteUndoTimerRef.current = null;
      }
      const prev = pendingDeleteRef.current;
      pendingDeleteRef.current = null;
      await finalizePendingDelete(prev, uid);
    }

    await softDeleteEntry(entry.localId, uid);
    await refreshEntries();
    await refreshWidgetData(uid);

    pendingDeleteRef.current = entry;
    setDeletedEntryToast(entry);

    if (deleteUndoTimerRef.current) {
      clearTimeout(deleteUndoTimerRef.current);
    }

    deleteUndoTimerRef.current = setTimeout(async () => {
      deleteUndoTimerRef.current = null;
      const target = pendingDeleteRef.current;
      pendingDeleteRef.current = null;
      setDeletedEntryToast(null);

      if (target) {
        await finalizePendingDelete(target, uid);
      }
    }, DELETE_UNDO_MS);
  }

  async function handleUndoDelete() {
    const target = pendingDeleteRef.current;
    if (!target) return;

    if (deleteUndoTimerRef.current) {
      clearTimeout(deleteUndoTimerRef.current);
      deleteUndoTimerRef.current = null;
    }

    pendingDeleteRef.current = null;
    setDeletedEntryToast(null);

    const uid = getAuth().currentUser?.uid;
    if (!uid) return;

    await restoreSoftDeletedEntry(target.localId, uid);
    await refreshEntries();
    await refreshWidgetData(uid);
  }

  return {
    entries,
    entriesRefreshVersion,
    savedMessage,
    setSavedMessage,
    deletedEntryToast,
    entryToDelete,
    setEntryToDelete,
    loadEntries,
    refreshEntries,
    handleSaveText,
    handleRecordFinished,
    handleSoftDelete,
    handleUndoDelete,
    scheduleDebouncedSync,
    flushDebouncedSync,
  };
}
