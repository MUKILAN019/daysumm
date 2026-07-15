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

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS widget_cache (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      todayEntryCount INTEGER NOT NULL DEFAULT 0,
      currentStreak INTEGER NOT NULL DEFAULT 0,
      lastEntryPreview TEXT NOT NULL DEFAULT ''
    );
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

export async function getUnsyncedEntries() {
  await initDb();

  const db = await getDb();
  const rows = await db.getAllAsync<EntryRow>(`
    SELECT localId, uid, text, createdAt, source, synced
    FROM entries
    WHERE synced = 0
    ORDER BY createdAt ASC
  `);

  return rows.map<LocalEntry>((row) => ({
    ...row,
    synced: row.synced === 1,
  }));
}

export async function markEntrySynced(localId: string, uid: string) {
  await initDb();

  const db = await getDb();

  await db.runAsync(
    `
      UPDATE entries
      SET synced = 1, uid = ?
      WHERE localId = ?
    `,
    uid,
    localId,
  );
}

interface SettingRow {
  key: string;
  value: string;
}

export interface WidgetCacheData {
  todayEntryCount: number;
  currentStreak: number;
  lastEntryPreview: string;
}

interface WidgetCacheRow {
  todayEntryCount: number;
  currentStreak: number;
  lastEntryPreview: string;
}

interface CountRow {
  count: number;
}

interface LatestEntryRow {
  text: string;
}

async function getSetting(key: string): Promise<string | null> {
  await initDb();

  const db = await getDb();
  const rows = await db.getAllAsync<SettingRow>(`
    SELECT value
    FROM settings
    WHERE key = ?
    LIMIT 1
  `,
  key);

  return rows.length > 0 ? rows[0].value : null;
}

async function setSetting(key: string, value: string) {
  await initDb();

  const db = await getDb();
  await db.runAsync(
    `
      INSERT OR REPLACE INTO settings (key, value)
      VALUES (?, ?)
    `,
    key,
    value,
  );
}

export async function getHasSeenSampleDigest() {
  const settingValue = await getSetting('seenSampleDigest');
  return settingValue === '1';
}

export async function markSampleDigestSeen() {
  await setSetting('seenSampleDigest', '1');
}

export async function setWidgetCache(data: WidgetCacheData) {
  await initDb();

  const db = await getDb();

  await db.runAsync(
    `
      INSERT INTO widget_cache (
        id,
        todayEntryCount,
        currentStreak,
        lastEntryPreview
      )
      VALUES (1, ?, ?, ?)
      ON CONFLICT(id)
      DO UPDATE SET
        todayEntryCount = excluded.todayEntryCount,
        currentStreak = excluded.currentStreak,
        lastEntryPreview = excluded.lastEntryPreview
    `,
    data.todayEntryCount,
    data.currentStreak,
    data.lastEntryPreview,
  );
}

export async function getWidgetCache(): Promise<WidgetCacheData> {
  await initDb();

  const db = await getDb();

  const row = await db.getFirstAsync<WidgetCacheRow>(`
    SELECT
      todayEntryCount,
      currentStreak,
      lastEntryPreview
    FROM widget_cache
    WHERE id = 1
  `);

  return (
    row ?? {
      todayEntryCount: 0,
      currentStreak: 0,
      lastEntryPreview: '',
    }
  );
}

export async function getTodayEntryCount(): Promise<number> {
  await initDb();

  const db = await getDb();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const row = await db.getFirstAsync<CountRow>(
    `
      SELECT COUNT(*) AS count
      FROM entries
      WHERE createdAt >= ?
    `,
    startOfDay.toISOString(),
  );

  return row?.count ?? 0;
}

export async function getLatestEntryText(): Promise<string> {
  await initDb();

  const db = await getDb();

  const row = await db.getFirstAsync<LatestEntryRow>(`
    SELECT text
    FROM entries
    ORDER BY createdAt DESC
    LIMIT 1
  `);

  return row?.text ?? '';
}
