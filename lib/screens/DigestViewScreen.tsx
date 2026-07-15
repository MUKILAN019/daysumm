import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { DigestCard } from '../components/DigestCard';
import { fetchDigestRecordById } from '../firestore/digestRecords';
import type { Digest } from '../functions/generateDigest';

interface DigestViewScreenProps {
  digestRecordId: string;
  onBack: () => void;
}

export function DigestViewScreen({ digestRecordId, onBack }: DigestViewScreenProps) {
  const [digest, setDigest] = useState<Digest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    setIsLoading(true);
    setErrorMessage(null);

    fetchDigestRecordById(digestRecordId)
      .then((result) => {
        if (isCancelled) return;
        if (!result) {
          setErrorMessage('This digest could not be found.');
          return;
        }
        setDigest(result);
      })
      .catch((error: unknown) => {
        console.warn('Failed to fetch digest record', error);
        if (!isCancelled) {
          setErrorMessage('We could not load this digest right now.');
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [digestRecordId]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Digest</Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : errorMessage ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : digest ? (
        <DigestCard digest={digest} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA', paddingHorizontal: 20, paddingTop: 56, gap: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { paddingVertical: 6, paddingHorizontal: 8 },
  backButtonText: { color: '#2563EB', fontSize: 15, fontWeight: '700' },
  title: { color: '#111827', fontSize: 24, fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#B91C1C', fontSize: 15, textAlign: 'center' },
});