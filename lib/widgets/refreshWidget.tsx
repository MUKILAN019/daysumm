import { requestWidgetUpdate } from 'react-native-android-widget';
import {
  getTodayEntryCount,
  getLatestEntryText,
  setWidgetCache,
} from '../db/entries';
import { fetchCurrentStreak } from '../firestore/userStats';
import { DaySummWidget } from './DaySummWidget';

export async function refreshWidgetData(uid?: string): Promise<void> {
  if (!uid) return;

  try {
    const [todayEntryCount, lastEntryPreview, currentStreak] = await Promise.all([
      getTodayEntryCount(uid),
      getLatestEntryText(uid),
      fetchCurrentStreak(uid),
    ]);

    await setWidgetCache(uid, { todayEntryCount, currentStreak, lastEntryPreview });

    await requestWidgetUpdate({
      widgetName: 'DaySummWidget',
      renderWidget: (widgetInfo) => (
        <DaySummWidget
          todayEntryCount={todayEntryCount}
          currentStreak={currentStreak}
          lastEntryPreview={lastEntryPreview}
          widgetInfo={widgetInfo}
        />
      ),
      widgetNotFound: () => {
        // No widget currently placed on any home screen — nothing to do.
      },
    });
  } catch (error) {
    console.warn('Failed to refresh widget data', error);
  }
}