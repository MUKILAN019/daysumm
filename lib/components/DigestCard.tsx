import React from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
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
  ];

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
      <View style={styles.headerRow}>
        <Text style={styles.headline}>{digest.headline}</Text>
        <Pressable accessibilityRole="button" onPress={handleShare} style={styles.shareButton}>
          <ShareIcon size={16} color={Colors.PrimaryDeep} />
          <Text style={styles.shareButtonText}>Share</Text>
        </Pressable>
      </View>

      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.items.length > 0 ? (
            section.items.map((item) => (
              <View key={item} style={styles.bulletRow}>
                <View style={styles.bulletPoint} />
                <Text style={styles.bulletItem}>{item}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>None</Text>
          )}
        </View>
      ))}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status update</Text>
        <Text style={styles.statusText}>{digest.statusUpdate}</Text>
      </View>
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
    color: Colors.TextPrimary,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.button,
    backgroundColor: Colors.PrimaryTint,
  },
  shareButtonText: {
    ...Typography.Secondary,
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
