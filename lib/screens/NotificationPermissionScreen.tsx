import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Clock, Check } from 'lucide-react-native';
import { ScreenTransition } from '../components/ScreenTransition';
import { AmbientBackground } from '../components/AmbientBackground';

interface NotificationPermissionScreenProps {
  onContinue: (time: string) => Promise<void>;
}

const C = {
  primary: '#6C5CE7',
  primaryDeep: '#4B3FC4',
  primaryDark: '#2E2470',
  tint: '#EFECFE',
  ink: '#111827',
  body: '#4B5563',
  line: '#E5E7EB',
  white: '#FFFFFF',
  muted: '#9CA3AF',
};

const TOP_HEIGHT = 148;

/** Screen 3 — Notifications. Indigo top + white sheet, cat peeking UP over the sheet edge. */
export function NotificationPermissionScreen({ onContinue }: NotificationPermissionScreenProps) {
  const [isRequesting, setIsRequesting] = useState(false);

  const defaultDate = new Date();
  defaultDate.setHours(17, 0, 0, 0);
  const [date, setDate] = useState(defaultDate);
  const [showPicker, setShowPicker] = useState(false);

  async function handleContinue() {
    if (isRequesting) return;
    setIsRequesting(true);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    try {
      await onContinue(`${hours}:${minutes}`);
    } finally {
      setIsRequesting(false);
    }
  }

  const onChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowPicker(false);
    setDate(selectedDate || date);
  };

  return (
    <ScreenTransition style={styles.container}>
      <AmbientBackground isDarkTheme />

      <View style={styles.top}>
        <View style={styles.progressRow}>
          <View style={[styles.progressDot, styles.progressDotDone]} />
          <View style={[styles.progressDot, styles.progressDotDone]} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
        </View>
        <Text style={styles.headerStep}>Step 3 of 3</Text>
      </View>

      <View style={styles.sheet}>
        <Image
          source={require('../../assets/cat-peek.png')}
          style={styles.peek}
          resizeMode="contain"
        />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.eyebrow}>Almost done</Text>
          <Text style={styles.title}>Get your digest the moment it's ready</Text>
          <Text style={styles.subtitle}>
            DaySumm sends your daily digest at the end of your workday — one quiet ping, no
            checking the app.
          </Text>

          <View style={styles.featureList}>
            <FeatureRow label="One quiet ping a day, right when your digest is ready" />
            <FeatureRow label="Never miss a summary of your work" />
            <FeatureRow label="Change the time anytime in settings" />
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => setShowPicker(true)}
            style={({ pressed }) => [styles.timeRow, pressed && styles.timeRowPressed]}
          >
            <View style={styles.timeIcon}>
              <Clock size={18} color={C.primary} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.timeLabel}>Daily digest time</Text>
              <Text style={styles.timeHint}>Tap to change</Text>
            </View>
            <View style={styles.timePill}>
              <Text style={styles.timePillText}>
                {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </Pressable>

          {showPicker && (
            <DateTimePicker
              testID="dateTimePicker"
              value={date}
              mode="time"
              is24Hour={false}
              display="default"
              onChange={onChange}
            />
          )}
        </ScrollView>

        <View style={styles.actionBar}>
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
              <ActivityIndicator color={C.white} />
            ) : (
              <Text style={styles.buttonText}>Enable Notifications</Text>
            )}
          </Pressable>
        </View>
      </View>
    </ScreenTransition>
  );
}

function FeatureRow({ label }: { label: string }) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.checkDot}>
        <Check size={12} color={C.primary} strokeWidth={3} />
      </View>
      <Text style={styles.featureText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.primaryDeep },

  top: { height: TOP_HEIGHT, alignItems: 'center', paddingTop: 52 },
  progressRow: { flexDirection: 'row', gap: 6 },
  progressDot: { width: 24, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)' },
  progressDotActive: { backgroundColor: C.white },
  progressDotDone: { backgroundColor: C.white },
  headerStep: {
    marginTop: 12,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  sheet: {
    flex: 1,
    backgroundColor: C.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  peek: {
    position: 'absolute',
    top: -52,
    width: 128,
    height: 104,
    alignSelf: 'center',
    zIndex: 5,
  },
  sheetContent: {
    paddingHorizontal: 24,
    paddingTop: 68,
    paddingBottom: 16,
    alignItems: 'center',
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: C.primary,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: C.ink,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14.5,
    lineHeight: 21,
    color: C.body,
    marginBottom: 22,
    textAlign: 'center',
  },

  featureList: { alignSelf: 'stretch', gap: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.tint,
    borderColor: C.primary,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { flex: 1, fontSize: 14, lineHeight: 20, color: '#374151', fontWeight: '500' },

  timeRow: {
    alignSelf: 'stretch',
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: C.line,
    backgroundColor: C.white,
  },
  timeRowPressed: { backgroundColor: '#F9FAFB' },
  timeIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: C.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeLabel: { fontSize: 15, fontWeight: '700', color: C.ink },
  timeHint: { fontSize: 12, color: C.muted, marginTop: 2 },
  timePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: C.tint,
  },
  timePillText: { fontSize: 15, fontWeight: '800', color: C.primaryDark },

  actionBar: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: C.white,
  },
  button: {
    width: '100%',
    minHeight: 54,
    borderRadius: 999,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primary,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  buttonPressed: { backgroundColor: C.primaryDeep },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: C.white, fontSize: 16, fontWeight: '700' },
});
