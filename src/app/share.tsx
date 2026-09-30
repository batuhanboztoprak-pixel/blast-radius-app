import * as Sharing from 'expo-sharing';
import { Redirect, router } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

import { ShareCard } from '../components/ShareCard';
import { visibleRings } from '../components/rings';
import { PrimaryButton, StepHeader } from '../components/ui';
import { t } from '../i18n/core';
import { usePremium } from '../state/premium';
import { useSimulation } from '../state/simulation';
import { useUnits } from '../state/units';
import { colors, fonts } from '../theme';

export default function Share() {
  const { result, location } = useSimulation();
  const { isPro } = usePremium();
  const { units } = useUnits();
  const { width } = useWindowDimensions();
  const card = useRef<View>(null);
  const [ready, setReady] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!result || !location) return <Redirect href="/" />;

  const cardWidth = Math.min(width - 40, 380);

  async function share() {
    setError(null);
    setSharing(true);
    try {
      const uri = await captureRef(card, { format: 'png', quality: 1, result: 'tmpfile' });
      if (!(await Sharing.isAvailableAsync())) {
        setError(t('share.unavailable'));
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        UTI: 'public.png',
        dialogTitle: t('share.dialogTitle'),
      });
    } catch {
      setError(t('share.failed'));
    } finally {
      setSharing(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StepHeader step={t('share.step')} title={t('share.title')} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.cardShadow}>
          <ShareCard
            ref={card}
            width={cardWidth}
            result={result}
            location={location}
            rings={visibleRings(result.rings, isPro)}
            units={units}
            onReady={() => setReady(true)}
          />
        </View>
        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton
          label={t(ready ? 'share.button' : 'share.preparing')}
          onPress={share}
          loading={sharing}
          disabled={!ready}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 8, gap: 12 },
  cardShadow: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  error: { color: colors.accent, fontFamily: fonts.body, fontSize: 13 },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
});
