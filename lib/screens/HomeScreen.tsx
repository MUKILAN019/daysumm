import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  type GestureResponderEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
} from 'react-native';
import { Mic, Square, Pause, Play, FileText, AlertCircle, Trash2 } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radii } from '../theme/tokens';
import { useAudioRecorder, useAudioRecorderState, RecordingPresets, getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import { CustomModal } from '../components/CustomModal';
import { LocalEntry } from '../db/entries';
import { GlobalHeader } from '../components/GlobalHeader';
import { StreakBadge } from '../components/StreakBadge';
import { AmbientBackground } from '../components/AmbientBackground';

interface HomeScreenProps {
  userName?: string;
  currentStreak: number;
  entries: LocalEntry[];
  onRecordFinished: (uri: string) => Promise<void>;
  onEntryPress?: (entry: LocalEntry) => void;
  onDeleteEntryPress?: (entry: LocalEntry) => void;
}

const TAG_LABELS: Record<string, string> = {
  highlight: 'Done',
  actionItem: 'To-do',
  blocker: 'Blocked',
  decision: 'Decision',
  note: 'Note',
};

function formatTime(millis: number) {
  const totalSeconds = Math.floor(millis / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

export function HomeScreen({
  userName = 'User',
  currentStreak,
  entries,
  onRecordFinished,
  onEntryPress,
  onDeleteEntryPress,
}: HomeScreenProps) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecordingSessionActive, setIsRecordingSessionActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const [micModalVisible, setMicModalVisible] = useState(false);
  const [micErrorModalVisible, setMicErrorModalVisible] = useState(false);
  const micPermissionPromiseResolveRef = useRef<((value: boolean) => void) | null>(null);

  const isRecording = recorderState.isRecording;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const barsAnim = useRef([
    new Animated.Value(0.2),
    new Animated.Value(0.4),
    new Animated.Value(0.6),
    new Animated.Value(0.4),
    new Animated.Value(0.2),
  ]).current;

  // Pulse animation for halo
  useEffect(() => {
    if (!isRecording) {
      pulseAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isRecording, pulseAnim]);

  // Waveform animation
  useEffect(() => {
    if (!isRecording) {
      barsAnim.forEach((anim) => anim.setValue(0.2));
      return;
    }

    const animateBar = (anim: Animated.Value) => {
      Animated.sequence([
        Animated.timing(anim, {
          toValue: Math.random() * 0.8 + 0.2, // Random value between 0.2 and 1
          duration: 200 + Math.random() * 200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished && recorder.isRecording) {
          animateBar(anim);
        }
      });
    };

    barsAnim.forEach(animateBar);
  }, [isRecording, barsAnim, recorder.isRecording]);

  const dateStr = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  async function handleMicPress() {
    if (isRecordingSessionActive && !isPaused) {
      handleStop();
      return;
    }
    
    if (isPaused) {
      // Resume
      recorder.record();
      setIsPaused(false);
      return;
    }

    // New session
    let granted = false;
    const current = await getRecordingPermissionsAsync();
    
    if (current.granted) {
      granted = true;
    } else if (current.canAskAgain) {
      const proceed = await new Promise<boolean>((resolve) => {
        micPermissionPromiseResolveRef.current = resolve;
        setMicModalVisible(true);
      });
      if (proceed) {
        const result = await requestRecordingPermissionsAsync();
        granted = result.granted;
      }
    } else {
      const result = await requestRecordingPermissionsAsync();
      granted = result.granted;
    }

    if (!granted) {
      setMicErrorModalVisible(true);
      return;
    }
    await recorder.prepareToRecordAsync();
    recorder.record();
    setIsRecordingSessionActive(true);
    setIsPaused(false);
  }

  function handlePause() {
    if (isRecording) {
      recorder.pause();
      setIsPaused(true);
    }
  }

  async function handleStop() {
    if (!isRecordingSessionActive) return;
    setIsRecordingSessionActive(false);
    setIsPaused(false);
    await recorder.stop();
    if (recorder.uri) {
      setIsProcessing(true);
      await onRecordFinished(recorder.uri);
      setIsProcessing(false);
    }
  }

  return (
    <View style={styles.container}>
      <AmbientBackground />
      <GlobalHeader 
        title="Voice Log" 
        subtitle="Record your thoughts"
        rightAction={<StreakBadge currentStreak={currentStreak} />}
      />
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        data={entries}
        keyExtractor={(entry) => entry.localId}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Mic Capture Area */}
            <View style={styles.captureArea}>
              <View style={styles.micContainer}>
                <Animated.View
                  style={[
                    styles.micHalo,
                    {
                      transform: [{ scale: pulseAnim }],
                      opacity: isRecording ? 1 : 0,
                    },
                  ]}
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={handleMicPress}
                  style={({ pressed }) => [
                    styles.micButton,
                    pressed && !isRecording && styles.micButtonPressed,
                  ]}
                >
                  <Mic size={40} strokeWidth={1.75} color={Colors.Background} />
                </Pressable>
              </View>

              {/* Waveform */}
              <View style={styles.waveformContainer}>
                {barsAnim.map((anim, i) => (
                  <Animated.View
                    key={i}
                    style={[
                      styles.waveformBar,
                      {
                        transform: [{ scaleY: anim }],
                      },
                    ]}
                  />
                ))}
              </View>

              {/* Timer & Controls */}
              {isRecordingSessionActive ? (
                <View style={styles.recordingControls}>
                  <Pressable style={styles.secondaryButton} onPress={isPaused ? handleMicPress : handlePause}>
                    {isPaused ? (
                      <Play size={20} strokeWidth={1.75} color={Colors.TextPrimary} />
                    ) : (
                      <Pause size={20} strokeWidth={1.75} color={Colors.TextPrimary} />
                    )}
                  </Pressable>
                  <Text style={styles.timerText}>{formatTime(recorderState.durationMillis)}</Text>
                  <Pressable style={styles.stopButton} onPress={handleStop}>
                    <Square size={16} strokeWidth={2.5} color={Colors.Background} fill={Colors.Background} />
                  </Pressable>
                </View>
              ) : (
                <Text style={styles.hintText}>
                  {isProcessing ? 'Processing...' : 'Tap to record • Hold for continuous capture'}
                </Text>
              )}
            </View>

            {/* Recent Entries Header */}
            <View style={styles.recentHeaderRow}>
              <Text style={styles.recentTitle}>All Entries</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Image source={require('../../assets/cat-lying-waiting.png')} style={styles.emptyStateImage} resizeMode="contain" />
            <Text style={styles.emptyStateText}>No entries yet. Start recording or typing!</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        renderItem={({ item: entry }) => (
          <Pressable
            style={styles.entryItem}
            onPress={() => onEntryPress?.(entry)}
          >
            <View style={styles.entryIconWrapper}>
              {entry.source === 'voice' ? (
                <Mic size={14} color={Colors.PrimaryDeep} />
              ) : (
                <FileText size={14} color={Colors.PrimaryDeep} />
              )}
            </View>
            <View style={styles.entryTextContent}>
              <Text style={styles.entryText} numberOfLines={2}>{entry.text}</Text>
              {(entry.tags && entry.tags.length > 0) || (((entry.confidence !== undefined && entry.confidence < 0.6) || entry.needsReview) && !entry.userCorrected) ? (
                <View style={styles.tagsContainer}>
                  {entry.tags?.map(tag => (
                    <View key={tag} style={styles.tagBadge}>
                      <Text style={styles.tagBadgeText}>{TAG_LABELS[tag] || tag}</Text>
                    </View>
                  ))}
                  {((entry.confidence !== undefined && entry.confidence < 0.6) || entry.needsReview) && !entry.userCorrected && (
                    <View style={styles.reviewBadge}>
                      <AlertCircle size={10} color={Colors.Warning} strokeWidth={2.5} />
                      <Text style={styles.reviewBadgeText}>Needs review</Text>
                    </View>
                  )}
                </View>
              ) : null}
              <Text style={styles.entryMeta}>
                {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {entry.synced ? 'Synced' : 'Local'}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete entry"
              hitSlop={8}
              onPress={(event: GestureResponderEvent) => {
                event.stopPropagation();
                onDeleteEntryPress?.(entry);
              }}
              style={({ pressed }) => [
                styles.deleteButton,
                pressed && styles.deleteButtonPressed,
              ]}
            >
              <Trash2 size={16} color={Colors.Danger} strokeWidth={2} />
            </Pressable>
          </Pressable>
        )}
      />
      {/* Mic Rationale Modal */}
      <CustomModal
        visible={micModalVisible}
        title="Microphone access"
        message="DaySumm uses your microphone to turn spoken notes into text entries. Audio is only used for transcription and is not stored."
        type="info"
        primaryButtonText="Continue"
        onPrimaryPress={() => {
          setMicModalVisible(false);
          if (micPermissionPromiseResolveRef.current) {
            micPermissionPromiseResolveRef.current(true);
            micPermissionPromiseResolveRef.current = null;
          }
        }}
        secondaryButtonText="Not now"
        onSecondaryPress={() => {
          setMicModalVisible(false);
          if (micPermissionPromiseResolveRef.current) {
            micPermissionPromiseResolveRef.current(false);
            micPermissionPromiseResolveRef.current = null;
          }
        }}
      />

      {/* Mic Error Modal */}
      <CustomModal
        visible={micErrorModalVisible}
        title="Microphone Required"
        message="Microphone access is required to capture voice entries. Please enable it in your device settings."
        type="warning"
        primaryButtonText="OK"
        onPrimaryPress={() => setMicErrorModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Background,
  },
  content: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  captureArea: {
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.md,
    minHeight: 240,
  },
  micContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  micHalo: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.PrimaryTint,
  },
  micButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.Primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  micButtonPressed: {
    backgroundColor: Colors.PrimaryDark,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
    gap: 4,
    marginBottom: Spacing.md,
  },
  waveformBar: {
    width: 4,
    height: 32,
    borderRadius: 2,
    backgroundColor: Colors.Primary,
  },
  recordingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  secondaryButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.Surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.Danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontFamily: 'monospace',
    fontSize: 20,
    fontWeight: '600',
    color: Colors.TextPrimary,
    width: 70,
    textAlign: 'center',
  },
  hintText: {
    ...Typography.Secondary,
    color: Colors.TextMuted,
    marginTop: Spacing.xs,
  },
  recentSection: {
    width: '100%',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  recentTitle: {
    ...Typography.Label,
    color: Colors.TextMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recentHeaderRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    marginTop: 0,
  },
  emptyState: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  emptyStateImage: {
    width: 140,
    height: 140,
    opacity: 0.9,
  },
  emptyStateText: {
    ...Typography.Secondary,
    color: Colors.TextMuted,
  },
  entryItem: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.Card,
    borderWidth: 1,
    borderColor: Colors.Border,
    borderRadius: Radii.card,
    padding: Spacing.sm,
    gap: Spacing.sm,
    position: 'relative',
  },
  entryIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.PrimaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryTextContent: {
    flex: 1,
    gap: 2,
    paddingRight: 34,
  },
  entryText: {
    ...Typography.Body,
    color: Colors.TextPrimary,
    lineHeight: 20,
  },
  entryMeta: {
    ...Typography.Label,
    color: Colors.TextMuted,
    marginTop: 2,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
    marginBottom: 2,
  },
  tagBadge: {
    backgroundColor: Colors.PrimaryTint,
    borderRadius: Radii.chip,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagBadgeText: {
    ...Typography.Label,
    color: Colors.PrimaryDeep,
    fontSize: 10,
  },
  reviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.Warning + '15', // Soft tinted background
    borderRadius: Radii.chip,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.Warning + '40',
  },
  reviewBadgeText: {
    ...Typography.Label,
    color: Colors.Warning,
    fontSize: 10,
    fontWeight: '700',
  },
  deleteButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.72,
  },
  deleteButtonPressed: {
    backgroundColor: Colors.Danger + '12',
    opacity: 1,
  },
});
