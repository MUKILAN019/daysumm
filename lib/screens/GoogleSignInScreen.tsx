import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';

interface GoogleSignInScreenProps {
  onContinue: () => void;
  onContinueAsGuest: () => void;
  isLoading: boolean;
  errorMessage?: string | null;
}

export function GoogleSignInScreen({
  onContinue,
  onContinueAsGuest,
  isLoading,
  errorMessage,
}: GoogleSignInScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome to DaySumm</Text>
        <Text style={styles.subtitle}>
          Sign in to keep your work entries tied to your account, or continue as a guest.
        </Text>
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <Pressable
          accessibilityRole="button"
          onPress={onContinue}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            isLoading && styles.buttonDisabled,
          ]}
          disabled={isLoading}
        >
          <View style={styles.googleButtonContent}>
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.buttonText}>Continue with Google</Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={onContinueAsGuest}
          disabled={isLoading}
          style={({ pressed }) => [
            styles.guestButton,
            pressed && styles.guestButtonPressed,
            isLoading && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.guestButtonText}>Continue as Guest</Text>
        </Pressable>

        {isLoading ? <ActivityIndicator color="#000" style={styles.spinner} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA', justifyContent: 'center', paddingHorizontal: 24 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08, shadowRadius: 20, elevation: 6,
  },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 10 },
  subtitle: { fontSize: 16, lineHeight: 22, color: '#4B5563', marginBottom: 24 },
  errorText: { color: '#B91C1C', fontSize: 14, marginBottom: 18 },
  button: {
    borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D5DB',
    minHeight: 50, justifyContent: 'center', paddingHorizontal: 16,
  },
  buttonPressed: { backgroundColor: '#F3F4F6' },
  buttonDisabled: { opacity: 0.6 },
  googleButtonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  googleIcon: { fontSize: 20, fontWeight: '700', color: '#4285F4' },
  buttonText: { fontSize: 16, fontWeight: '700', letterSpacing: 0.2, color: '#111827' },
  spinner: { marginTop: 16 },
  guestButton: {
    marginTop: 12, minHeight: 44, justifyContent: 'center', alignItems: 'center',
    borderRadius: 10,
  },
  guestButtonPressed: { backgroundColor: '#F3F4F6' },
  guestButtonText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
});
