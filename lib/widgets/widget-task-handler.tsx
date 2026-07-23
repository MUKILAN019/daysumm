import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { DaySummWidget } from './DaySummWidget';
import { getWidgetCache, getTodayEntryCount, getLatestEntryText } from '../db/entries';
import { getAuth } from '@react-native-firebase/auth';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const uid = getAuth().currentUser?.uid;
      if (!uid) break;
      
      try {
        const [todayEntryCount, lastEntryPreview, cache] = await Promise.all([
          getTodayEntryCount(uid),
          getLatestEntryText(uid),
          getWidgetCache(uid),
        ]);
        
        props.renderWidget(
          <DaySummWidget
            todayEntryCount={todayEntryCount}
            currentStreak={cache.currentStreak}
            lastEntryPreview={lastEntryPreview}
          />,
        );
      } catch (error) {
        console.warn('Failed to render widget with live data, falling back to cache', error);
        try {
          const cache = await getWidgetCache(uid);
          props.renderWidget(
            <DaySummWidget
              todayEntryCount={cache.todayEntryCount}
              currentStreak={cache.currentStreak}
              lastEntryPreview={cache.lastEntryPreview}
            />,
          );
        } catch (fallbackError) {
          console.error('Widget render failed entirely', fallbackError);
        }
      }
      break;
    }

    case 'WIDGET_DELETED':
      break;

    default:
      break;
  }
}