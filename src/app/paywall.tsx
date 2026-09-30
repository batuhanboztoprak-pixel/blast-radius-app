import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAds } from '../ads/ads';
import { CheckIcon, CloseIcon } from '../components/icons';
import { IconButton, PrimaryButton } from '../components/ui';
import { t, type MessageKey } from '../i18n/core';
import { usePremium } from '../state/premium';
import { colors, fonts, radius } from '../theme';

const PERKS: { title: MessageKey; body: MessageKey }[] = [
  { title: 'paywall.noAds', body: 'paywall.noAdsBody' },
  { title: 'paywall.compositions', body: 'paywall.compositionsBody' },
  { title: 'paywall.thermal', body: 'paywall.thermalBody' },
  { title: 'paywall.presets', body: 'paywall.presetsBody' },
];

export default function Paywall() {
  const { isPro, price, busy, error, purchase, restore } = usePremium();
  const { showPrivacyOptions } = useAds();

  useEffect(() => {
    if (isPro) router.back();
  }, [isPro]);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.top}>
        <IconButton onPress={() => router.back()} label={t('common.close')}>
          <CloseIcon />
        </IconButton>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.kicker}>{t('paywall.kicker')}</Text>
        <Text style={styles.title}>{t('paywall.title')}</Text>
        <Text style={styles.subtitle}>{t('paywall.subtitle')}</Text>

        <View style={styles.perks}>
          {PERKS.map((p) => (
            <View key={p.title} style={styles.perk}>
              <CheckIcon />
              <View style={styles.perkText}>
                <Text style={styles.perkTitle}>{t(p.title)}</Text>
                <Text style={styles.perkBody}>{t(p.body)}</Text>
              </View>
            </View>
          ))}
        </View>

        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={price ? t('paywall.unlockPrice', { price }) : t('paywall.unlock')}
          onPress={purchase}
          loading={busy}
        />
        <View style={styles.links}>
          <Pressable onPress={restore} disabled={busy} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.link}>{t('paywall.restore')}</Text>
          </Pressable>
          {showPrivacyOptions && (
            <Pressable onPress={showPrivacyOptions} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.link}>{t('paywall.privacy')}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  top: { paddingHorizontal: 16, paddingTop: 8, alignItems: 'flex-end' },
  body: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16, gap: 6 },
  kicker: { fontSize: 12, letterSpacing: 2, color: colors.accent, fontFamily: fonts.bodySemi },
  title: { fontSize: 30, color: colors.text, fontFamily: fonts.display },
  subtitle: { fontSize: 15, color: colors.muted, fontFamily: fonts.body },
  perks: {
    marginTop: 20,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 18,
    gap: 16,
  },
  perk: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  perkText: { flex: 1, gap: 2 },
  perkTitle: { fontSize: 15, color: colors.text, fontFamily: fonts.bodySemi },
  perkBody: { fontSize: 13, color: colors.muted, fontFamily: fonts.body, lineHeight: 18 },
  error: { marginTop: 12, color: colors.accent, fontFamily: fonts.body, fontSize: 13 },
  footer: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12, gap: 14 },
  links: { flexDirection: 'row', justifyContent: 'center', gap: 24 },
  link: { color: colors.muted, fontSize: 13, fontFamily: fonts.bodyMedium, textDecorationLine: 'underline' },
});
