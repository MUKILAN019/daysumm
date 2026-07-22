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

    DROP TABLE IF EXISTS widget_cache;

    CREATE TABLE IF NOT EXISTS widget_cache_v2 (
      uid TEXT PRIMARY KEY NOT NULL,
      todayEntryCount INTEGER NOT NULL DEFAULT 0,
      currentStreak INTEGER NOT NULL DEFAULT 0,
      lastEntryPreview TEXT NOT NULL DEFAULT ''
    );
  `);
}

export async function insertEntry(text: string, source: EntrySource, uid: string) {
  await initDb();

  const db = await getDb();
  const entry: LocalEntry = {
    uid,
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

export async function getTodayEntries(uid: string) {
  await initDb();

  const db = await getDb();
  
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  const rows = await db.getAllAsync<EntryRow>(`
    SELECT localId, uid, text, createdAt, source, synced
    FROM entries
    WHERE uid = ? AND createdAt >= ?
    ORDER BY createdAt DESC
  `,
  uid,
  startOfDay.toISOString()
  );

  return rows.map<LocalEntry>((row) => ({
    ...row,
    synced: row.synced === 1,
  }));
}

export async function getUnsyncedEntries(uid: string) {
  await initDb();

  const db = await getDb();
  const rows = await db.getAllAsync<EntryRow>(`
    SELECT localId, uid, text, createdAt, source, synced
    FROM entries
    WHERE synced = 0 AND uid = ?
    ORDER BY createdAt ASC
  `,
  uid
  );

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

export async function setWidgetCache(uid: string, data: WidgetCacheData) {
  await initDb();

  const db = await getDb();

  await db.runAsync(
    `
      INSERT INTO widget_cache_v2 (
        uid,
        todayEntryCount,
        currentStreak,
        lastEntryPreview
      )
      VALUES (?, ?, ?, ?)
      ON CONFLICT(uid)
      DO UPDATE SET
        todayEntryCount = excluded.todayEntryCount,
        currentStreak = excluded.currentStreak,
        lastEntryPreview = excluded.lastEntryPreview
    `,
    uid,
    data.todayEntryCount,
    data.currentStreak,
    data.lastEntryPreview,
  );
}

export async function getWidgetCache(uid: string): Promise<WidgetCacheData> {
  await initDb();

  const db = await getDb();

  const row = await db.getFirstAsync<WidgetCacheRow>(`
    SELECT
      todayEntryCount,
      currentStreak,
      lastEntryPreview
    FROM widget_cache_v2
    WHERE uid = ?
  `, uid);

  return (
    row ?? {
      todayEntryCount: 0,
      currentStreak: 0,
      lastEntryPreview: '',
    }
  );
}

export async function getTodayEntryCount(uid: string): Promise<number> {
  await initDb();

  const db = await getDb();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const row = await db.getFirstAsync<CountRow>(
    `
      SELECT COUNT(*) AS count
      FROM entries
      WHERE createdAt >= ? AND uid = ?
    `,
    startOfDay.toISOString(),
    uid
  );

  return row?.count ?? 0;
}

export async function getLatestEntryText(uid: string): Promise<string> {
  await initDb();

  const db = await getDb();

  const row = await db.getFirstAsync<LatestEntryRow>(`
    SELECT text
    FROM entries
    WHERE uid = ?
    ORDER BY createdAt DESC
    LIMIT 1
  `, uid);

  return row?.text ?? '';
}

export async function getHasSeenMilestone(milestone: number): Promise<boolean> {
  const value = await getSetting(`seenMilestone_${milestone}`);
  return value === '1';
}

export async function markMilestoneSeen(milestone: number): Promise<void> {
  await setSetting(`seenMilestone_${milestone}`, '1');
}

export async function cleanupOldLocalEntries(): Promise<void> {
  await initDb();
  
  const db = await getDb();
  
  // 24 hours ago
  const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  await db.runAsync(`
    DELETE FROM entries
    WHERE createdAt < ?
  `, cutoffTime);
}
