import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator } from 'react-native';

import { DigestCard } from '../components/DigestCard';
import { fetchDigestHistory, type DigestHistoryEntry } from '../firestore/digestHistory';

interface DigestHistoryScreenProps {
  uid: string;
  onBack: () => void;
  onUpgradePress: () => void;
  maxDaysBack?: number;
  isPro?: boolean;
}

function formatDateKey(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00`);
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function getTodayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function DigestHistoryScreen({ uid, onBack, onUpgradePress, maxDaysBack = 30, isPro = false }: DigestHistoryScreenProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [digestsByDate, setDigestsByDate] = useState<Record<string, DigestHistoryEntry>>({});
  const [selectedDateKey, setSelectedDateKey] = useState(getTodayDateKey());
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);

    fetchDigestHistory(uid, maxDaysBack)
      .then((entries) => {
        if (isCancelled) return;
        const map: Record<string, DigestHistoryEntry> = {};
        for (const entry of entries) {
          map[entry.dateKey] = entry;
        }
        setDigestsByDate(map);
      })
      .catch((error: unknown) => {
        console.warn('Failed to fetch digest history', error);
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [uid, maxDaysBack]);

  function handleDatePress(dateKey: string, indexFromToday: number) {
  if (!isPro && indexFromToday >= 3) {
    setShowUpgradePrompt(true);
    return;
  }
  setSelectedDateKey(dateKey);
}

  // Build the strip: today first, going backward — matches how people scan a
  // recent history (most relevant on the left), independent of what has data.
  const dateStrip = useMemo(() => {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 0; i < maxDaysBack; i += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      dates.push(date.toISOString().slice(0, 10));
    }
    return dates;
  }, [maxDaysBack]);

  const selectedDigest = digestsByDate[selectedDateKey];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>History</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateStrip}
      >
        {dateStrip.map((dateKey, index) => {
          const isSelected = dateKey === selectedDateKey;
          const hasDigest = Boolean(digestsByDate[dateKey]);
          const isLocked = !isPro && index >= 3;

          return (
            <Pressable
              key={dateKey}
              accessibilityRole="button"
              onPress={() => handleDatePress(dateKey, index)}
              style={[styles.dateChip, isSelected && styles.dateChipSelected, isLocked && styles.dateChipLocked]}
            >
              <Text style={[styles.dateChipText, isSelected && styles.dateChipTextSelected]}>
                {formatDateKey(dateKey)}
              </Text>
              {isLocked ? <Text style={styles.lockIcon}>🔒</Text> : hasDigest && <View style={[styles.dot, isSelected && styles.dotSelected]} />}
            </Pressable>
          );
        })}
      </ScrollView>

      {showUpgradePrompt && (
        <View style={styles.upgradeBanner}>
          <Text style={styles.upgradeBannerText}>Pro unlocks 30 days of history</Text>
          <Pressable accessibilityRole="button" onPress={onUpgradePress} style={styles.upgradeBannerButton}>
            <Text style={styles.upgradeBannerButtonText}>Upgrade</Text>
          </Pressable>
        </View>
      )}

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        ) : selectedDigest ? (
          <DigestCard digest={selectedDigest} />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No digest for this day.</Text>
            <Text style={styles.emptyStateSubtext}>
              You may not have used the app that day, or the digest hasn't generated yet.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA', paddingTop: 56, gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20 },
  backButton: { paddingVertical: 6, paddingHorizontal: 8 },
  backButtonText: { color: '#2563EB', fontSize: 15, fontWeight: '700' },
  title: { color: '#111827', fontSize: 24, fontWeight: '700' },
  dateStrip: { paddingHorizontal: 20, gap: 8 },
  dateChip: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 84,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  dateChipSelected: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  dateChipText: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
  dateChipTextSelected: { color: '#2563EB' },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#D1D5DB' },
  dotSelected: { backgroundColor: '#2563EB' },
  dateChipLocked: { opacity: 0.5 },
  lockIcon: { fontSize: 11 },
  upgradeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 20,
  },
  upgradeBannerText: { fontSize: 13, fontWeight: '600', color: '#92400E', flex: 1 },
  upgradeBannerButton: { backgroundColor: '#2563EB', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
  upgradeBannerButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  content: { flex: 1 },
  contentInner: { paddingHorizontal: 20, paddingBottom: 24 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 8,
    paddingHorizontal: 24,
  },
  emptyStateText: { fontSize: 16, fontWeight: '700', color: '#111827', textAlign: 'center' },
  emptyStateSubtext: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
});