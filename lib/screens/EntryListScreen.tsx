import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getAllEntries, type LocalEntry } from '../db/entries';

interface EntryListScreenProps {
  onBack: () => void;
  refreshKey: number;
}

export function EntryListScreen({ onBack, refreshKey }: EntryListScreenProps) {
  const [entries, setEntries] = useState<LocalEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function loadEntries() {
    const localEntries = await getAllEntries();
    setEntries(localEntries);
  }

  useEffect(() => {
    loadEntries().catch((error: unknown) => {
      console.warn('Failed to load entries', error);
    });
  }, [refreshKey]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Entries</Text>
      </View>

      <Text style={styles.subtitle}>All saved notes, newest first.</Text>

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
