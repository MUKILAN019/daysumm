import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { Mic, Square, Pause, Play, FileText, AlertCircle, Trash2, Check, Clock } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radii } from '../theme/tokens';
import * as Haptics from 'expo-haptics';
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

function getTagStyle(tag: string) {
  switch (tag) {
    case 'blocker':
      return { bg: Colors.TagBlockerBg, text: Colors.TagBlockerText, border: Colors.TagBlockerBorder };
    case 'highlight':
      return { bg: Colors.TagHighlightBg, text: Colors.TagHighlightText, border: Colors.TagHighlightBorder };
    case 'actionItem':
      return { bg: Colors.TagActionBg, text: Colors.TagActionText, border: Colors.TagActionBorder };
    case 'decision':
      return { bg: Colors.TagDecisionBg, text: Colors.TagDecisionText, border: Colors.TagDecisionBorder };
    case 'note':
    default:
      return { bg: Colors.TagNoteBg, text: Colors.TagNoteText, border: Colors.TagNoteBorder };
  }
}

function AnimatedEntryItem({ children }: { children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

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
  const recorderState = useAudioRecorderState(recorder, 200);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecordingSessionActive, setIsRecordingSessionActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const [micModalVisible, setMicModalVisible] = useState(false);
  const [micErrorModalVisible, setMicErrorModalVisible] = useState(false);
  const micPermissionPromiseResolveRef = useRef<((value: boolean) => void) | null>(null);

  const isRecording = recorderState.isRecording;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const processingAnim = useRef(new Animated.Value(1)).current;
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

  // Processing pulse animation
  useEffect(() => {
    if (!isProcessing) {
      processingAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(processingAnim, {
          toValue: 1.15,
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(processingAnim, {
          toValue: 1,
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isProcessing, processingAnim]);

  // Waveform animation
  useEffect(() => {
    if (!isRecording && !isProcessing) {
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
        if (finished && (isRecordingSessionActive || recorderState.isRecording || isProcessing)) {
          animateBar(anim);
        }
      });
    };

    barsAnim.forEach(animateBar);
  }, [isRecording, isProcessing, barsAnim, isRecordingSessionActive, recorderState.isRecording]);

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRecordingSessionActive(false);
    setIsPaused(false);
    await recorder.stop();
    const recordingUri = recorder.uri || recorder.getStatus().url;
    if (recordingUri) {
      setIsProcessing(true);
      await onRecordFinished(recordingUri);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
                      transform: [{ scale: isProcessing ? processingAnim : pulseAnim }],
                      opacity: isRecording || isProcessing ? 1 : 0,
                      backgroundColor: isProcessing ? '#DDD6FE' : Colors.PrimaryTint,
                    },
                  ]}
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={handleMicPress}
                  disabled={isProcessing}
                  style={({ pressed }) => [
                    styles.micButton,
                    isProcessing && { backgroundColor: Colors.Primary },
                    pressed && !isRecording && !isProcessing && styles.micButtonPressed,
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
                        backgroundColor: isProcessing ? Colors.Primary : Colors.Primary,
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
              ) : isProcessing ? (
                <View style={styles.processingStatusContainer}>
                  <ActivityIndicator size="small" color={Colors.Primary} />
                  <Text style={styles.processingStatusText}>Processing voice log…</Text>
                </View>
              ) : (
                <Text style={styles.hintText}>Tap to record</Text>
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
            <Text style={styles.emptyStateText}>No entries yet</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        renderItem={({ item: entry }) => (
          <AnimatedEntryItem key={entry.localId}>
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
                    {entry.tags?.map(tag => {
                      const styleInfo = getTagStyle(tag);
                      return (
                        <View
                          key={tag}
                          style={[
                            styles.tagBadge,
                            {
                              backgroundColor: styleInfo.bg,
                              borderColor: styleInfo.border,
                              borderWidth: 1,
                            },
                          ]}
                        >
                          <Text style={[styles.tagBadgeText, { color: styleInfo.text }]}>
                            {TAG_LABELS[tag] || tag}
                          </Text>
                        </View>
                      );
                    })}
                    {((entry.confidence !== undefined && entry.confidence < 0.6) || entry.needsReview) && !entry.userCorrected && (
                      <View style={styles.reviewBadge}>
                        <AlertCircle size={10} color={Colors.Warning} strokeWidth={2.5} />
                        <Text style={styles.reviewBadgeText}>Needs review</Text>
                      </View>
                    )}
                  </View>
                ) : null}
                <View style={styles.entryMetaRow}>
                  <Text style={styles.entryMeta}>
                    {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <View style={styles.syncIconContainer} accessibilityLabel={entry.synced ? "Synced" : "Local entry"}>
                    {entry.synced ? (
                      <Check size={12} color={Colors.Success} strokeWidth={2.5} />
                    ) : (
                      <Clock size={12} color={Colors.TextMuted} strokeWidth={2} />
                    )}
                  </View>
                </View>
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
          </AnimatedEntryItem>
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
    textAlign: 'center',
  },
  processingStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.PrimaryTint,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radii.button,
  },
  processingStatusText: {
    ...Typography.Secondary,
    color: Colors.PrimaryDeep,
    fontWeight: '700',
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
  entryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  entryMeta: {
    ...Typography.Label,
    color: Colors.TextMuted,
  },
  syncIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
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
