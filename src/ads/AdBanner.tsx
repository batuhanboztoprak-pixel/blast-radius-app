import { StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

import { AD_UNITS } from '../config';
import { colors } from '../theme';
import { useAds } from './ads';

/** Bottom banner for free users. Renders nothing for Pro users or before consent. */
export function AdBanner() {
  const { adsEnabled, requestOptions } = useAds();
  if (!adsEnabled) return null;
  return (
    <View style={styles.wrap}>
      <BannerAd
        unitId={AD_UNITS.banner}
        size={BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER}
        maxHeight={60}
        requestOptions={requestOptions}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', backgroundColor: colors.bg },
});
