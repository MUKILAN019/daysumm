import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { getAuth } from '@react-native-firebase/auth';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { GlobalHeader } from '../components/GlobalHeader';
import { Colors, Spacing, Typography, Radii } from '../theme/tokens';
import { fetchUserSettings, updateNotificationTime } from '../firestore/userSettings';
import { fetchDailyUsage, updateDailyUsageForTimeChange } from '../firestore/dailyUsage';

interface NotificationSettingsScreenProps {
  onBack: () => void;
}

export function NotificationSettingsScreen({ onBack }: NotificationSettingsScreenProps) {
  const auth = getAuth();
  const user = auth.currentUser;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentNotificationTime, setCurrentNotificationTime] = useState('17:00');
  
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
          
          // Block if within 20 mins of CURRENT scheduled time
          if (nowMins >= currentTargetMins - 20 && nowMins <= currentTargetMins) {
            Alert.alert("Too Close to Digest Time", "You cannot change the notification time within 20 minutes of the scheduled delivery.");
            return;
          }
        } else {
          if (user.isAnonymous) {
            Alert.alert("Limit Reached", "Guest users cannot change the notification time after receiving a digest today. Please log in to unlock this feature.");
            return;
          }
          
          if (timeChangesAfterPush >= 1) {
            Alert.alert("Limit Reached", "You can only change your notification time once per day after receiving a digest.");
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
        
        Alert.alert('Success', 'Notification time updated successfully.');
      }
    } catch (error) {
      console.warn('Failed to save notification time:', error);
      Alert.alert('Error', 'Failed to update notification time. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const onChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    setShowPicker(Platform.OS === 'ios');
    setDate(currentDate);
  };

  const showTimepicker = () => {
    setShowPicker(true);
  };

  return (
    <View style={styles.container}>
      <GlobalHeader title="Notifications" onBack={onBack} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        
        {loading ? (
          <ActivityIndicator size="large" color={Colors.Primary} style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.form}>
            
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Daily Digest Time</Text>
              <Text style={styles.cardSubtitle}>
                Choose when you want to receive your daily digest push notification.
              </Text>
              
              <View style={styles.timePickerContainer}>
                {Platform.OS === 'android' ? (
                  <Pressable style={styles.timeDisplayPill} onPress={showTimepicker}>
                     <Text style={styles.timeDisplayText}>
                       {date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                     </Text>
                  </Pressable>
                ) : null}
                
                {(showPicker || Platform.OS === 'ios') && (
                  <DateTimePicker
                    testID="dateTimePicker"
                    value={date}
                    mode="time"
                    is24Hour={false}
                    display="spinner"
                    onChange={onChange}
                    style={styles.datePicker}
                  />
                )}
              </View>

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
                  <Text style={styles.saveButtonText}>Save Time</Text>
                )}
              </Pressable>
            </View>

            <View style={styles.instructionFooter}>
              <Text style={styles.instructionText}>
                To manage system notifications:
              </Text>
              <Text style={styles.instructionPath}>
                Settings {'>'} App Management {'>'} DaySumm {'>'} Permissions {'>'} Notifications
              </Text>
            </View>
            
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  form: {
    gap: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.Card,
    borderWidth: 1,
    borderColor: Colors.Border,
    borderRadius: Radii.card,
    padding: Spacing.xl,
    shadowColor: Colors.TextPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: {
    ...Typography.SectionHeader,
    color: Colors.TextPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  cardSubtitle: {
    ...Typography.Secondary,
    color: Colors.TextMuted,
    marginBottom: Spacing.xl,
    textAlign: 'center',
    lineHeight: 20,
  },
  timePickerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxl,
  },
  timeDisplayPill: {
    backgroundColor: Colors.PrimaryTint,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 999,
  },
  timeDisplayText: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.PrimaryDeep,
  },
  datePicker: {
    width: '100%',
    height: 120,
  },
  saveButton: {
    height: 52,
    borderRadius: 999,
    backgroundColor: Colors.Primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonPressed: {
    backgroundColor: Colors.PrimaryDeep,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
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
    opacity: 0.8,
  },
});
