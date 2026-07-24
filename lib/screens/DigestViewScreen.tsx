import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GlobalHeader } from '../components/GlobalHeader';

import { DigestCard } from '../components/DigestCard';
import { fetchDigestRecordById } from '../firestore/digestRecords';
import type { Digest } from '../functions/generateDigest';
import { Colors, Spacing, Radii } from '../theme/tokens';

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
      <GlobalHeader title="Digest" onBack={onBack} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.Primary} />
          </View>
        ) : errorMessage ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : digest ? (
          <DigestCard digest={digest} />
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.Background },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.screenPadding, paddingTop: Spacing.sm, paddingBottom: Spacing.xxl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: Spacing.xxl },
  errorText: { color: Colors.Danger, fontSize: 15, textAlign: 'center' },
});