import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Digest } from '../functions/generateDigest';

interface DigestCardProps {
  digest: Digest;
}

export function DigestCard({ digest }: DigestCardProps) {
  const sections = [
    { title: 'Highlights', items: digest.highlights },
    { title: 'Action items', items: digest.actionItems },
    { title: 'Decisions', items: digest.decisions },
    { title: 'Blockers', items: digest.blockers },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.headline}>{digest.headline}</Text>

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
  headline: {
    color: '#111827',
    fontSize: 18,
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
