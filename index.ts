import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { registerRootComponent } from 'expo';
import App from './App';
import { widgetTaskHandler } from './lib/widgets/widget-task-handler';

registerRootComponent(App);
registerWidgetTaskHandler(widgetTaskHandler);