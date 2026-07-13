import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { File } from 'expo-file-system';

export async function transcribeAudio(fileUri: string): Promise<string> {
  const file = new File(fileUri);
  const audioBase64 = await file.base64();

  const functions = getFunctions();
  const callable = httpsCallable(functions, 'transcribeAudio');

  const result = await callable({
    audioBase64,
    mimeType: 'audio/m4a',
  });

  const { text } = result.data as { text: string };
  return text;
}