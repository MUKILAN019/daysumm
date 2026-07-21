import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
  Modal,
} from 'react-native';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radii } from '../theme/tokens';
import { fetchDigestHistory, type DigestHistoryEntry } from '../firestore/digestHistory';
import { DigestCard } from '../components/DigestCard';

interface DigestHistoryScreenProps {
  uid: string;
  onUpgradePress: () => void;
  maxDaysBack?: number;
  isPro?: boolean;
}

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getTodayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseDateKey(dateKey: string): { year: number; month: number; day: number } {
  const [y, m, d] = dateKey.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}

function daysAgo(dateKey: string): number {
  const todayMs = new Date(getTodayDateKey() + 'T00:00:00').getTime();
  const targetMs = new Date(dateKey + 'T00:00:00').getTime();
  return Math.round((todayMs - targetMs) / 86_400_000);
}

export function DigestHistoryScreen({
  uid,
  onUpgradePress,
  maxDaysBack = 30, // actually 3 for free, infinite for pro based on specs, but using isPro to enforce
  isPro = false,
}: DigestHistoryScreenProps) {
  const today = new Date();
  const todayKey = getTodayDateKey();

  const [isLoading, setIsLoading] = useState(true);
  const [digestsByDate, setDigestsByDate] = useState<Record<string, DigestHistoryEntry>>({});
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(todayKey);
  const [showPaywallSheet, setShowPaywallSheet] = useState(false);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);

    Promise.all([
      fetchDigestHistory(uid, isPro ? 365 : 3),
    ])
      .then(([historyEntries]) => {
        if (isCancelled) return;
        const map: Record<string, DigestHistoryEntry> = {};
        for (const entry of historyEntries) {
          map[entry.dateKey] = entry;
        }
        setDigestsByDate(map);
      })
      .catch((error) => console.warn('Failed to fetch history', error))
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [uid, isPro]);

  // Calendar logic
  const oldestAllowedKey = useMemo(() => {
    if (isPro) return '2000-01-01'; // basically infinite
    const d = new Date(todayKey + 'T00:00:00');
    d.setDate(d.getDate() - 3); // 3 days ago max for free
    return d.toISOString().slice(0, 10);
  }, [isPro, todayKey]);

  const calendarGrid = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewYear, viewMonth]);

  const currentViewMonthStart = toDateKey(viewYear, viewMonth, 1);
  const canGoBack = isPro || currentViewMonthStart > oldestAllowedKey.slice(0, 8) + '01';
  const canGoForward = viewYear < today.getFullYear() || viewMonth < today.getMonth();

  function handlePrevMonth() {
    if (!isPro && !canGoBack) {
      setShowPaywallSheet(true);
      return;
    }
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function handleNextMonth() {
    if (!canGoForward) return;
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function handleDayPress(day: number) {
    const dateKey = toDateKey(viewYear, viewMonth, day);
    const ago = daysAgo(dateKey);
    if (ago < 0) return; // future
    if (!isPro && ago > 3) {
      setShowPaywallSheet(true);
      return;
    }
    setSelectedDateKey(dateKey);
  }

  const selectedDigest = useMemo(() => {
    if (!selectedDateKey) return null;
    return digestsByDate[selectedDateKey] || null;
  }, [selectedDateKey, digestsByDate]);

  // Day styling
  function getDayStyle(day: number | null) {
    if (!day) return null;
    const dateKey = toDateKey(viewYear, viewMonth, day);
    const isToday = dateKey === todayKey;
    const isSelected = dateKey === selectedDateKey;
    const isFuture = daysAgo(dateKey) < 0;
    const isLocked = !isPro && daysAgo(dateKey) > 3;
    const hasData = Boolean(digestsByDate[dateKey]);

    const dateObj = new Date(viewYear, viewMonth, day);
    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

    let bg = 'transparent';
    let text = isWeekend ? Colors.TextSecondary : Colors.TextPrimary;

    if (isFuture || isLocked) {
      text = '#CBD5E1'; // muted for locked/future
    } else if (hasData) {
      bg = Colors.PrimaryTint;
      text = Colors.PrimaryDeep;
    }

    if (isSelected) {
      bg = Colors.PrimaryTint;
      text = Colors.PrimaryDeep;
    }

    if (isToday) {
      bg = Colors.Primary;
      text = Colors.Background;
    }

    return { bg, text, isLocked };
  }

  return (
    <View style={styles.container}>
      {/* Calendar Header */}
      <View style={styles.calendarHeader}>
        <View style={styles.monthTitleRow}>
          <Text style={styles.monthTitle}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
          {isPro && <View style={styles.proBadge}><Text style={styles.proBadgeText}>PRO</Text></View>}
        </View>
        <View style={styles.navRow}>
          <Pressable
            accessibilityRole="button"
            onPress={handlePrevMonth}
            style={({ pressed }) => [
              styles.navBtn,
              pressed && styles.navBtnPressed,
            ]}
          >
            <ChevronLeft size={24} color={!isPro && !canGoBack ? '#CBD5E1' : Colors.TextPrimary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={handleNextMonth}
            disabled={!canGoForward}
            style={({ pressed }) => [
              styles.navBtn,
              pressed && styles.navBtnPressed,
            ]}
          >
            <ChevronRight size={24} color={canGoForward ? Colors.TextPrimary : '#CBD5E1'} />
          </Pressable>
        </View>
      </View>

      {/* Weekdays */}
      <View style={styles.weekdaysRow}>
        {WEEKDAY_LABELS.map(w => <Text key={w} style={styles.weekdayText}>{w}</Text>)}
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        {calendarGrid.map((day, idx) => {
          if (!day) return <View key={`empty-${idx}`} style={styles.dayCellWrapper} />;
          const style = getDayStyle(day);
          return (
            <View key={`day-${day}`} style={styles.dayCellWrapper}>
              <Pressable
                onPress={() => handleDayPress(day)}
                style={[styles.dayCell, { backgroundColor: style?.bg }]}
              >
                <Text style={[styles.dayText, { color: style?.text }]}>{day}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      {/* Digest View */}
      <ScrollView style={styles.entriesScroll} contentContainerStyle={styles.entriesContent}>
        {isLoading ? (
          <ActivityIndicator color={Colors.Primary} />
        ) : selectedDigest ? (
          <DigestCard digest={selectedDigest} />
        ) : (
          <View style={styles.emptyEntries}>
            <Text style={styles.emptyEntriesText}>No digest for this day</Text>
          </View>
        )}
      </ScrollView>

      {/* Paywall Sheet Modal */}
      <Modal visible={showPaywallSheet} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setShowPaywallSheet(false)}>
          <Pressable style={styles.paywallSheet} onPress={(e) => e.stopPropagation()}>
            <Pressable 
              style={styles.closeIconWrapper} 
              onPress={() => setShowPaywallSheet(false)}
            >
              <X size={24} color={Colors.TextSecondary} />
            </Pressable>
            
            <Image source={require('../../assets/owl-face.png')} style={[styles.watermark, { opacity: 0.05 }]} />
            <Text style={styles.paywallTitle}>Unlock full history</Text>
            <View style={styles.paywallFeatures}>
              <Text style={styles.paywallFeatureText}>• View your entire entry history</Text>
              <Text style={styles.paywallFeatureText}>• Search past days</Text>
              <Text style={styles.paywallFeatureText}>• Unlimited daily digests</Text>
            </View>
            <Pressable
              style={styles.proButton}
              onPress={() => {
                setShowPaywallSheet(false);
                onUpgradePress();
              }}
            >
              <Text style={styles.proButtonText}>Upgrade to Pro</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Background,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 60,
    marginBottom: Spacing.sm,
  },
  monthTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthTitle: {
    fontFamily: Typography.SectionHeader.fontFamily,
    fontSize: 20,
    fontWeight: '600',
    color: Colors.TextPrimary,
  },
  proBadge: {
    backgroundColor: Colors.ProGold,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.Background,
  },
  navRow: {
    flexDirection: 'row',
    gap: 4,
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnPressed: {
    backgroundColor: Colors.Surface,
  },
  weekdaysRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: Spacing.xs,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    ...Typography.Label,
    color: Colors.TextMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Divider,
  },
  dayCellWrapper: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  dayCell: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16, // circle
  },
  dayText: {
    ...Typography.Body,
    fontWeight: '500',
  },
  entriesScroll: {
    flex: 1,
  },
  entriesContent: {
    padding: Spacing.screenPadding,
    gap: Spacing.sm,
  },
  emptyEntries: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyEntriesText: {
    ...Typography.Secondary,
    color: Colors.TextMuted,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.4)',
    justifyContent: 'flex-end',
  },
  paywallSheet: {
    backgroundColor: Colors.Background,
    borderTopLeftRadius: Radii.sheet,
    borderTopRightRadius: Radii.sheet,
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.lg,
    paddingBottom: 40,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  watermark: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 200,
    height: 200,
  },
  paywallTitle: {
    ...Typography.ScreenTitle,
    color: Colors.TextPrimary,
    marginBottom: Spacing.md,
  },
  paywallFeatures: {
    width: '100%',
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  paywallFeatureText: {
    ...Typography.Body,
    color: Colors.TextSecondary,
  },
  proButton: {
    width: '100%',
    height: 48,
    borderRadius: Radii.button,
    backgroundColor: Colors.ProGold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  proButtonText: {
    ...Typography.Body,
    fontWeight: '600',
    color: Colors.Background,
  },
  closeIconWrapper: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    zIndex: 10,
    padding: 4,
  },
});