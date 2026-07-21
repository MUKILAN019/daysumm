import React from 'react';
import { View, StyleSheet, ScrollView, Text, Pressable } from 'react-native';
import { GlobalHeader } from '../components/GlobalHeader';
import { DigestCard } from '../components/DigestCard';
import { Colors, Spacing, Typography, Radii } from '../theme/tokens';
import { Wand2 } from 'lucide-react-native';
import { StreakBadge } from '../components/StreakBadge';
import type { Digest } from '../functions/generateDigest';

interface DigestScreenProps {
  digest: Digest | null;
  currentStreak: number;
  isGeneratingDigest: boolean;
  digestError: string | null;
  isLimitError: boolean;
  onGenerateDigest: () => void;
  onUpgradePress: () => void;
}

export function DigestScreen({
  digest,
  currentStreak,
  isGeneratingDigest,
  digestError,
  isLimitError,
  onGenerateDigest,
  onUpgradePress,
}: DigestScreenProps) {
  return (
    <View style={styles.container}>
      <GlobalHeader
        title="Daily Digest"
        subtitle="Your summarized day"
        rightAction={<StreakBadge currentStreak={currentStreak} />}
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.digestWrapper}>
          <View style={styles.digestSectionHeader}>
            <Text style={styles.digestSectionTitle}>Today's Summary</Text>
            <Pressable
              accessibilityRole="button"
              disabled={isGeneratingDigest}
              onPress={onGenerateDigest}
              style={({ pressed }) => [
                styles.generateButton,
                isGeneratingDigest && styles.generateButtonDisabled,
                pressed && !isGeneratingDigest && styles.generateButtonPressed,
              ]}
            >
              {!isGeneratingDigest && !digest && <Wand2 size={16} color={Colors.Background} style={{ marginRight: 6 }} />}
              <Text style={styles.generateButtonText}>
                {isGeneratingDigest ? 'Generating…' : digest ? '↻ Refresh' : 'Generate'}
              </Text>
            </Pressable>
          </View>

          {isGeneratingDigest ? (
            <View style={styles.skeletonCard}>
              <View style={styles.skeletonHeadline} />
              <View style={styles.skeletonLine} />
              <View style={[styles.skeletonLine, { width: '85%' }]} />
              <View style={[styles.skeletonLine, { width: '70%' }]} />
              <View style={styles.skeletonLine} />
            </View>
          ) : digestError ? (
            <View style={styles.digestErrorCard}>
              <Text style={styles.digestErrorText}>{digestError}</Text>
              {isLimitError ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={onUpgradePress}
                  style={styles.digestErrorButton}
                >
                  <Text style={styles.digestErrorButtonText}>Upgrade to Pro</Text>
                </Pressable>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  onPress={onGenerateDigest}
                  style={styles.digestErrorButton}
                >
                  <Text style={styles.digestErrorButtonText}>Try again</Text>
                </Pressable>
              )}
            </View>
          ) : digest ? (
            <DigestCard digest={digest} />
          ) : (
            <View style={styles.digestEmptyState}>
              <Text style={styles.digestEmptyText}>
                Log some entries in the Write or Voice tab, then generate your daily summary here.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },
  digestWrapper: {
    width: '100%',
    marginTop: Spacing.md,
  },
  digestSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  digestSectionTitle: {
    ...Typography.SectionHeader,
    color: Colors.TextPrimary,
  },
  generateButton: {
    height: 38,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.button,
    backgroundColor: Colors.Primary,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonPressed: {
    backgroundColor: Colors.PrimaryDark,
  },
  generateButtonText: {
    ...Typography.Secondary,
    fontWeight: '700',
    color: Colors.Background,
  },
  skeletonCard: {
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.Border,
    borderRadius: Radii.card,
    backgroundColor: Colors.Card,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  skeletonHeadline: {
    height: 18,
    width: '70%',
    borderRadius: 6,
    backgroundColor: Colors.Border,
  },
  skeletonLine: {
    height: 11,
    width: '100%',
    borderRadius: 6,
    backgroundColor: Colors.Surface,
  },
  digestErrorCard: {
    gap: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: Radii.card,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  digestErrorText: {
    color: '#B91C1C',
    fontSize: 14,
    lineHeight: 20,
  },
  digestErrorButton: {
    alignSelf: 'flex-start',
    height: 36,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#DC2626',
  },
  digestErrorButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  digestEmptyState: {
    backgroundColor: Colors.Surface,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.Border,
    borderStyle: 'dashed',
    paddingHorizontal: 16,
    paddingVertical: 32,
    alignItems: 'center',
  },
  digestEmptyText: {
    ...Typography.Secondary,
    color: Colors.TextMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
});