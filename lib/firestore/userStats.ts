import { getFirestore, doc, getDoc } from '@react-native-firebase/firestore';

export async function fetchCurrentStreak(uid: string): Promise<number> {
  const db = getFirestore();
  const snapshot = await getDoc(doc(db, 'userStats', uid));
  if (!snapshot.exists()) {
    return 0;
  }
  const data = snapshot.data() as { currentStreak?: number };
  return data.currentStreak ?? 0;
}