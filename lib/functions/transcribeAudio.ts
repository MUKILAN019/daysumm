import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { File } from 'expo-file-system';
import NetInfo from '@react-native-community/netinfo';

export class TranscriptionTimeoutError extends Error {
  constructor(message = 'Transcription timed out') {
    super(message);
    this.name = 'TranscriptionTimeoutError';
  }
}

export class TranscriptionOfflineError extends Error {
  constructor(message = 'Device is offline') {
    super(message);
    this.name = 'TranscriptionOfflineError';
  }
}

const TRANSCRIPTION_TIMEOUT_MS = 10000; // 10 seconds timeout

export async function transcribeAudio(fileUri: string): Promise<{ text: string; textEn: string }> {
  const netState = await NetInfo.fetch();
  if (netState.isConnected === false || netState.isInternetReachable === false) {
    throw new TranscriptionOfflineError('Internet connection is offline.');
  }

  const file = new File(fileUri);
  const audioBase64 = await file.base64();

  const functions = getFunctions();
  const callable = httpsCallable(functions, 'transcribeAudio');

  const timeoutPromise = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      clearTimeout(timer);
      reject(new TranscriptionTimeoutError(`Transcription timed out after ${TRANSCRIPTION_TIMEOUT_MS / 1000}s`));
    }, TRANSCRIPTION_TIMEOUT_MS);
  });

  const transcribePromise = (async () => {
    const result = await callable({
      audioBase64,
      mimeType: 'audio/m4a',
    });
    const { text, textEn } = result.data as { text: string; textEn: string };
    return { text, textEn };
  })();

  return Promise.race([transcribePromise, timeoutPromise]);
}