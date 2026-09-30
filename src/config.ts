import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

/** Non-consumable product created in App Store Connect ($3.99 tier). */
export const PRO_PRODUCT_ID = 'com.blastradius.app.pro';

/**
 * Production AdMob ad unit IDs. Replace the placeholders after creating the
 * units in AdMob (see docs/LAUNCH_CHECKLIST.md). Dev builds always use Google's
 * test units so you can't accidentally click your own live ads.
 */
const PROD_AD_UNITS = {
  ios: {
    banner: 'ca-app-pub-XXXXXXXXXXXXXXXX/BBBBBBBBBB',
    interstitial: 'ca-app-pub-XXXXXXXXXXXXXXXX/IIIIIIIIII',
  },
  android: {
    banner: 'ca-app-pub-XXXXXXXXXXXXXXXX/BBBBBBBBBB',
    interstitial: 'ca-app-pub-XXXXXXXXXXXXXXXX/IIIIIIIIII',
  },
};

const platformUnits = Platform.OS === 'android' ? PROD_AD_UNITS.android : PROD_AD_UNITS.ios;

export const AD_UNITS = {
  banner: __DEV__ ? TestIds.ADAPTIVE_BANNER : platformUnits.banner,
  interstitial: __DEV__ ? TestIds.INTERSTITIAL : platformUnits.interstitial,
};

/** Show an interstitial on every Nth simulation (never the first). */
export const INTERSTITIAL_EVERY_N_SIMULATIONS = 3;
/** And never more often than this. */
export const INTERSTITIAL_MIN_INTERVAL_MS = 90_000;
