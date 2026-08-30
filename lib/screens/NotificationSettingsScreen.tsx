import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { getAuth } from '@react-native-firebase/auth';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Clock, Info, Sparkles } from 'lucide-react-native';
import { GlobalHeader } from '../components/GlobalHeader';
import { Colors, Spacing, Typography, Radii } from '../theme/tokens';
import { fetchUserSettings, updateNotificationTime } from '../firestore/userSettings';
import { fetchDailyUsage, updateDailyUsageForTimeChange } from '../firestore/dailyUsage';
import { CustomModal, CustomModalType } from '../components/CustomModal';
import { AmbientBackground } from '../components/AmbientBackground';

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

        showModal(
          'Delivery Time Saved',
          `Your daily digest will now arrive around ${timeLabel} every day.`,
          'success'
        );
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

  const pendingTime = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  const isDirty = pendingTime !== currentNotificationTime;

  const timeLabel = date
    .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    .toUpperCase();

  return (
    <View style={styles.container}>
      <AmbientBackground />
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

            {/* Time section */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>DELIVERY TIME</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowPicker(true)}
                style={({ pressed }) => [styles.timeCard, pressed && styles.timeCardPressed]}
              >
                <View style={styles.timeIconWrap}>
                  <Clock size={20} color={Colors.PrimaryDeep} strokeWidth={2} />
                </View>
                <View style={styles.timeTextCol}>
                  <Text style={styles.timeValue}>{timeLabel}</Text>
                  <Text style={[styles.timeCaption, isDirty && styles.timeCaptionDirty]}>
                    {isDirty ? 'Unsaved — tap Save to confirm' : 'Tap to change time'}
                  </Text>
                </View>
              </Pressable>

              {showPicker && (
                <View style={styles.pickerCard}>
                  <DateTimePicker
                    testID="dateTimePicker"
                    value={date}
                    mode="time"
                    is24Hour={false}
                    display="default"
                    onChange={onChange}
                  />
                </View>
              )}

              {/* Live Outcome Preview */}
              <View style={styles.previewCard}>
                <Sparkles size={16} color={Colors.PrimaryDeep} strokeWidth={2} />
                <Text style={styles.previewText}>
                  Your daily digest will arrive around <Text style={styles.previewTimeText}>{timeLabel}</Text>
                </Text>
              </View>

              {/* Inline Cutoff Tip */}
              <View style={styles.inlineTipRow}>
                <Info size={14} color={Colors.TextMuted} strokeWidth={2} />
                <Text style={styles.inlineTipText}>
                  Delivery time cannot be changed within <Text style={{ fontWeight: '600', color: Colors.TextPrimary }}>20 minutes</Text> of scheduled time.
                </Text>
              </View>
            </View>

            {/* Info section */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>HELP</Text>
              <View style={styles.infoRow}>
                <Info size={16} color={Colors.TextMuted} strokeWidth={2} />
                <Text style={styles.infoText}>
                  Not getting notifications? Go to{' '}
                  <Text style={styles.infoTextBold}>Settings › App Management › DaySumm › Permissions › Notifications</Text>.
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Save action bar */}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.Background },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: Spacing.xl,
  },

  section: { gap: Spacing.sm },
  sectionLabel: {
    ...Typography.Label,
    color: Colors.TextMuted,
    letterSpacing: 0.5,
  },

  /* Time card */
  timeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.Card,
    borderWidth: 1,
    borderColor: Colors.Border,
    borderRadius: Radii.card,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  timeCardPressed: {
    borderColor: Colors.Primary,
    backgroundColor: Colors.PrimaryTint,
  },

  pickerCard: {
    backgroundColor: Colors.Card,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.Border,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.PrimaryTint,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: 'rgba(108,92,231,0.2)',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  previewText: {
    ...Typography.Secondary,
    color: Colors.TextPrimary,
    flex: 1,
  },
  previewTimeText: {
    fontWeight: '800',
    color: Colors.PrimaryDeep,
  },
  inlineTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  inlineTipText: {
    ...Typography.Secondary,
    fontSize: 12.5,
    color: Colors.TextMuted,
    flex: 1,
  },
  timeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    color: Colors.TextMuted,
    marginTop: 2,
  },
  timeCaptionDirty: {
    color: Colors.Warning,
    fontWeight: '600',
  },

  /* Info rows */
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  infoText: {
    ...Typography.Secondary,
    color: Colors.TextSecondary,
    flex: 1,
    lineHeight: 20,
  },
  infoTextBold: {
    fontWeight: '600',
    color: Colors.TextPrimary,
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
  saveButtonDisabled: { opacity: 0.5, shadowOpacity: 0, elevation: 0 },
  saveButtonText: {
    ...Typography.Body,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
