// src/screens/onboarding/GoogleSignInScreen.tsx
import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Mic, Sparkles, CalendarDays, ShieldCheck } from 'lucide-react-native';
import { AmbientBackground } from '../components/AmbientBackground';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../theme/tokens';

interface GoogleSignInScreenProps {
  onContinue: () => void;
  onContinueAsGuest: () => void;
  isLoading: boolean;
  errorMessage?: string | null;
}

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

function Bouncy({
  children,
  onPress,
  disabled,
  style,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  style?: any;
  accessibilityLabel?: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 6 }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        onPressIn={() => to(0.96)}
        onPressOut={() => to(1)}
        disabled={disabled}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

/**
 * Landing / welcome screen.
 * Hero scrolls (nothing can ever hide behind the panel) and the sign-in panel
 * is a fixed docked card — no fake drag handle, so it never reads as a
 * draggable drawer that "won't close".
 */
export function GoogleSignInScreen({
  onContinue,
  onContinueAsGuest,
  isLoading,
  errorMessage,
}: GoogleSignInScreenProps) {
  const enter = useRef(new Animated.Value(0)).current;
  const panel = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.timing(enter, {
        toValue: 1,
        duration: 620,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(panel, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 5 }),
    ]).start();

    Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 2800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ).start();
  }, [enter, panel, pulse]);

  const heroStyle = {
    opacity: enter,
    transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }],
  };

  const mascotStyle = {
    transform: [
      { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) },
    ],
  };

  const haloStyle = {
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0] }),
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.35] }) }],
  };

  const panelStyle = {
    opacity: panel,
    transform: [{ translateY: panel.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }],
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <AmbientBackground isDarkTheme />

      {/* ---------------- HERO (scrollable, never clipped) ---------------- */}
      <ScrollView
        style={styles.heroScroll}
        contentContainerStyle={styles.heroContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View style={[styles.hero, heroStyle]}>
          <View style={styles.mascotStage}>
            <Animated.View pointerEvents="none" style={[styles.halo, haloStyle]} />
            <View pointerEvents="none" style={styles.mascotPad} />
            <Animated.Image
              source={require('../../assets/cat-hero.png')}
              style={[styles.mascot, mascotStyle]}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.brand}>DaySumm</Text>
          <Text style={styles.tagline}>
            Speak, jot, forget.{'\n'}Your workday rebuilds itself in 10 seconds.
          </Text>

          {/* Value rail */}
          <View style={styles.rail}>
            <View style={styles.railItem}>
              <View style={styles.railIcon}>
                <Mic size={16} color={Colors.White} strokeWidth={2} />
              </View>
              <Text style={styles.railText}>Talk it{'\n'}out</Text>
            </View>
            <View style={styles.railDivider} />
            <View style={styles.railItem}>
              <View style={styles.railIcon}>
                <Sparkles size={16} color={Colors.White} strokeWidth={2} />
              </View>
              <Text style={styles.railText}>AI{'\n'}summary</Text>
            </View>
            <View style={styles.railDivider} />
            <View style={styles.railItem}>
              <View style={styles.railIcon}>
                <CalendarDays size={16} color={Colors.White} strokeWidth={2} />
              </View>
              <Text style={styles.railText}>Replay{'\n'}any day</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* ---------------- DOCKED ACTION PANEL ---------------- */}
      <Animated.View style={[styles.panel, panelStyle]}>
        <Text style={styles.panelTitle}>Start your first summary</Text>

        {errorMessage ? (
          <View style={styles.errorChip}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <Bouncy
          onPress={onContinue}
          disabled={isLoading}
          accessibilityLabel="Continue with Google"
          style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
        >
          <View style={styles.buttonRow}>
            <View style={styles.googleChip}>
              <GoogleLogo size={18} />
            </View>
            <Text style={styles.primaryButtonText}>Continue with Google</Text>
            <View style={styles.inlineSpinner} />
          </View>
        </Bouncy>

        <Bouncy
          onPress={onContinueAsGuest}
          disabled={isLoading}
          accessibilityLabel="Continue as guest"
          style={[styles.ghostButton, isLoading && styles.buttonDisabled]}
        >
          <Text style={styles.ghostButtonText}>Continue as Guest</Text>
        </Bouncy>

        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={Colors.TextMuted} />
            <Text style={styles.loadingText}>Signing you in…</Text>
          </View>
        ) : null}

        <View style={styles.trustRow}>
          <ShieldCheck size={14} color={Colors.TextMuted} strokeWidth={2} />
          <Text style={styles.trustText}>Your entries stay private on your device</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.PrimaryDeep },

  /* Hero */
  heroScroll: { flex: 1 },
  heroContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingTop: 60,
    paddingBottom: 18,
  },
  hero: { alignItems: 'center', paddingHorizontal: 24 },

  mascotStage: {
    width: 230,
    height: 200,
    marginTop: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  halo: {
    position: 'absolute',
    bottom: 6,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  mascotPad: {
    position: 'absolute',
    bottom: 4,
    width: 150,
    height: 18,
    borderRadius: 999,
    backgroundColor: 'rgba(20,19,26,0.18)',
  },
  mascot: { width: 200, height: 200 },

  brand: { marginTop: 10, fontSize: 38, fontWeight: '800', color: Colors.White, letterSpacing: 0.2 },
  tagline: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.82)',
    textAlign: 'center',
  },

  /* Value rail */
  rail: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    alignSelf: 'stretch',
  },
  railItem: { flex: 1, alignItems: 'center', gap: 8 },
  railIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  railText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 11.5,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 15,
  },
  railDivider: { width: 1, height: 34, backgroundColor: 'rgba(255,255,255,0.16)' },

  /* Docked action panel */
  panel: {
    backgroundColor: Colors.White,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 30,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 18,
  },
  panelTitle: { fontSize: 19, fontWeight: '800', color: Colors.TextPrimary, textAlign: 'center' },

  errorChip: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  errorText: { color: '#B91C1C', fontSize: 13.5, textAlign: 'center' },

  primaryButton: {
    minHeight: 56,
    borderRadius: 999,
    backgroundColor: Colors.Primary,
    justifyContent: 'center',
    paddingHorizontal: 8,
    shadowColor: Colors.Primary,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  googleChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.White,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.White,
  },
  inlineSpinner: { width: 36, alignItems: 'center' },

  ghostButton: {
    minHeight: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.PrimaryTint,
  },
  ghostButtonText: { fontSize: 15, fontWeight: '700', color: Colors.PrimaryDark },
  buttonDisabled: { opacity: 0.65 },

  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 2,
  },
  trustText: { fontSize: 12, color: Colors.TextMuted },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.TextMuted,
    fontWeight: '500',
  },
});
