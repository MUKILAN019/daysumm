import { Alert } from 'react-native';
import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio';

export async function requestMicPermissionWithRationale(): Promise<boolean> {
  const current = await getRecordingPermissionsAsync();

  if (current.granted) {
    return true;
  }

  if (current.canAskAgain) {
    const proceed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        'Microphone access',
        'DaySumm uses your microphone to turn spoken notes into text entries. Audio is only used for transcription and is not stored.',
        [
          { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Continue', onPress: () => resolve(true) },
        ],
      );
    });

    if (!proceed) {
      return false;
    }
  }

  const result = await requestRecordingPermissionsAsync();
  return result.granted;
}