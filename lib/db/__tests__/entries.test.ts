import { describe, it, expect } from '@jest/globals';
import { mapEntryRowToLocalEntry } from '../entries';

describe('mapEntryRowToLocalEntry', () => {
  it('correctly maps numeric boolean flags and JSON tags', () => {
    const row = {
      uid: 'user_123',
      text: 'Finished API integration',
      createdAt: '2026-09-06T10:00:00Z',
      source: 'text' as const,
      localId: 'loc_001',
      synced: 1,
      textEn: 'Finished API integration',
      tags: JSON.stringify(['highlight', 'decision']),
      confidence: 0.95,
      classifierVersion: 1,
      userCorrected: 0,
      needsReview: 0,
      deleted: 0,
    };

    const entry = mapEntryRowToLocalEntry(row);

    expect(entry.synced).toBe(true);
    expect(entry.userCorrected).toBe(false);
    expect(entry.needsReview).toBe(false);
    expect(entry.deleted).toBe(false);
    expect(entry.tags).toEqual(['highlight', 'decision']);
    expect(entry.textEn).toBe('Finished API integration');
    expect(entry.confidence).toBe(0.95);
  });

  it('handles null tags, null textEn, and zero boolean flags', () => {
    const row = {
      uid: 'user_123',
      text: 'Voice note recorded offline',
      createdAt: '2026-09-06T11:00:00Z',
      source: 'voice' as const,
      localId: 'loc_002',
      synced: 0,
      textEn: null,
      tags: null,
      confidence: null,
      classifierVersion: null,
      userCorrected: 1,
      needsReview: 1,
      deleted: 1,
    };

    const entry = mapEntryRowToLocalEntry(row);

    expect(entry.synced).toBe(false);
    expect(entry.userCorrected).toBe(true);
    expect(entry.needsReview).toBe(true);
    expect(entry.deleted).toBe(true);
    expect(entry.tags).toBeUndefined();
    expect(entry.textEn).toBeUndefined();
    expect(entry.confidence).toBeUndefined();
  });
});
