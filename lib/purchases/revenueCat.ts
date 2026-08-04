import Purchases, { LOG_LEVEL } from 'react-native-purchases';

const REVENUECAT_ANDROID_API_KEY = 'goog_NhNVzyxiaogziujZxJiYSAmSVGm';
let configuredUid: string | null = null;

export function configureRevenueCat(appUserID: string): void {
  if (configuredUid === appUserID) {
    return; // already configured for this exact identity
  }

  if (configuredUid === null) {
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }
    Purchases.configure({ apiKey: REVENUECAT_ANDROID_API_KEY, appUserID });
    configuredUid = appUserID;
    return;
  }

  // Already configured under a different uid — switch identity instead of re-configuring.
  Purchases.logIn(appUserID)
    .then(() => {
      configuredUid = appUserID;
    })
    .catch((error) => {
      console.warn('Failed to switch RevenueCat identity', error);
    });
}