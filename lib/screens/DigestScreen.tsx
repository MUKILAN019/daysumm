import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Text, Pressable, Image, Animated, Easing } from 'react-native';
import { GlobalHeader } from '../components/GlobalHeader';
import { DigestCard } from '../components/DigestCard';
import { Colors, Spacing, Typography, Radii } from '../theme/tokens';
import { Wand2 } from 'lucide-react-native';
import { StreakBadge } from '../components/StreakBadge';
import { AmbientBackground } from '../components/AmbientBackground';
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

  return (
    <Animated.View style={[style, { opacity, backgroundColor: Colors.Border }]} />
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
  return (
    <View style={styles.container}>
      <AmbientBackground />
      <GlobalHeader
        title="Daily Digest"
        subtitle="Your day at a glance"
        rightAction={<StreakBadge currentStreak={currentStreak} />}
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.digestWrapper}>
          <View style={styles.digestSectionHeader}>
            <View style={styles.digestSectionTitleRow}>
              <Text style={styles.digestSectionTitle}>Today's Summary</Text>
            </View>
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
              <ShimmerBox style={styles.skeletonHeadline} />
              <ShimmerBox style={styles.skeletonLine} />
              <ShimmerBox style={[styles.skeletonLine, { width: '85%' }]} />
              <ShimmerBox style={[styles.skeletonLine, { width: '70%' }]} />
              <ShimmerBox style={styles.skeletonLine} />
              <ShimmerBox style={[styles.skeletonLine, { width: '90%' }]} />
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
              <Image 
                source={require('../../assets/cat-lying-waiting.png')} 
                style={styles.digestEmptyMascot} 
                resizeMode="contain" 
              />
              <Text style={styles.digestEmptyText}>No digest yet</Text>
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
    gap: Spacing.md,
  },
  digestEmptyMascot: {
    width: 140,
    height: 140,
    opacity: 0.9,
  },
  digestEmptyText: {
    ...Typography.Secondary,
    color: Colors.TextMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
});
