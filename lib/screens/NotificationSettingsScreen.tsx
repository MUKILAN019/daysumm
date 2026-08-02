import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Image } from 'react-native';
import { getAuth } from '@react-native-firebase/auth';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Clock, ChevronRight, Info } from 'lucide-react-native';
import { GlobalHeader } from '../components/GlobalHeader';
import { Colors, Spacing, Typography, Radii } from '../theme/tokens';
import { fetchUserSettings, updateNotificationTime } from '../firestore/userSettings';
import { fetchDailyUsage, updateDailyUsageForTimeChange } from '../firestore/dailyUsage';
import { CustomModal, CustomModalType } from '../components/CustomModal';

interface NotificationSettingsScreenProps {
  onBack: () => void;
}

export function NotificationSettingsScreen({ onBack }: NotificationSettingsScreenProps) {
  const auth = getAuth();
  const user = auth.currentUser;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentNotificationTime, setCurrentNotificationTime] = useState('17:00');

  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    type: 'info' as CustomModalType,
  });

  const showModal = (title: string, message: string, type: CustomModalType) => {
    setModalConfig({ title, message, type });
    setModalVisible(true);
  };

  const defaultDate = new Date();
  defaultDate.setHours(17, 0, 0, 0);
  const [date, setDate] = useState(defaultDate);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      if (user?.uid) {
        try {
          const settings = await fetchUserSettings(user.uid);
          if (settings?.notificationTime) {
            setCurrentNotificationTime(settings.notificationTime);
            const [hours, minutes] = settings.notificationTime.split(':');
            const newDate = new Date();
            newDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
            setDate(newDate);
          }
        } catch (error) {
          console.warn('Failed to load notification settings:', error);
        }
      }
      setLoading(false);
    }
    loadSettings();
  }, [user]);

  function getLocalDateKey() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (user) {
        const dateKey = getLocalDateKey();
        const usage = await fetchDailyUsage(user.uid, dateKey);

        const pushSent = usage?.pushSent || false;
        const timeChangesAfterPush = usage?.timeChangesAfterPush || 0;

        if (!pushSent) {
          const [currentHourStr, currentMinStr] = currentNotificationTime.split(':');
          const currentTargetMins = parseInt(currentHourStr, 10) * 60 + parseInt(currentMinStr, 10);

          const today = new Date();
          const nowMins = today.getHours() * 60 + today.getMinutes();

          if (nowMins >= currentTargetMins - 20 && nowMins <= currentTargetMins) {
            showModal('Too Close to Digest Time', 'You cannot change the notification time within 20 minutes of the scheduled delivery.', 'warning');
            return;
          }
        } else {
          const isGuest = user.isAnonymous || user.providerData.length === 0;
          if (isGuest) {
            showModal('Limit Reached', 'Guest users cannot change the notification time after receiving a digest today. Please log in to unlock this feature.', 'warning');
            return;
          }

          if (timeChangesAfterPush >= 1) {
            showModal('Limit Reached', 'You can only change your notification time once per day after receiving a digest.', 'warning');
            return;
          }
        }

        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const timeString = `${hours}:${minutes}`;
        await updateNotificationTime(user.uid, timeString);
        setCurrentNotificationTime(timeString);

        if (pushSent) {
          await updateDailyUsageForTimeChange(user.uid, dateKey, timeChangesAfterPush + 1);
        }

        showModal('All set', 'Your daily digest time has been updated.', 'success');
      }
    } catch (error) {
      console.warn('Failed to save notification time:', error);
      showModal('Something went wrong', 'We could not update your notification time. Please try again.', 'warning');
    } finally {
      setSaving(false);
    }
  }

  const onChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    setShowPicker(false);
    setDate(currentDate);
  };

  const showTimepicker = () => setShowPicker(true);

  const pendingTime = `${date.getHours().toString().padStart(2, '0')}:${date
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
  const isDirty = pendingTime !== currentNotificationTime;

  const timeLabel = date
    .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    .toUpperCase();

  return (
    <View style={styles.container}>
      <GlobalHeader title="Notifications" onBack={onBack} />

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.Primary} />
        </View>
      ) : (
        <>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero band with mascot */}
            <View style={styles.hero}>
              <View style={styles.heroBlobA} />
              <View style={styles.heroBlobB} />
              <View style={styles.heroMascotWrap}>
                <Image
                  source={require('../../assets/owl-bell.png')}
                  style={styles.heroMascot}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.heroTitle}>Daily digest time</Text>
              <Text style={styles.heroSubtitle}>
                Your owl rings once a day with everything you logged.
              </Text>
            </View>

            {/* Time selector */}
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>DELIVERY TIME</Text>

              <Pressable
                accessibilityRole="button"
                onPress={showTimepicker}
                style={({ pressed }) => [styles.timeRow, pressed && styles.timeRowPressed]}
              >
                <View style={styles.timeIconWrap}>
                  <Clock size={20} color={Colors.PrimaryDeep} />
                </View>
                <View style={styles.timeTextCol}>
                  <Text style={styles.timeValue}>{timeLabel}</Text>
                  <Text style={styles.timeCaption}>
                    {isDirty ? 'Unsaved — tap save to confirm' : 'Currently scheduled'}
                  </Text>
                </View>
                <ChevronRight size={20} color={Colors.TextMuted} />
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

              <View style={styles.noteRow}>
                <Info size={15} color={Colors.PrimaryDark} />
                <Text style={styles.noteText}>
                  Time can&apos;t be changed within 20 minutes of delivery.
                </Text>
              </View>
            </View>

            {/* System settings info */}
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Not receiving notifications?</Text>
              <Text style={styles.infoBody}>
                Enable them for DaySumm in your device settings:
              </Text>
              <View style={styles.pathBox}>
                <Text style={styles.pathText}>
                  Settings › App Management › DaySumm › Permissions › Notifications
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Sticky save */}
          <View style={styles.actionBar}>
            <Pressable
              accessibilityRole="button"
              onPress={handleSave}
              disabled={saving || !isDirty}
              style={({ pressed }) => [
                styles.saveButton,
                (!isDirty || saving) && styles.saveButtonDisabled,
                pressed && isDirty && !saving && styles.saveButtonPressed,
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save time</Text>
              )}
            </Pressable>
          </View>
        </>
      )}

      <CustomModal
        visible={modalVisible}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        primaryButtonText="Got it"
        onPrimaryPress={() => setModalVisible(false)}
      />
    </View>
  );
}

const MASCOT_SIZE = 112;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.Background },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },

  /* Hero */
  hero: {
    backgroundColor: Colors.PrimaryTint,
    borderRadius: Radii.sheet,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.18)',
    alignItems: 'center',
    paddingTop: 22,
    paddingBottom: 24,
    paddingHorizontal: Spacing.md,
    overflow: 'hidden',
  },
  heroBlobA: {
    position: 'absolute',
    top: -46,
    right: -34,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(52,211,153,0.20)',
  },
  heroBlobB: {
    position: 'absolute',
    bottom: -60,
    left: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(16,185,129,0.12)',
  },
  heroMascotWrap: {
    width: MASCOT_SIZE + 20,
    height: MASCOT_SIZE + 20,
    borderRadius: (MASCOT_SIZE + 20) / 2,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroMascot: { width: MASCOT_SIZE, height: MASCOT_SIZE },
  heroTitle: {
    ...Typography.SectionHeader,
    color: Colors.PrimaryDeep,
    textAlign: 'center',
  },
  heroSubtitle: {
    ...Typography.Secondary,
    color: Colors.TextSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 6,
    paddingHorizontal: Spacing.sm,
  },

  /* Time card */
  card: {
    backgroundColor: Colors.Card,
    borderWidth: 1,
    borderColor: Colors.Border,
    borderRadius: Radii.card,
    padding: 16,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionLabel: { ...Typography.Label, color: Colors.TextMuted },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.Background,
    borderWidth: 1,
    borderColor: Colors.Border,
    borderRadius: Radii.card,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  timeRowPressed: {
    backgroundColor: Colors.PrimaryTint,
    borderColor: Colors.Primary,
  },
  timeIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.PrimaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeTextCol: { flex: 1 },
  timeValue: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.TextPrimary,
    letterSpacing: 0.5,
  },
  timeCaption: {
    ...Typography.Secondary,
    fontSize: 12,
    color: Colors.TextMuted,
    marginTop: 2,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.PrimaryTint,
    borderRadius: Radii.chip,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  noteText: {
    ...Typography.Secondary,
    fontSize: 12.5,
    color: Colors.PrimaryDeep,
    flex: 1,
    lineHeight: 18,
  },

  /* Info */
  infoCard: {
    backgroundColor: Colors.Card,
    borderWidth: 1,
    borderColor: Colors.Border,
    borderRadius: Radii.card,
    padding: 16,
    gap: 6,
  },
  infoTitle: { ...Typography.Body, fontWeight: '700', color: Colors.TextPrimary },
  infoBody: { ...Typography.Secondary, color: Colors.TextSecondary, lineHeight: 19 },
  pathBox: {
    marginTop: 6,
    backgroundColor: Colors.Background,
    borderRadius: Radii.chip,
    borderWidth: 1,
    borderColor: Colors.Divider,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  pathText: {
    ...Typography.Secondary,
    fontSize: 12.5,
    color: Colors.TextSecondary,
    lineHeight: 18,
  },

  /* Action bar */
  actionBar: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: Colors.Surface,
    borderTopWidth: 1,
    borderTopColor: Colors.Divider,
  },
  saveButton: {
    height: 54,
    borderRadius: Radii.button,
    backgroundColor: Colors.Primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.Primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 4,
  },
  saveButtonPressed: { backgroundColor: Colors.PrimaryDark },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: {
    ...Typography.Body,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
