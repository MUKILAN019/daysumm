import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
} from 'expo-audio';

import { insertEntry } from '../db/entries';
import { transcribeAudio } from '../functions/transcribeAudio';
import { requestMicPermissionWithRationale } from '../permissions/requestMicPermission';

interface VoiceCaptureScreenProps {
  onBack: () => void;
  onSaved: () => void;
}

export function VoiceCaptureScreen({ onBack, onSaved }: VoiceCaptureScreenProps) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  const [isTranscribing, setIsTranscribing] = useState(false);
  const [finalText, setFinalText] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isRecording = recorderState.isRecording;

  useEffect(() => {
    if (!isRecording) {
      pulseAnim.setValue(1);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [isRecording, pulseAnim]);

  async function handleMicPress() {
    if (isRecording) {
      await recorder.stop();
      setIsTranscribing(true);
      setStatusMessage('Transcribing…');

      try {
        if (!recorder.uri) {
          throw new Error('No recording URI available');
        }
        const text = await transcribeAudio(recorder.uri);
        setFinalText((prev) => (prev ? `${prev} ${text}`.trim() : text.trim()));
        setStatusMessage('Tap mic to keep going, or Save/Discard');
      } catch (error) {
        console.warn('Transcription failed', error);
        setStatusMessage('Transcription failed — try again');
      } finally {
        setIsTranscribing(false);
      }
      return;
    }

    const granted = await requestMicPermissionWithRationale();
    if (!granted) {
      setStatusMessage('Microphone permission denied');
      return;
    }

    await recorder.prepareToRecordAsync();
    recorder.record();
    setStatusMessage('Listening…');
  }

  async function handleFinalize() {
    const trimmed = finalText.trim();

    if (!trimmed) {
      onBack();
      return;
    }

    try {
      await insertEntry(trimmed, 'voice');
      onSaved();
    } catch (error) {
      console.warn('Voice entry save failed', error);
      setStatusMessage('Save failed');
    }
  }

  function handleDiscard() {
    setFinalText('');
    onBack();
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Voice entry</Text>
      </View>

      <View style={styles.transcriptBox}>
        <Text style={styles.transcriptText}>
          {finalText || (isTranscribing ? 'Transcribing…' : 'Tap the mic and start speaking…')}
        </Text>
      </View>

      <Text style={styles.statusText}>{statusMessage}</Text>

      <View style={styles.micRow}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Pressable
            accessibilityRole="button"
            disabled={isTranscribing}
            onPress={handleMicPress}
            style={[
              styles.micButton,
              isRecording && styles.micButtonActive,
              isTranscribing && styles.micButtonDisabled,
            ]}
          >
            <Text style={styles.micIcon}>{isRecording ? '■' : '🎤'}</Text>
          </Pressable>
        </Animated.View>
      </View>

      {!isRecording && !isTranscribing && finalText.length > 0 && (
        <View style={styles.actionRow}>
          <Pressable accessibilityRole="button" onPress={handleDiscard} style={styles.discardButton}>
            <Text style={styles.discardButtonText}>Discard</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={handleFinalize} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Save entry</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA', paddingHorizontal: 20, paddingTop: 56, gap: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { paddingVertical: 6, paddingHorizontal: 8 },
  backButtonText: { color: '#2563EB', fontSize: 15, fontWeight: '700' },
  title: { color: '#111827', fontSize: 24, fontWeight: '700' },
  transcriptBox: {
    minHeight: 160,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  transcriptText: { color: '#111827', fontSize: 17, lineHeight: 24 },
  statusText: { color: '#6B7280', fontSize: 13, textAlign: 'center' },
  micRow: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },
  micButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
  },
  micButtonActive: { backgroundColor: '#DC2626' },
  micButtonDisabled: { opacity: 0.5 },
  micIcon: { fontSize: 34 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  discardButton: {
    flex: 1, height: 48, alignItems: 'center', justifyContent: 'center',
    borderRadius: 8, backgroundColor: '#E5E7EB',
  },
  discardButtonText: { color: '#111827', fontSize: 15, fontWeight: '700' },
  saveButton: {
    flex: 1, height: 48, alignItems: 'center', justifyContent: 'center',
    borderRadius: 8, backgroundColor: '#2563EB',
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});