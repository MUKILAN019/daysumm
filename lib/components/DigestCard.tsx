import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Share as ShareIcon } from 'lucide-react-native';

import type { Digest } from '../functions/generateDigest';
import { Colors, Typography, Spacing, Radii } from '../theme/tokens';

interface DigestCardProps {
  digest: Digest;
}

function formatDigestForSharing(digest: Digest): string {
  const lines: string[] = [];

  lines.push(digest.headline);
  lines.push('');

  const sections: Array<{ title: string; items: string[] }> = [
    { title: 'Highlights', items: digest.highlights },
    { title: 'Action Items', items: digest.actionItems },
    { title: 'Decisions', items: digest.decisions },
    { title: 'Blockers', items: digest.blockers },
  ];

  for (const section of sections) {
    if (section.items.length === 0) continue;
    lines.push(section.title);
    for (const item of section.items) {
      lines.push(`- ${item}`);
    }
    lines.push('');
  }

  lines.push(digest.statusUpdate);
  lines.push('');
  lines.push('Made with DaySumm');

  return lines.join('\n');
}

export function DigestCard({ digest }: DigestCardProps) {
  const sections = [
    { title: 'Highlights', items: digest.highlights },
    { title: 'Action items', items: digest.actionItems },
    { title: 'Decisions', items: digest.decisions },
    { title: 'Blockers', items: digest.blockers },
  ].filter(
    (s) =>
      s.items.length > 0 &&
      !(
        s.items.length === 1 &&
        (s.items[0].trim().toLowerCase() === 'none' ||
          s.items[0].trim().toLowerCase() === 'null')
      )
  );

  const hasStatusUpdate =
    digest.statusUpdate &&
    digest.statusUpdate.trim().toLowerCase() !== 'none' &&
    digest.statusUpdate.trim().toLowerCase() !== 'null';

  const totalAnimatedItems = 1 + sections.length + (hasStatusUpdate ? 1 : 0);
  const animValues = useRef<Animated.Value[]>(
    Array.from({ length: 8 }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    animValues.forEach((anim) => anim.setValue(0));
    const animations = animValues.slice(0, totalAnimatedItems).map((anim) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    );
    Animated.stagger(90, animations).start();
  }, [digest, totalAnimatedItems, animValues]);

  async function handleShare() {
    try {
      await Share.share({
        message: formatDigestForSharing(digest),
      });
    } catch (error) {
      console.warn('Failed to share digest', error);
    }
  }

  return (
    <View style={styles.card}>
      <Animated.View
        style={[
          styles.headerRow,
          {
            opacity: animValues[0],
            transform: [
              {
                translateY: animValues[0].interpolate({
                  inputRange: [0, 1],
                  outputRange: [16, 0],
                }),
              },
              {
                scale: animValues[0].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.94, 1.0],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.headline}>{digest.headline}</Text>
        <Pressable accessibilityRole="button" onPress={handleShare} style={styles.shareButton}>
          <ShareIcon size={16} color={Colors.PrimaryDeep} />
          <Text style={styles.shareButtonText}>Share</Text>
        </Pressable>
      </Animated.View>

      {sections.map((section, idx) => {
        const animIndex = idx + 1;
        const anim = animValues[animIndex] || animValues[0];
        return (
          <Animated.View
            key={section.title}
            style={[
              styles.section,
              {
                opacity: anim,
                transform: [
                  {
                    translateY: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [14, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item) => (
              <View key={item} style={styles.bulletRow}>
                <View style={styles.bulletPoint} />
                <Text style={styles.bulletItem}>{item}</Text>
              </View>
            ))}
          </Animated.View>
        );
      })}

      {hasStatusUpdate && (() => {
        const animIndex = 1 + sections.length;
        const anim = animValues[animIndex] || animValues[0];
        return (
          <Animated.View
            style={[
              styles.section,
              {
                opacity: anim,
                transform: [
                  {
                    translateY: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [14, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.sectionTitle}>Status update</Text>
            <View style={styles.bulletRow}>
              <View style={styles.bulletPoint} />
              <Text style={styles.bulletItem}>{digest.statusUpdate}</Text>
            </View>
          </Animated.View>
        );
      })()}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.Border,
    borderRadius: Radii.card,
    backgroundColor: Colors.Card,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  headline: {
    flex: 1,
    ...Typography.SectionHeader,
    fontWeight: '700',
    color: Colors.TextPrimary,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 32,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.button,
    backgroundColor: Colors.PrimaryTint,
  },
  shareButtonText: {
    ...Typography.Label,
    fontWeight: '600',
    color: Colors.PrimaryDeep,
  },
  section: {
    gap: 6,
  },
  sectionTitle: {
    ...Typography.Label,
    color: Colors.TextMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletPoint: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.Primary,
    marginTop: 8, // align with first line of text
  },
  bulletItem: {
    flex: 1,
    ...Typography.Body,
    color: Colors.TextPrimary,
    lineHeight: 20,
  },
  emptyText: {
    ...Typography.Body,
    color: Colors.TextSecondary,
  },
  statusText: {
    ...Typography.Body,
    color: Colors.TextPrimary,
    lineHeight: 20,
  },
});
