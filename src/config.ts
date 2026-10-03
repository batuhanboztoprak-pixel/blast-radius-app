import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

/** Non-consumable product created in App Store Connect ($4.99; $2.99 launch price). */
export const PRO_PRODUCT_ID = 'com.blastradius.app.pro';

/**
 * Production AdMob ad unit IDs (iOS set; Android placeholders until an Android
 * version exists). Dev builds always use Google's
 * test units so you can't accidentally click your own live ads.
 */
const PROD_AD_UNITS = {
  ios: {
    banner: 'ca-app-pub-4306304660896226/2750552266',
    interstitial: 'ca-app-pub-4306304660896226/4718325770',
    rewarded: 'ca-app-pub-4306304660896226/6737898739',
  },
  android: {
    banner: 'ca-app-pub-XXXXXXXXXXXXXXXX/BBBBBBBBBB',
    interstitial: 'ca-app-pub-XXXXXXXXXXXXXXXX/IIIIIIIIII',
    rewarded: 'ca-app-pub-XXXXXXXXXXXXXXXX/RRRRRRRRRR',
  },
};

const platformUnits = Platform.OS === 'android' ? PROD_AD_UNITS.android : PROD_AD_UNITS.ios;

/**
 * False while the production ad unit IDs above are still placeholders. A
 * release build then runs completely ad-free: no consent form, no tracking
 * prompt, no ad SDK start-up, and the paywall doesn't promise "no ads".
 * Dev builds always use Google's test ads.
 */
export const ADS_CONFIGURED = __DEV__ || !Object.values(platformUnits).some((id) => id.includes('XXXX'));

export const AD_UNITS = {
  banner: __DEV__ ? TestIds.ADAPTIVE_BANNER : platformUnits.banner,
  interstitial: __DEV__ ? TestIds.INTERSTITIAL : platformUnits.interstitial,
  /** "Watch a short ad to try it once": unlocks one Pro item for one strike. */
  rewarded: __DEV__ ? TestIds.REWARDED : platformUnits.rewarded,
};

/** Show an interstitial on every Nth simulation (never the first). */
export const INTERSTITIAL_EVERY_N_SIMULATIONS = 3;
/** And never more often than this. */
export const INTERSTITIAL_MIN_INTERVAL_MS = 90_000;

/** Public privacy policy (also entered in App Store Connect). Must mention AdMob and tracking. */
export const PRIVACY_POLICY_URL = 'https://blastradius.curfewapp.co/privacy.html';
/** Support page (App Store Connect "Support URL"). */
export const SUPPORT_URL = 'https://blastradius.curfewapp.co/';
/** One-time purchases use Apple's standard licence agreement. */
export const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

/** Support email shown on the website and in App Store Connect. */
export const SUPPORT_EMAIL = 'blastradius@curfewapp.co';
