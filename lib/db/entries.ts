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
  textEn?: string;
  tags?: string[];
  confidence?: number;
  classifierVersion?: number;
  userCorrected?: boolean;
  needsReview?: boolean;
  deleted?: boolean;
}

interface EntryRow {
  uid: string | null;
  text: string;
  createdAt: string;
  source: EntrySource;
  localId: string;
  synced: number;
  textEn: string | null;
  tags: string | null;
  confidence: number | null;
  classifierVersion: number | null;
  userCorrected: number | null;
  needsReview: number | null;
  deleted: number | null;
}

export function mapEntryRowToLocalEntry(row: EntryRow): LocalEntry {
  return {
    ...row,
    synced: row.synced === 1,
    textEn: row.textEn ?? undefined,
    tags: row.tags ? JSON.parse(row.tags) : undefined,
    confidence: row.confidence ?? undefined,
    classifierVersion: row.classifierVersion ?? undefined,
    userCorrected: row.userCorrected === 1,
    needsReview: row.needsReview === 1,
    deleted: row.deleted === 1,
  };
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

  const pragmaResult = await db.getAllAsync<{ name: string }>('PRAGMA table_info(entries)');
  const columnNames = pragmaResult.map((row) => row.name);

  if (!columnNames.includes('textEn')) {
    await db.execAsync(`ALTER TABLE entries ADD COLUMN textEn TEXT;`);
  }
  if (!columnNames.includes('tags')) {
    await db.execAsync(`ALTER TABLE entries ADD COLUMN tags TEXT;`);
  }
  if (!columnNames.includes('confidence')) {
    await db.execAsync(`ALTER TABLE entries ADD COLUMN confidence REAL;`);
  }
  if (!columnNames.includes('classifierVersion')) {
    await db.execAsync(`ALTER TABLE entries ADD COLUMN classifierVersion INTEGER;`);
  }
  if (!columnNames.includes('userCorrected')) {
    await db.execAsync(`ALTER TABLE entries ADD COLUMN userCorrected INTEGER DEFAULT 0;`);
  }
  if (!columnNames.includes('needsReview')) {
    await db.execAsync(`ALTER TABLE entries ADD COLUMN needsReview INTEGER DEFAULT 0;`);
  }
  if (!columnNames.includes('deleted')) {
    await db.execAsync(`ALTER TABLE entries ADD COLUMN deleted INTEGER DEFAULT 0;`);
  }
}

export async function insertEntry(text: string, source: EntrySource, uid: string, textEn?: string) {
  await initDb();

  const db = await getDb();
  const entry: LocalEntry = {
    uid,
    text,
    createdAt: new Date().toISOString(),
    source,
    localId: createLocalId(),
    synced: false,
    textEn,
  };

  await db.runAsync(
    `
      INSERT INTO entries (localId, uid, text, createdAt, source, synced, textEn)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    entry.localId,
    entry.uid,
    entry.text,
    entry.createdAt,
    entry.source,
    entry.synced ? 1 : 0,
    entry.textEn ?? null,
  );

  return entry;
}

export async function getTodayEntries(uid: string) {
  await initDb();

  const db = await getDb();
  
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  const rows = await db.getAllAsync<EntryRow>(`
    SELECT *
    FROM entries
    WHERE uid = ? AND createdAt >= ? AND deleted = 0
    ORDER BY createdAt DESC
  `,
  uid,
  startOfDay.toISOString()
  );

  return rows.map(mapEntryRowToLocalEntry);
}

export async function getUnsyncedEntries(uid: string) {
  await initDb();

  const db = await getDb();
  const rows = await db.getAllAsync<EntryRow>(`
    SELECT *
    FROM entries
    WHERE synced = 0 AND uid = ? AND deleted = 0
    ORDER BY createdAt ASC
  `,
  uid
  );

  return rows.map(mapEntryRowToLocalEntry);
}

export async function getPendingDeletedEntries(uid: string) {
  await initDb();

  const db = await getDb();
  const rows = await db.getAllAsync<EntryRow>(`
    SELECT *
    FROM entries
    WHERE synced = 0 AND uid = ? AND deleted = 1
    ORDER BY createdAt ASC
  `,
  uid
  );

  return rows.map(mapEntryRowToLocalEntry);
}

export async function isEntryActive(localId: string, uid: string): Promise<boolean> {
  await initDb();

  const db = await getDb();
  const row = await db.getFirstAsync<{ deleted: number | null }>(
    `
      SELECT deleted
      FROM entries
      WHERE localId = ? AND uid = ?
      LIMIT 1
    `,
    localId,
    uid,
  );

  return Boolean(row && row.deleted !== 1);
}

export async function getUnclassifiedEntries(uid: string) {
  await initDb();

  const db = await getDb();
  const rows = await db.getAllAsync<EntryRow>(`
    SELECT *
    FROM entries
    WHERE tags IS NULL AND uid = ? AND deleted = 0
    ORDER BY createdAt ASC
  `,
  uid
  );

  return rows.map(mapEntryRowToLocalEntry);
}

export async function updateEntryClassification(
  localId: string,
  uid: string,
  tags: string[],
  confidence: number,
  classifierVersion: number,
  textEn?: string,
  userCorrected = false,
  needsReview = false,
) {
  await initDb();
  const db = await getDb();

  // For background classifications (userCorrected = false), we only update if the user
  // hasn't already corrected the entry manually. This prevents stale in-flight
  // classifications from overwriting user edits.
  const whereClause = userCorrected 
    ? 'WHERE localId = ? AND uid = ? AND deleted = 0' 
    : 'WHERE localId = ? AND uid = ? AND userCorrected = 0 AND deleted = 0';

  await db.runAsync(
    `
      UPDATE entries
      SET tags = ?, confidence = ?, classifierVersion = ?, userCorrected = ?, needsReview = ?, synced = 0${textEn ? ', textEn = ?' : ''}
      ${whereClause}
    `,
    ...(textEn 
      ? [JSON.stringify(tags), confidence, classifierVersion, userCorrected ? 1 : 0, needsReview ? 1 : 0, textEn, localId, uid] 
      : [JSON.stringify(tags), confidence, classifierVersion, userCorrected ? 1 : 0, needsReview ? 1 : 0, localId, uid])
  );
}

export async function softDeleteEntry(localId: string, uid: string) {
  await initDb();

  const db = await getDb();

  await db.runAsync(
    `
      UPDATE entries
      SET deleted = 1
      WHERE localId = ? AND uid = ?
    `,
    localId,
    uid,
  );
}

export async function restoreSoftDeletedEntry(localId: string, uid: string) {
  await initDb();

  const db = await getDb();

  await db.runAsync(
    `
      UPDATE entries
      SET deleted = 0
      WHERE localId = ? AND uid = ?
    `,
    localId,
    uid,
  );
}

export async function markEntryDeletionPending(localId: string, uid: string) {
  await initDb();

  const db = await getDb();

  await db.runAsync(
    `
      UPDATE entries
      SET synced = 0
      WHERE localId = ? AND uid = ? AND deleted = 1
    `,
    localId,
    uid,
  );
}

export async function hardDeleteLocalEntry(localId: string, uid: string) {
  await initDb();

  const db = await getDb();

  await db.runAsync(
    `
      DELETE FROM entries
      WHERE localId = ? AND uid = ?
    `,
    localId,
    uid,
  );
}

export async function updateEntryText(
  localId: string,
  uid: string,
  newText: string
) {
  await initDb();
  const db = await getDb();

  // Clears classification data (Case B)
  await db.runAsync(
    `
      UPDATE entries
      SET text = ?, tags = NULL, confidence = NULL, textEn = NULL, classifierVersion = NULL, userCorrected = 0, needsReview = 0, synced = 0
      WHERE localId = ? AND uid = ?
    `,
    newText,
    localId,
    uid
  );
}

export async function updateEntryTextAndTags(
  localId: string,
  uid: string,
  newText: string,
  tags: string[],
  textEn?: string
) {
  await initDb();
  const db = await getDb();

  // Updates text and sets user tags (Case A). Confidence is 1.0. User corrected, so no review needed.
  await db.runAsync(
    `
      UPDATE entries
      SET text = ?, tags = ?, confidence = 1.0, userCorrected = 1, needsReview = 0, synced = 0${textEn ? ', textEn = ?' : ''}
      WHERE localId = ? AND uid = ?
    `,
    ...(textEn 
      ? [newText, JSON.stringify(tags), textEn, localId, uid]
      : [newText, JSON.stringify(tags), localId, uid])
  );
}

export async function markEntryUserCorrected(localId: string, uid: string) {
  await initDb();
  const db = await getDb();

  // No-op save: User confirmed entry is fine as-is.
  await db.runAsync(
    `
      UPDATE entries
      SET userCorrected = 1, needsReview = 0, synced = 0
      WHERE localId = ? AND uid = ?
    `,
    localId,
    uid
  );
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
      WHERE createdAt >= ? AND uid = ? AND deleted = 0
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
    WHERE uid = ? AND deleted = 0
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

export async function cleanupOldLocalEntries(uid?: string): Promise<void> {
  await initDb();
  
  const db = await getDb();
  
  // 24 hours ago
  const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  if (uid) {
    // Scope to the current user so we don't accidentally remove another
    // account's unsynced entries on a shared / multi-account device.
    await db.runAsync(`
      DELETE FROM entries
      WHERE createdAt < ? AND uid = ?
    `, cutoffTime, uid);
  } else {
    await db.runAsync(`
      DELETE FROM entries
      WHERE createdAt < ?
    `, cutoffTime);
  }
}
