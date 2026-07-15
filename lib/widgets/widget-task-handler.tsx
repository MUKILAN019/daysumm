import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { DaySummWidget } from './DaySummWidget';
import { getWidgetCache } from '../db/entries';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const cache = await getWidgetCache();
      props.renderWidget(
        <DaySummWidget
          todayEntryCount={cache.todayEntryCount}
          currentStreak={cache.currentStreak}
          lastEntryPreview={cache.lastEntryPreview}
        />,
      );
      break;
    }

    case 'WIDGET_DELETED':
      break;

    default:
      break;
  }
}