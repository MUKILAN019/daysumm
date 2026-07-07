import * as SQLite from 'expo-sqlite';

import type { EntrySource } from '../firestore/types';

const DATABASE_NAME = 'daysumm.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export interface LocalEntry {
  uid: string | null;
  text: string;
  createdAt: string;
  source: EntrySource;
  localId: string;
  synced: boolean;
}

interface EntryRow {
  uid: string | null;
  text: string;
  createdAt: string;
  source: EntrySource;
  localId: string;
  synced: number;
}

function createLocalId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;

    return value.toString(16);
  });
}

async function getDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  }

  return dbPromise;
}

export async function initDb() {
  const db = await getDb();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS entries (
      localId TEXT PRIMARY KEY NOT NULL,
      uid TEXT,
      text TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      source TEXT NOT NULL CHECK (source IN ('text', 'voice')),
      synced INTEGER NOT NULL DEFAULT 0 CHECK (synced IN (0, 1))
    );

    CREATE INDEX IF NOT EXISTS idx_entries_createdAt
      ON entries (createdAt DESC);

    CREATE INDEX IF NOT EXISTS idx_entries_synced
      ON entries (synced);
  `);
}

export async function insertEntry(text: string, source: EntrySource) {
  await initDb();

  const db = await getDb();
  const entry: LocalEntry = {
    uid: null,
    text,
    createdAt: new Date().toISOString(),
    source,
    localId: createLocalId(),
    synced: false,
  };

  await db.runAsync(
    `
      INSERT INTO entries (localId, uid, text, createdAt, source, synced)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    entry.localId,
    entry.uid,
    entry.text,
    entry.createdAt,
    entry.source,
    entry.synced ? 1 : 0,
  );

  return entry;
}

export async function getAllEntries() {
  await initDb();

  const db = await getDb();
  const rows = await db.getAllAsync<EntryRow>(`
    SELECT localId, uid, text, createdAt, source, synced
    FROM entries
    ORDER BY createdAt DESC
  `);

  return rows.map<LocalEntry>((row) => ({
    ...row,
    synced: row.synced === 1,
  }));
}
