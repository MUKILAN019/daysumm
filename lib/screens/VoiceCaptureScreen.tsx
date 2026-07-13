import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  AppState,
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
import { File } from 'expo-file-system';

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
  const [failedUri, setFailedUri] = useState<string | null>(null); // for retry without re-recording

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isRecording = recorderState.isRecording;
  const savedUrisRef = useRef<string[]>([]); // every segment's temp file, cleaned up on save/discard

  // --- Pulsing animation while recording ---
  useEffect(() => {
    if (!isRecording) {
      pulseAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isRecording, pulseAnim]);

  // --- Edge case: app backgrounded mid-recording ---
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active' && recorderState.isRecording) {
        // Stop gracefully rather than let the OS kill the recording session
        recorder.stop().then(async () => {
          if (recorder.uri) {
            await transcribeAndAppend(recorder.uri, 'Paused — app was backgrounded mid-recording');
          }
        }).catch((error) => {
          console.warn('Failed to stop recorder on background', error);
        });
      }
    });

    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorderState.isRecording]);

  function cleanupFile(uri: string) {
    try {
      new File(uri).delete();
    } catch (error) {
      console.warn('Failed to delete temp audio file', uri, error);
    }
  }

  async function transcribeAndAppend(uri: string, fallbackStatus: string) {
    setIsTranscribing(true);
    setStatusMessage('Transcribing…');
    setFailedUri(null);

    try {
      const text = await transcribeAudio(uri);
      const trimmedText = text.trim();

      if (!trimmedText) {
        // Edge case: no speech detected in this segment
        setStatusMessage('No speech detected in that segment — try again');
        cleanupFile(uri);
        return;
      }

      setFinalText((prev) => (prev ? `${prev} ${trimmedText}`.trim() : trimmedText));
      savedUrisRef.current.push(uri);
      setStatusMessage(fallbackStatus || 'Tap mic to add more, or Save/Discard');
    } catch (error) {
      console.warn('Transcription failed', error);
      // Edge case: Groq/network failure — keep the file, offer retry, don't lose earlier segments
      setFailedUri(uri);
      setStatusMessage('Transcription failed — tap Retry (your recording is still saved)');
    } finally {
      setIsTranscribing(false);
    }
  }

  async function handleMicPress() {
    if (isRecording) {
      await recorder.stop();

      if (!recorder.uri) {
        setStatusMessage('No recording captured — try again');
        return;
      }

      await transcribeAndAppend(recorder.uri, '');
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

  async function handleRetry() {
    if (!failedUri) return;
    await transcribeAndAppend(failedUri, '');
  }

  async function handleFinalize() {
    const trimmed = finalText.trim();

    if (!trimmed) {
      // Edge case: nothing was ever transcribed — don't save an empty entry
      cleanupAllFiles();
      onBack();
      return;
    }

    try {
      await insertEntry(trimmed, 'voice');
      cleanupAllFiles();
      onSaved();
    } catch (error) {
      console.warn('Voice entry save failed', error);
      setStatusMessage('Save failed — your text is still here, try Save again');
    }
  }

  function cleanupAllFiles() {
    savedUrisRef.current.forEach(cleanupFile);
    savedUrisRef.current = [];
    if (failedUri) cleanupFile(failedUri);
  }

  function handleDiscard() {
    cleanupAllFiles();
    setFinalText('');
    setFailedUri(null);
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

      {failedUri && (
        <Pressable accessibilityRole="button" onPress={handleRetry} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Retry transcription</Text>
        </Pressable>
      )}

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
    minHeight: 160, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8,
    backgroundColor: '#FFFFFF', padding: 14,
  },
  transcriptText: { color: '#111827', fontSize: 17, lineHeight: 24 },
  statusText: { color: '#6B7280', fontSize: 13, textAlign: 'center' },
  retryButton: {
    alignSelf: 'center', height: 40, paddingHorizontal: 16, alignItems: 'center',
    justifyContent: 'center', borderRadius: 8, backgroundColor: '#FEF2F2',
    borderWidth: 1, borderColor: '#FCA5A5',
  },
  retryButtonText: { color: '#B91C1C', fontSize: 14, fontWeight: '700' },
  micRow: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },
  micButton: {
    width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center',
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