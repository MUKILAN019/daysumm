import { requestWidgetUpdate } from 'react-native-android-widget';
import {
  getTodayEntryCount,
  getLatestEntryText,
  setWidgetCache,
} from '../db/entries';
import { fetchCurrentStreak } from '../firestore/userStats';
import { DaySummWidget } from './DaySummWidget';

export async function refreshWidgetData(uid?: string): Promise<void> {
  try {
    const [todayEntryCount, lastEntryPreview, currentStreak] = await Promise.all([
      getTodayEntryCount(),
      getLatestEntryText(),
      uid ? fetchCurrentStreak(uid) : Promise.resolve(0),
    ]);

    await setWidgetCache({ todayEntryCount, currentStreak, lastEntryPreview });

    await requestWidgetUpdate({
      widgetName: 'DaySummWidget',
      renderWidget: () => (
        <DaySummWidget
          todayEntryCount={todayEntryCount}
          currentStreak={currentStreak}
          lastEntryPreview={lastEntryPreview}
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