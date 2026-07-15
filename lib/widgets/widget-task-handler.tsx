import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { DaySummWidget } from './DaySummWidget';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      props.renderWidget(<DaySummWidget />);
      break;

    case 'WIDGET_DELETED':
      // Nothing to clean up yet — no data wired today.
      break;

    default:
      break;
  }
}