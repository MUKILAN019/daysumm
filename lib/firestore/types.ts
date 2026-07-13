import type {
  FieldValue,
  Timestamp,
} from '@react-native-firebase/firestore';

export type EntrySource = 'text' | 'voice';

export interface Entry {
  uid: string;
  text: string;
  createdAt: Timestamp | FieldValue;
  source: EntrySource;
  localId: string;
}

export interface DigestRecord {
  uid: string;
  date: string;
  headline: string;
  highlights: string[];
  actionItems: string[];
  decisions: string[];
  blockers: string[];
  statusUpdate: string;
}

export interface UserStats {
  currentStreak: number;
  longestStreak: number;
  lastEntryDate: string;
}

export interface DailyUsage {
  uid: string;
  date: string;
  digestCount: number;
}

export interface UserSettings {
  role?: string;
  timezone?: string;
  onboardingComplete?: boolean;
}