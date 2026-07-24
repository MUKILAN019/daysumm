import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Platform, Image } from 'react-native';
import { getAuth } from '@react-native-firebase/auth';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Clock } from 'lucide-react-native';
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
    setShowPicker(Platform.OS === 'ios');
    setDate(currentDate);
  };

  const showTimepicker = () => setShowPicker(true);

  return (
    <View style={styles.container}>
      <GlobalHeader title="Notifications" onBack={onBack} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.Primary} style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.form}>
            <View style={styles.card}>
              {/* Mascot in a teal ring */}
              <View style={styles.mascotRingOuter}>
                <View style={styles.mascotRingInner}>
                  <Image
                    source={require('../../assets/owl-bell.png')}
                    style={styles.mascot}
                    resizeMode="contain"
                  />
                </View>
              </View>

              <Text style={styles.cardTitle}>Daily Digest Time</Text>
              <Text style={styles.cardSubtitle}>
                Pick when your owl should deliver your daily digest.
              </Text>

              <Pressable style={styles.timeDisplayPill} onPress={showTimepicker}>
                <Clock size={18} color={Colors.PrimaryDeep} />
                <Text style={styles.timeDisplayText}>
                  {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </Pressable>

              {showPicker && Platform.OS === 'android' && (
                <DateTimePicker
                  testID="dateTimePicker"
                  value={date}
                  mode="time"
                  is24Hour={false}
                  display="default"
                  onChange={onChange}
                />
              )}

              <Pressable
                accessibilityRole="button"
                onPress={handleSave}
                disabled={saving}
                style={({ pressed }) => [
                  styles.saveButton,
                  pressed && styles.saveButtonPressed,
                  saving && styles.saveButtonDisabled,
                ]}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save time</Text>
                )}
              </Pressable>
            </View>

            <View style={styles.instructionFooter}>
              <Text style={styles.instructionText}>To manage system notifications</Text>
              <Text style={styles.instructionPath}>
                Settings › App Management › DaySumm › Permissions › Notifications
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <CustomModal
        visible={modalVisible}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        primaryButtonText="Got it"
        onPrimaryPress={() => setModalVisible(false)}
      />

      {Platform.OS === 'ios' && (
        <CustomModal
          visible={showPicker}
          title="Select time"
          type="info"
          primaryButtonText="Confirm"
          onPrimaryPress={() => setShowPicker(false)}
        >
          <DateTimePicker
            testID="dateTimePicker"
            value={date}
            mode="time"
            is24Hour={false}
            display="spinner"
            onChange={onChange}
            style={styles.datePicker}
          />
        </CustomModal>
      )}
    </View>
  );
}

const MASCOT_SIZE = 96;
const RING_SIZE = 132;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Background,
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  form: { gap: Spacing.xl },
  card: {
    backgroundColor: Colors.Card,
    borderWidth: 1,
    borderColor: Colors.Border,
    borderRadius: Radii.card,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  mascotRingOuter: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    backgroundColor: Colors.PrimaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  mascotRingInner: {
    width: RING_SIZE - 12,
    height: RING_SIZE - 12,
    borderRadius: (RING_SIZE - 12) / 2,
    backgroundColor: Colors.Card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascot: {
    width: MASCOT_SIZE,
    height: MASCOT_SIZE,
  },
  cardTitle: {
    ...Typography.SectionHeader,
    color: Colors.TextPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  cardSubtitle: {
    ...Typography.Secondary,
    color: Colors.TextMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  timeDisplayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.PrimaryTint,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 999,
    marginBottom: Spacing.xl,
  },
  timeDisplayText: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.PrimaryDeep,
    letterSpacing: 0.5,
  },
  datePicker: {
    width: '100%',
    height: 200,
  },
  saveButton: {
    alignSelf: 'stretch',
    height: 52,
    borderRadius: 999,
    backgroundColor: Colors.Primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonPressed: { backgroundColor: Colors.PrimaryDeep },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  instructionFooter: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    gap: 4,
  },
  instructionText: {
    ...Typography.Label,
    color: Colors.TextMuted,
    textAlign: 'center',
  },
  instructionPath: {
    ...Typography.Secondary,
    fontSize: 11,
    color: Colors.TextMuted,
    textAlign: 'center',
    opacity: 0.85,
  },
});
