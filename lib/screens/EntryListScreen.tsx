import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DigestCard } from '../components/DigestCard';
import {
  getAllEntries,
  getHasSeenSampleDigest,
  markSampleDigestSeen,
  type LocalEntry,
} from '../db/entries';
import { generateDigest, type Digest } from '../functions/generateDigest';

const sampleDigest: Digest = {
  uid: 'sample',
  date: new Date().toISOString(),
  headline: 'Daily digest preview',
  highlights: [
    'Captured the most important notes from busy work today',
    'Turned scattered updates into a clear summary',
    'Prepared action items for tomorrow',
  ],
  actionItems: [
    'Follow up on the top priority task',
    'Share the update with your team',
  ],
  decisions: [
    'Confirmed next sprint milestone and timeline',
  ],
  blockers: [
    'Waiting on review feedback to move forward',
  ],
  statusUpdate:
    'Overall progress is strong; focus on the highest-value items and clear any blockers early.',
};

interface EntryListScreenProps {
  onBack: () => void;
  refreshKey: number;
}

export function EntryListScreen({ onBack, refreshKey }: EntryListScreenProps) {
  const [entries, setEntries] = useState<LocalEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [digest, setDigest] = useState<Digest | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSampleDigest, setShowSampleDigest] = useState(false);

  async function loadEntries() {
    const localEntries = await getAllEntries();
    setEntries(localEntries);
  }

  useEffect(() => {
    async function loadScreen() {
      await loadEntries();

      const hasSeenSample = await getHasSeenSampleDigest();
      if (!hasSeenSample) {
        setShowSampleDigest(true);
        await markSampleDigestSeen();
      }
    }

    loadScreen().catch((error: unknown) => {
      console.warn('Failed to load entries', error);
    });
  }, [refreshKey]);

  async function handleGenerateNow() {
    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const nextDigest = await generateDigest();
      setDigest(nextDigest);
      await markSampleDigestSeen();
      setShowSampleDigest(false);
    } catch (error: unknown) {
      const err = error as { code?: string };
      if (err.code === 'functions/resource-exhausted') {
        setErrorMessage("You've used your 3 free digests today — upgrade for unlimited.");
      } else {
        console.warn('Digest generation failed', error);
        setErrorMessage('We could not generate a digest right now.');
      }
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Entries</Text>
      </View>

      <Text style={styles.subtitle}>All saved notes, newest first.</Text>

      <View style={styles.digestSection}>
        <View style={styles.digestHeaderRow}>
          <Text style={styles.digestTitle}>Today’s digest</Text>
          <Pressable
            accessibilityRole="button"
            disabled={isGenerating}
            onPress={handleGenerateNow}
            style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
          >
            <Text style={styles.generateButtonText}>{isGenerating ? 'Generating…' : 'Generate now'}</Text>
          </Pressable>
        </View>

        {isGenerating ? (
          <View style={styles.skeletonCard}>
            <View style={styles.skeletonHeadline} />
            <View style={styles.skeletonLine} />
            <View style={styles.skeletonLine} />
            <View style={styles.skeletonLine} />
            <View style={styles.skeletonLine} />
          </View>
        ) : showSampleDigest ? (
          <DigestCard digest={sampleDigest} />
        ) : digest ? (
          <DigestCard digest={digest} />
        ) : errorMessage ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Pressable accessibilityRole="button" onPress={handleGenerateNow} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {entries.length === 0 ? (
          <Text style={styles.emptyText}>No entries yet.</Text>
        ) : (
          entries.map((entry) => {
            const isExpanded = expandedId === entry.localId;
            const isSynced = entry.synced;

            return (
              <View key={entry.localId} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setExpandedId((current) => (current === entry.localId ? null : entry.localId));
                    }}
                    style={styles.entryTextButton}
                  >
                    <Text style={styles.entryText} numberOfLines={isExpanded ? undefined : 2}>
                      {entry.text}
                    </Text>
                  </Pressable>

                  <View style={styles.statusBadge}>
                    <Text style={styles.statusIcon}>{isSynced ? '✓' : '○'}</Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>{formatRelativeTime(entry.createdAt)}</Text>
                  <Text style={styles.metaText}>{isSynced ? 'synced' : 'local only'}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function formatRelativeTime(createdAt: string) {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const diffMs = now - created;
  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMinutes < 1) {
    return 'just now';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);

  if (diffDays === 1) {
    return 'Yesterday';
  }

  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return new Date(created).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
    paddingHorizontal: 20,
    paddingTop: 56,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  backButtonText: {
    color: '#2563EB',
    fontSize: 15,
    fontWeight: '700',
  },
  title: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 14,
  },
  digestSection: {
    gap: 10,
  },
  digestHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  digestTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  generateButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
  },
  generateButtonDisabled: {
    opacity: 0.7,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  skeletonCard: {
    gap: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  skeletonHeadline: {
    height: 20,
    width: '70%',
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
  },
  skeletonLine: {
    height: 12,
    width: '100%',
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  errorCard: {
    gap: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    lineHeight: 20,
  },
  retryButton: {
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: 10,
    paddingBottom: 24,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 15,
  },
  entryCard: {
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  entryTextButton: {
    flex: 1,
  },
  entryText: {
    color: '#111827',
    fontSize: 15,
    lineHeight: 21,
  },
  statusBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
  },
  statusIcon: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  metaText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
});
