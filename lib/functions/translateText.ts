import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

export async function translateText(text: string): Promise<string> {
  const functions = getFunctions();
  const callable = httpsCallable(functions, 'translateText');

  const result = await callable({ text });

  const { textEn } = result.data as { textEn: string };
  return textEn;
}
