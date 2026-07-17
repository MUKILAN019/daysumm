import React from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';

import type { Digest } from '../functions/generateDigest';

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
          <Text style={styles.shareButtonText}>Share</Text>
        </Pressable>
      </View>

      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.items.length > 0 ? (
            section.items.map((item) => (
              <Text key={item} style={styles.bulletItem}>
                • {item}
              </Text>
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
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headline: {
    flex: 1,
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
  },
  shareButton: {
    minHeight: 36,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  shareButtonText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '700',
  },
  section: {
    gap: 6,
  },
  sectionTitle: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  bulletItem: {
    color: '#111827',
    fontSize: 14,
    lineHeight: 20,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
  },
  statusText: {
    color: '#111827',
    fontSize: 14,
    lineHeight: 20,
  },
});
