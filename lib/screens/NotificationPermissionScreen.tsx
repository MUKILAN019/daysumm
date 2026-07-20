import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ScreenTransition } from '../components/ScreenTransition';

interface NotificationPermissionScreenProps {
  onContinue: () => Promise<void>;
}

/**
 * Screen 3 — Notifications. Teal top + white sheet, with owl-peek
 * peeking UP over the sheet edge, bridging the two zones.
 */
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
    <ScreenTransition style={styles.container}>
      <View style={styles.top}>
        <View style={styles.progressRow}>
          <View style={[styles.progressDot, styles.progressDotDone]} />
          <View style={[styles.progressDot, styles.progressDotDone]} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
        </View>
      </View>

      <View style={styles.sheet}>
        <Image
          source={require('../../assets/owl-peek.png')}
          style={styles.peek}
          resizeMode="contain"
        />

        <View style={styles.contentBlock}>
          <Text style={styles.eyebrow}>Almost done</Text>
          <Text style={styles.title}>Get your digest the moment it's ready</Text>
          <Text style={styles.subtitle}>
            DaySumm sends your daily digest at the end of your workday. Turn on notifications
            so you don't have to keep checking the app.
          </Text>

          <View style={styles.featureList}>
            <FeatureRow label="One quiet ping a day, right when your digest is ready" />
            <FeatureRow label="Never miss a summary of your work" />
            <FeatureRow label="Choose your own time anytime in settings" />
          </View>
        </View>

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
    </ScreenTransition>
  );
}

function FeatureRow({ label }: { label: string }) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.checkDot}>
        <View style={styles.checkMark} />
      </View>
      <Text style={styles.featureText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#10B981' },
  top: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 48,
  },
  progressRow: { flexDirection: 'row', gap: 6 },
  progressDot: {
    width: 24,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  progressDotActive: { backgroundColor: '#FFFFFF' },
  progressDotDone: { backgroundColor: '#FFFFFF' },
  sheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 32,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  peek: {
    position: 'absolute',
    top: -48,
    width: 130,
    height: 104,
    alignSelf: 'center',
  },
  contentBlock: {
    alignItems: 'center',
    marginTop: 8,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#10B981',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    color: '#4B5563',
    marginBottom: 24,
    textAlign: 'center',
  },
  featureList: {
    alignSelf: 'stretch',
    gap: 12,
    paddingHorizontal: 4,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    width: 8,
    height: 4,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#10B981',
    transform: [{ rotate: '-45deg' }],
    marginTop: -2,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
    fontWeight: '500',
  },
  button: {
    width: '100%',
    minHeight: 54,
    borderRadius: 999,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  buttonPressed: { backgroundColor: '#0F9B75' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
