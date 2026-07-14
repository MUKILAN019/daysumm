import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

interface NotificationPermissionScreenProps {
  onContinue: () => Promise<void>;
}

export function NotificationPermissionScreen({ onContinue }: NotificationPermissionScreenProps) {
  const [isRequesting, setIsRequesting] = useState(false);

  async function handleContinue() {
    if (isRequesting) return;
    setIsRequesting(true);
    try {
      await onContinue();
    } finally {
      setIsRequesting(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.emoji}>🔔</Text>
        <Text style={styles.title}>Get notified the moment your digest is ready</Text>
        <Text style={styles.subtitle}>
          DaySumm sends your daily digest around 5 PM. Turn on notifications so you don't have
          to keep checking the app.
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={handleContinue}
          disabled={isRequesting}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            isRequesting && styles.buttonDisabled,
          ]}
        >
          {isRequesting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Enable Notifications</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA', justifyContent: 'center', paddingHorizontal: 24 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 28, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08, shadowRadius: 20, elevation: 6,
  },
  emoji: { fontSize: 40, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 15, lineHeight: 21, color: '#4B5563', marginBottom: 24, textAlign: 'center' },
  button: {
    width: '100%', minHeight: 50, borderRadius: 10, backgroundColor: '#2563EB',
    alignItems: 'center', justifyContent: 'center',
  },
  buttonPressed: { backgroundColor: '#1D4ED8' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});