import { useEffect, useState } from 'react';
import { getAuth } from '@react-native-firebase/auth';
import { getMessaging, onMessage, onNotificationOpenedApp, getInitialNotification } from '@react-native-firebase/messaging';
import { generateDigest, type Digest } from '../functions/generateDigest';
import { fetchTodayDigest } from '../firestore/fetchTodayDigest';
import { fetchCurrentStreak } from '../firestore/userStats';
import { extractDigestRecordId } from '../notifications/notificationRouting';
import { getHasSeenSampleDigest } from '../db/entries';

export function useDigestManager(isPro: boolean, entriesCount: number) {
  const [digest, setDigest] = useState<Digest | null>(null);
  const [digestRefreshVersion, setDigestRefreshVersion] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [digestError, setDigestError] = useState<string | null>(null);
  const [isLimitError, setIsLimitError] = useState(false);
  const [showSampleDigest, setShowSampleDigest] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [openedDigestRecordId, setOpenedDigestRecordId] = useState<string | null>(null);
  const [showForegroundBanner, setShowForegroundBanner] = useState(false);

  async function loadTodayDigest() {
    const uid = getAuth().currentUser?.uid;
    if (!uid) return;
    try {
      const todayDigest = await fetchTodayDigest(uid);
      if (todayDigest) {
        setDigest(todayDigest);
      }
    } catch (error) {
      console.warn('Failed to load today digest', error);
    }
  }

  async function loadStreak() {
    const uid = getAuth().currentUser?.uid;
    if (!uid) return;
    try {
      const streak = await fetchCurrentStreak(uid);
      setCurrentStreak(streak);
    } catch (error) {
      console.warn('Failed to fetch streak', error);
    }
  }

  useEffect(() => {
    loadTodayDigest();
    loadStreak();
  }, []);

  useEffect(() => {
    async function checkSampleDigest() {
      const uid = getAuth().currentUser?.uid;
      if (!uid) return;
      const hasSeen = await getHasSeenSampleDigest();
      if (!hasSeen && entriesCount === 0 && !digest) {
        setShowSampleDigest(true);
      }
    }
    checkSampleDigest();
  }, [entriesCount, digest]);

  // Foreground & background notification routing setup
  useEffect(() => {
    const messagingInstance = getMessaging();

    const unsubscribeOnMessage = onMessage(messagingInstance, async (remoteMessage) => {
      const recordId = extractDigestRecordId(remoteMessage);
      if (recordId) {
        setOpenedDigestRecordId(recordId);
        setShowForegroundBanner(true);
      }
    });

    const unsubscribeOnAppOpened = onNotificationOpenedApp(messagingInstance, (remoteMessage) => {
      const recordId = extractDigestRecordId(remoteMessage);
      if (recordId) {
        setOpenedDigestRecordId(recordId);
      }
    });

    getInitialNotification(messagingInstance).then((remoteMessage) => {
      if (remoteMessage) {
        const recordId = extractDigestRecordId(remoteMessage);
        if (recordId) {
          setOpenedDigestRecordId(recordId);
        }
      }
    });

    return () => {
      unsubscribeOnMessage();
      unsubscribeOnAppOpened();
    };
  }, []);

  async function handleGenerateDigest() {
    const uid = getAuth().currentUser?.uid;
    if (!uid) return;

    setIsGenerating(true);
    setDigestError(null);
    setIsLimitError(false);

    try {
      const result = await generateDigest();
      setDigest(result);
      setDigestRefreshVersion((prev) => prev + 1);
      await loadStreak();
    } catch (error: any) {
      console.warn('Digest generation failed', error);
      const msg = error?.message || 'Failed to generate digest. Please try again.';
      if (msg.includes('limit') || msg.includes('upgrade')) {
        setIsLimitError(true);
      }
      setDigestError(msg);
    } finally {
      setIsGenerating(false);
    }
  }

  return {
    digest,
    setDigest,
    digestRefreshVersion,
    isGenerating,
    digestError,
    setDigestError,
    isLimitError,
    showSampleDigest,
    setShowSampleDigest,
    currentStreak,
    openedDigestRecordId,
    setOpenedDigestRecordId,
    showForegroundBanner,
    setShowForegroundBanner,
    loadTodayDigest,
    loadStreak,
    handleGenerateDigest,
  };
}
