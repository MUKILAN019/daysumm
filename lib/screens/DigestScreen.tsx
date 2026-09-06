import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Text, Pressable, Image, Animated, Easing } from 'react-native';
import { GlobalHeader } from '../components/GlobalHeader';
import { DigestCard } from '../components/DigestCard';
import { Colors, Spacing, Typography, Radii } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { Wand2, Sparkles, AlertCircle } from 'lucide-react-native';
import { StreakBadge } from '../components/StreakBadge';
import { MainBackground } from '../components/MainBackground';
import type { Digest } from '../functions/generateDigest';

function ShimmerBox({ style }: { style: any }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.95],
  });

  const { colors } = useTheme();

  return (
    <Animated.View style={[style, { opacity, backgroundColor: colors.Border }]} />
  );
}

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
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <MainBackground />
      <GlobalHeader
        title="Daily Digest"
        subtitle="Your day at a glance"
        rightAction={<StreakBadge currentStreak={currentStreak} />}
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.digestWrapper}>
          <View style={styles.digestSectionHeader}>
            <View style={styles.digestSectionTitleRow}>
              <Text style={[styles.digestSectionTitle, { color: colors.TextPrimary }]}>Today's Summary</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={isGeneratingDigest}
              onPress={onGenerateDigest}
              style={({ pressed }) => [
                styles.generateButton,
                { backgroundColor: isGeneratingDigest ? colors.GrayDisabled : colors.Primary },
                pressed && !isGeneratingDigest && { backgroundColor: colors.PrimaryDark },
              ]}
            >
              {!isGeneratingDigest && !digest && <Wand2 size={16} color="#FFFFFF" style={{ marginRight: 6 }} />}
              <Text style={[styles.generateButtonText, { color: '#FFFFFF' }]}>
                {isGeneratingDigest ? 'Generating…' : digest ? '\u21bb Refresh' : 'Generate'}
              </Text>
            </Pressable>
          </View>

          {isGeneratingDigest ? (
            <View style={[styles.skeletonCard, { backgroundColor: colors.Card, borderColor: colors.Border }]}>
              <ShimmerBox style={styles.skeletonHeadline} />
              <ShimmerBox style={styles.skeletonLine} />
              <ShimmerBox style={[styles.skeletonLine, { width: '85%' }]} />
              <ShimmerBox style={[styles.skeletonLine, { width: '70%' }]} />
              <ShimmerBox style={styles.skeletonLine} />
              <ShimmerBox style={[styles.skeletonLine, { width: '90%' }]} />
            </View>
          ) : digestError ? (
            isLimitError ? (
              <View style={[styles.digestLimitCard, { backgroundColor: colors.PrimaryTint, borderColor: colors.Border }]}>
                <View style={styles.digestCardHeaderRow}>
                  <Sparkles size={18} color={colors.PrimaryDeep} strokeWidth={2.5} />
                  <Text style={[styles.digestLimitTitle, { color: colors.PrimaryDeep }]}>Daily Limit Reached (3/3)</Text>
                </View>
                <Text style={[styles.digestLimitText, { color: colors.TextSecondary }]}>{digestError}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={onUpgradePress}
                  style={[styles.digestUpgradeButton, { backgroundColor: colors.Primary }]}
                >
                  <Text style={styles.digestUpgradeButtonText}>Upgrade to Pro</Text>
                </Pressable>
              </View>
            ) : (
              <View style={[styles.digestErrorCard, { backgroundColor: colors.DangerBg, borderColor: colors.DangerBorder }]}>
                <View style={styles.digestCardHeaderRow}>
                  <AlertCircle size={18} color={colors.Danger} strokeWidth={2} />
                  <Text style={[styles.digestErrorTitle, { color: colors.Danger }]}>Unable to Generate</Text>
                </View>
                <Text style={[styles.digestErrorText, { color: colors.TextSecondary }]}>{digestError}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={onGenerateDigest}
                  style={[styles.digestErrorButton, { backgroundColor: colors.Danger }]}
                >
                  <Text style={styles.digestErrorButtonText}>Try again</Text>
                </Pressable>
              </View>
            )
          ) : digest ? (
            <DigestCard digest={digest} />
          ) : (
            <View style={styles.digestEmptyState}>
              <Image
                source={require('../../assets/cat-lying-waiting.png')}
                style={styles.digestEmptyMascot}
                resizeMode="contain"
              />
              <Text style={[styles.digestEmptyText, { color: colors.TextMuted }]}>No digest yet</Text>
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
    backgroundColor: 'transparent',
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
  digestSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
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
  digestCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  digestLimitCard: {
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.3)',
    borderRadius: Radii.card,
    backgroundColor: Colors.PrimaryTint,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  digestLimitTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.TextPrimary,
  },
  digestLimitText: {
    color: Colors.TextSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  digestUpgradeButton: {
    alignSelf: 'flex-start',
    height: 40,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.button,
    backgroundColor: Colors.Primary,
    shadowColor: Colors.Primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  digestUpgradeButtonText: {
    color: Colors.White,
    fontSize: 14,
    fontWeight: '700',
  },
  digestErrorCard: {
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.DangerBorder,
    borderRadius: Radii.card,
    backgroundColor: Colors.DangerBg,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  digestErrorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.DangerDeep,
  },
  digestErrorText: {
    color: Colors.DangerDark,
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
    backgroundColor: Colors.TagBlockerText,
  },
  digestErrorButtonText: {
    color: Colors.White,
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
  digestEmptyMascot: {
    width: 140,
    height: 140,
    opacity: 0.9,
  },
  digestEmptyText: {
    ...Typography.Secondary,
    color: Colors.TextMuted,
    marginTop: -24,
    textAlign: 'center',
    lineHeight: 19,
  },
});
