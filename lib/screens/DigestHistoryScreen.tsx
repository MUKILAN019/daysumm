import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
  Modal,
} from 'react-native';
import { ChevronLeft, ChevronRight, X, Check } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radii } from '../theme/tokens';
import { fetchDigestHistory, type DigestHistoryEntry } from '../firestore/digestHistory';
import { DigestCard } from '../components/DigestCard';
import type { Digest } from '../functions/generateDigest';

interface DigestHistoryScreenProps {
  uid: string;
  onUpgradePress: () => void;
  maxDaysBack?: number;
  isPro?: boolean;
  refreshKey?: number;
  todayDigest?: Digest | null;
}

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SCREEN_HEIGHT = Dimensions.get('window').height;
const MASCOT_SIZE = 108;

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getTodayDateKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function daysAgo(dateKey: string): number {
  const todayMs = new Date(getTodayDateKey() + 'T00:00:00').getTime();
  const targetMs = new Date(dateKey + 'T00:00:00').getTime();
  return Math.round((todayMs - targetMs) / 86_400_000);
}

const PAYWALL_FEATURES = [
  'View your entire entry history',
  'Search and revisit past days',
  'Unlimited daily digests',
  'Priority AI processing',
];

export function DigestHistoryScreen({
  uid,
  onUpgradePress,
  isPro = false,
  refreshKey = 0,
  todayDigest = null,
}: DigestHistoryScreenProps) {
  const todayKey = getTodayDateKey();

  const [isLoading, setIsLoading] = useState(true);
  const [digestsByDate, setDigestsByDate] = useState<Record<string, DigestHistoryEntry>>({});
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(todayKey);
  const [showPaywallSheet, setShowPaywallSheet] = useState(false);

  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());

  // Paywall sheet animation
  const paywallSlide = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (showPaywallSheet) {
      Animated.timing(paywallSlide, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [showPaywallSheet, paywallSlide]);

  function closePaywall() {
    Animated.timing(paywallSlide, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setShowPaywallSheet(false));
  }

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);

    Promise.all([fetchDigestHistory(uid, isPro ? 365 : 3)])
      .then(([historyEntries]) => {
        if (isCancelled) return;
        const map: Record<string, DigestHistoryEntry> = {};
        for (const entry of historyEntries) {
          if (!map[entry.dateKey]) map[entry.dateKey] = entry;
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
  }, [uid, isPro, refreshKey]);

  const oldestAllowedKey = useMemo(() => {
    if (isPro) return '2000-01-01';
    const d = new Date(todayKey + 'T00:00:00');
    d.setDate(d.getDate() - 3);
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
  const canGoForward =
    viewYear < new Date().getFullYear() ||
    (viewYear === new Date().getFullYear() && viewMonth < new Date().getMonth());

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
    if (ago < 0) return;
    if (!isPro && ago > 3) {
      setShowPaywallSheet(true);
      return;
    }
    setSelectedDateKey(dateKey);
  }

  const selectedDigest = useMemo(() => {
    if (!selectedDateKey) return null;
    if (selectedDateKey === todayKey && todayDigest) {
      return todayDigest as DigestHistoryEntry;
    }
    return digestsByDate[selectedDateKey] || null;
  }, [selectedDateKey, digestsByDate, todayKey, todayDigest]);

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

    if (isFuture || isLocked) text = '#CBD5E1';
    else if (hasData) {
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
          {isPro && (
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          )}
        </View>
        <View style={styles.navRow}>
          <Pressable
            accessibilityRole="button"
            onPress={handlePrevMonth}
            style={({ pressed }) => [styles.navBtn, pressed && styles.navBtnPressed]}
          >
            <ChevronLeft size={24} color={!isPro && !canGoBack ? '#CBD5E1' : Colors.TextPrimary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={handleNextMonth}
            disabled={!canGoForward}
            style={({ pressed }) => [styles.navBtn, pressed && styles.navBtnPressed]}
          >
            <ChevronRight size={24} color={canGoForward ? Colors.TextPrimary : '#CBD5E1'} />
          </Pressable>
        </View>
      </View>

      {/* Weekdays */}
      <View style={styles.weekdaysRow}>
        {WEEKDAY_LABELS.map((w) => (
          <Text key={w} style={styles.weekdayText}>{w}</Text>
        ))}
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
            <Image
              source={require('../../assets/cat-lying-waiting.png')}
              style={styles.emptyHistoryMascot}
              resizeMode="contain"
            />
            <Text style={styles.emptyEntriesText}>No digest for this day</Text>
          </View>
        )}
      </ScrollView>

      {/* Paywall Bottom Sheet */}
      <Modal
        transparent
        visible={showPaywallSheet}
        animationType="none"
        onRequestClose={closePaywall}
      >
        <View style={styles.overlay}>
          <Pressable style={styles.backdropTap} onPress={closePaywall} />

          <Animated.View
            style={[styles.sheetWrap, { transform: [{ translateY: paywallSlide }] }]}
          >
            {/* Floating mascot seated on top-right edge */}
            <View pointerEvents="none" style={styles.mascotWrap}>
              <Image
                source={require('../../assets/cat-king.png')}
                style={styles.mascot}
                resizeMode="contain"
              />
            </View>

            <View style={styles.sheet}>
              {/* Teal accent band with drag handle */}
              <View style={styles.topBand}>
                <View style={styles.handle} />
              </View>

              <ScrollView
                style={styles.scrollContent}
                contentContainerStyle={styles.scrollContentInner}
                showsVerticalScrollIndicator={false}
              >
                {/* Header: Pro pill + close */}
                <View style={styles.header}>
                  <View style={styles.sourcePill}>
                    <View style={styles.pillDotGold} />
                    <Text style={styles.sourcePillText}>DaySumm Pro</Text>
                  </View>
                  <Pressable onPress={closePaywall} style={styles.closeButton} hitSlop={10}>
                    <X size={18} color={Colors.TextSecondary} strokeWidth={2.2} />
                  </Pressable>
                </View>

                {/* Title */}
                <Text style={styles.title}>Unlock your full history</Text>
                <Text style={styles.subtitle}>
                  Free plan shows the last 3 days. Go Pro to time-travel across every day you've captured.
                </Text>

                {/* Section label */}
                <Text style={styles.sectionLabel}>What you get</Text>

                {/* Feature card */}
                <View style={styles.featureCard}>
                  {PAYWALL_FEATURES.map((f) => (
                    <View key={f} style={styles.featureRow}>
                      <View style={styles.checkBadge}>
                        <Check size={12} color={Colors.PrimaryDeep} strokeWidth={3} />
                      </View>
                      <Text style={styles.featureText}>{f}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>

              {/* Action buttons */}
              <View style={styles.actions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.cancelButton,
                    pressed && styles.cancelButtonPressed,
                  ]}
                  onPress={closePaywall}
                >
                  <Text style={styles.cancelButtonText}>Not now</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.upgradeButton,
                    pressed && styles.upgradeButtonPressed,
                  ]}
                  onPress={() => {
                    closePaywall();
                    onUpgradePress();
                  }}
                >
                  <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.Background },

  // ---------- Calendar ----------
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 60,
    marginBottom: Spacing.sm,
  },
  monthTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  proBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.Background },
  navRow: { flexDirection: 'row', gap: 4 },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnPressed: { backgroundColor: Colors.Surface },
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
    borderRadius: 16,
  },
  dayText: { ...Typography.Body, fontWeight: '500' },
  entriesScroll: { flex: 1 },
  entriesContent: { padding: Spacing.screenPadding, gap: Spacing.sm },
  emptyEntries: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  emptyHistoryMascot: { width: 140, height: 140, opacity: 0.9 },
  emptyEntriesText: { ...Typography.Secondary, color: Colors.TextMuted },

  // ---------- Paywall Sheet (mirrors EntryDetailSheet) ----------
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(6, 78, 59, 0.45)',
    justifyContent: 'flex-end',
  },
  backdropTap: { flex: 1 },
  sheetWrap: { position: 'relative' },
  mascotWrap: {
    position: 'absolute',
    top: -MASCOT_SIZE * 0.62,
    right: 20,
    width: MASCOT_SIZE,
    height: MASCOT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  mascot: { width: MASCOT_SIZE, height: MASCOT_SIZE },
  sheet: {
    backgroundColor: Colors.Card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: SCREEN_HEIGHT * 0.85,
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 24,
    overflow: 'hidden',
  },
  topBand: {
    backgroundColor: Colors.PrimaryTint,
    paddingTop: 10,
    paddingBottom: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(16, 185, 129, 0.15)',
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.Primary,
    opacity: 0.55,
  },
  scrollContent: { flexGrow: 0 },
  scrollContentInner: {
    paddingHorizontal: Spacing.screenPadding + 4,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sourcePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(212, 162, 76, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(212, 162, 76, 0.35)',
  },
  pillDotGold: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.ProGold,
  },
  sourcePillText: {
    ...Typography.Secondary,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.ProGold,
    textTransform: 'none',
    letterSpacing: 0.3,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.Surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.Border,
  },
  title: {
    ...Typography.ScreenTitle,
    color: Colors.TextPrimary,
    marginBottom: 6,
    paddingRight: 90, // leave room for mascot
  },
  subtitle: {
    ...Typography.Body,
    color: Colors.TextSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    ...Typography.Secondary,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.TextSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  featureCard: {
    backgroundColor: Colors.Surface,
    borderWidth: 1,
    borderColor: Colors.Border,
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.PrimaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    ...Typography.Body,
    color: Colors.TextPrimary,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.screenPadding + 4,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md + 4,
    borderTopWidth: 1,
    borderTopColor: Colors.Border,
    backgroundColor: Colors.Card,
  },
  actionButton: {
    flex: 1,
    height: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.Surface,
    borderWidth: 1.5,
    borderColor: Colors.Border,
  },
  cancelButtonPressed: { backgroundColor: Colors.Border },
  cancelButtonText: {
    ...Typography.Body,
    color: Colors.TextPrimary,
    fontWeight: '700',
  },
  upgradeButton: {
    backgroundColor: Colors.ProGold,
    shadowColor: Colors.ProGold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
    flex: 1.4,
  },
  upgradeButtonPressed: { opacity: 0.9 },
  upgradeButtonText: {
    ...Typography.Body,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
