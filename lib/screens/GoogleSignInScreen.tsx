import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface GoogleSignInScreenProps {
  onContinue: () => void;
  onContinueAsGuest: () => void;
  isLoading: boolean;
  errorMessage?: string | null;
}

/**
 * Official Google "G" logomark — four-color, per Google's sign-in branding guidelines.
 * Rendered as SVG so no extra image asset is needed.
 */
function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <Path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <Path
        fill="#FBBC05"
        d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <Path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </Svg>
  );
}

/**
 * Screen 1 — Welcome. Full teal hero, mascot centered, buttons floating on teal.
 */
export function GoogleSignInScreen({
  onContinue,
  onContinueAsGuest,
  isLoading,
  errorMessage,
}: GoogleSignInScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.mascotHalo}>
          <Image
            source={require('../../assets/owl-face.png')}
            style={styles.mascot}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.brand}>DaySumm</Text>
        <Text style={styles.tagline}>Your workday, reconstructed in 10 seconds</Text>
      </View>

      <View style={styles.actions}>
        {errorMessage ? (
          <View style={styles.errorChip}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={onContinue}
          disabled={isLoading}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed,
            isLoading && styles.buttonDisabled,
          ]}
        >
          <View style={styles.googleButtonContent}>
            <GoogleLogo size={20} />
            <Text style={styles.primaryButtonText}>Continue with Google</Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={onContinueAsGuest}
          disabled={isLoading}
          style={({ pressed }) => [
            styles.ghostButton,
            pressed && styles.ghostButtonPressed,
            isLoading && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.ghostButtonText}>Continue as Guest</Text>
        </Pressable>

        {isLoading ? <ActivityIndicator color="#FFFFFF" style={styles.spinner} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#10B981' },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  mascotHalo: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  mascot: { width: 140, height: 140 },
  brand: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  tagline: {
    marginTop: 8,
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  actions: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 12,
  },
  errorChip: {
    backgroundColor: 'rgba(239,68,68,0.18)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  errorText: {
    color: '#FEE2E2',
    fontSize: 14,
    textAlign: 'center',
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  primaryButtonPressed: { backgroundColor: '#F3F4F6' },
  buttonDisabled: { opacity: 0.7 },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  primaryButtonText: { fontSize: 16, fontWeight: '700', color: '#111827' },
  ghostButton: {
    minHeight: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  ghostButtonPressed: { backgroundColor: 'rgba(255,255,255,0.12)' },
  ghostButtonText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  spinner: { marginTop: 8 },
});
