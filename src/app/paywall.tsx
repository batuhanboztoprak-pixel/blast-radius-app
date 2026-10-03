import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAds } from '../ads/ads';
import { PaywallArt } from '../components/PaywallArt';
import { ADS_CONFIGURED, PRIVACY_POLICY_URL, TERMS_URL } from '../config';
import { CheckIcon, CloseIcon } from '../components/icons';
import { IconButton, PrimaryButton, SecondaryButton } from '../components/ui';
import { t, type MessageKey } from '../i18n/core';
import { PRESETS } from '../physics/presets';
import { usePremium } from '../state/premium';
import { useSimulation } from '../state/simulation';
import {
  REWARDED_PER_DAY,
  isFeature,
  isLockedItem,
  isPresetId,
  type Feature,
  type LockedItem,
} from '../upsell/entitlements';
import { useUpsell } from '../upsell/upsell';
import { colors, fonts, radius } from '../theme';

const PERKS: Record<Feature, { title: MessageKey; body: MessageKey }> = {
  burns: { title: 'paywall.thermal', body: 'paywall.thermalBody' },
  compositions: { title: 'paywall.compositions', body: 'paywall.compositionsBody' },
  presets: { title: 'paywall.presets', body: 'paywall.presetsBody' },
  cinematic: { title: 'paywall.cinematic', body: 'paywall.cinematicBody' },
  aftermath: { title: 'paywall.aftermath', body: 'paywall.aftermathBody' },
  asteroids: { title: 'paywall.asteroids', body: 'paywall.asteroidsBody' },
  ads: { title: 'paywall.noAds', body: 'paywall.noAdsBody' },
};
// "No ads" is only a perk when the free version actually shows ads.
const PERK_ORDER: Feature[] = (['cinematic', 'asteroids', 'aftermath', 'ads', 'compositions', 'burns', 'presets'] as Feature[]).filter(
  (f) => f !== 'ads' || ADS_CONFIGURED,
);

/** Free vs Pro rows. `true` = included, `false` = not, a key = short text. */
type CompareRow = { row: MessageKey; free: boolean | MessageKey; pro: boolean | MessageKey };
const ALL_COMPARE: CompareRow[] = [
  { row: 'compare.anything', free: true, pro: true },
  { row: 'compare.rock', free: true, pro: true },
  { row: 'compare.rings', free: true, pro: true },
  { row: 'compare.population', free: true, pro: true },
  { row: 'compare.cinematic', free: 'compare.cinematicFree', pro: true },
  { row: 'compare.aftermath', free: 'compare.aftermathFree', pro: true },
  { row: 'compare.asteroids', free: 'compare.asteroidsFree', pro: true },
  { row: 'compare.ironComet', free: false, pro: true },
  { row: 'compare.burns', free: false, pro: true },
  { row: 'compare.presets', free: 'compare.presetsFree', pro: true },
  { row: 'compare.ads', free: 'compare.adsFree', pro: 'compare.adsPro' },
];
const COMPARE = ALL_COMPARE.filter((r) => r.row !== 'compare.ads' || ADS_CONFIGURED);

export default function Paywall() {
  const params = useLocalSearchParams<{ feature?: string; item?: string; source?: string }>();
  const feature: Feature | null = isFeature(params.feature) ? params.feature : null;
  const item: LockedItem | null = isLockedItem(params.item) ? params.item : null;

  const { isPro, price, busy, error, purchase, restore } = usePremium();
  const { showPrivacyOptions, rewardedReady, showRewarded } = useAds();
  const { grant, rewardsLeftToday } = useUpsell();
  const { updateParams, applyPreset } = useSimulation();
  const { width } = useWindowDimensions();
  const [watching, setWatching] = useState(false);
  const [rewardNote, setRewardNote] = useState<string | null>(null);

  useEffect(() => {
    if (isPro) router.back();
  }, [isPro]);

  // Only offer a rewarded try for a specific item, and only when an ad is loaded.
  const canWatch = !!item && !isPro && rewardedReady && rewardsLeftToday > 0;
  const limitReached = !!item && !isPro && rewardsLeftToday === 0;

  async function watchToTry() {
    if (!item) return;
    setWatching(true);
    setRewardNote(null);
    const earned = await showRewarded();
    setWatching(false);
    if (!earned) {
      setRewardNote(t('reward.notEarned'));
      return;
    }
    grant(item);
    // Select what they just unlocked so the next Simulate uses it.
    if (item === 'iron' || item === 'comet') updateParams({ composition: item });
    else if (isPresetId(item)) {
      const preset = PRESETS.find((p) => p.id === item);
      if (preset) applyPreset(preset);
    }
    router.back();
  }

  const hero = feature === 'ads' && !ADS_CONFIGURED ? 'cinematic' : (feature ?? 'burns');
  const perks = feature ? [feature, ...PERK_ORDER.filter((f) => f !== feature)] : PERK_ORDER;
  const title = feature ? t(`paywall.hero.${feature}.title`) : t('paywall.title');
  const subtitle = feature ? t(`paywall.hero.${feature}.body`) : t('paywall.subtitle');

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.top}>
        <IconButton onPress={() => router.back()} label={t('common.close')}>
          <CloseIcon />
        </IconButton>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <PaywallArt feature={hero} width={width - 48} />
        <Text style={styles.kicker}>{t('paywall.kicker')}</Text>
        <Text
          style={styles.title}
          // Hidden upgrade-source counters, dev builds only.
          onLongPress={__DEV__ ? () => router.push('/upgrade-stats') : undefined}
        >
          {title}
        </Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {feature && <Text style={styles.oneTime}>{t('paywall.subtitle')}</Text>}

        <View style={styles.perks}>
          {perks.map((f) => (
            <View key={f} style={styles.perk}>
              <CheckIcon />
              <View style={styles.perkText}>
                <Text style={styles.perkTitle}>{t(PERKS[f].title)}</Text>
                <Text style={styles.perkBody}>{t(PERKS[f].body)}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.table} accessibilityLabel={t('compare.title')}>
          <View style={styles.tableRow}>
            <Text style={[styles.cell, styles.rowLabel, styles.head]}>{t('compare.title')}</Text>
            <Text style={[styles.cell, styles.col, styles.head]}>{t('compare.free')}</Text>
            <Text style={[styles.cell, styles.col, styles.head, { color: colors.accent }]}>{t('compare.pro')}</Text>
          </View>
          {COMPARE.map((r) => (
            <View key={r.row} style={[styles.tableRow, styles.divider]}>
              <Text style={[styles.cell, styles.rowLabel]}>{t(r.row)}</Text>
              <CompareCell value={r.free} />
              <CompareCell value={r.pro} pro />
            </View>
          ))}
        </View>

        {error && <Text style={styles.error}>{error}</Text>}
        {!price && !busy && !isPro && <Text style={styles.storeNote}>{t('paywall.storeLoading')}</Text>}
        {rewardNote && <Text style={styles.error}>{rewardNote}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={price ? t('paywall.unlockPrice', { price }) : t('paywall.unlock')}
          onPress={purchase}
          loading={busy}
          disabled={watching}
        />
        {canWatch && (
          <>
            <SecondaryButton label={t('reward.watch')} onPress={watchToTry} disabled={watching || busy} />
            <Text style={styles.triesLeft}>{t('reward.left', { n: rewardsLeftToday })}</Text>
          </>
        )}
        {limitReached && <Text style={styles.triesLeft}>{t('reward.limit', { n: REWARDED_PER_DAY })}</Text>}
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
        {/* One-time purchase: Apple's standard licence applies; the privacy policy must be reachable in-app. */}
        <Text style={styles.legal}>{t('paywall.legal')}</Text>
        <View style={styles.links}>
          <Pressable onPress={() => Linking.openURL(TERMS_URL)} accessibilityRole="link" hitSlop={8}>
            <Text style={styles.smallLink}>{t('paywall.terms')}</Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL(PRIVACY_POLICY_URL)} accessibilityRole="link" hitSlop={8}>
            <Text style={styles.smallLink}>{t('paywall.privacyPolicy')}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function CompareCell({ value, pro }: { value: boolean | MessageKey; pro?: boolean }) {
  if (typeof value === 'string') {
    return <Text style={[styles.cell, styles.col, styles.cellText]}>{t(value)}</Text>;
  }
  return (
    <View
      style={[styles.cell, styles.col, styles.iconCell]}
      accessible
      accessibilityLabel={t(value ? 'compare.yes' : 'compare.no')}
    >
      {value ? <CheckIcon size={16} color={pro ? colors.accent : colors.muted} /> : <Text style={styles.dash}>—</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  top: { paddingHorizontal: 16, paddingTop: 8, alignItems: 'flex-end' },
  body: { paddingHorizontal: 24, paddingTop: 0, paddingBottom: 16, gap: 6 },
  kicker: { marginTop: 8, fontSize: 12, letterSpacing: 2, color: colors.accent, fontFamily: fonts.bodySemi },
  title: { fontSize: 30, color: colors.text, fontFamily: fonts.display },
  subtitle: { fontSize: 15, color: colors.muted, fontFamily: fonts.body, lineHeight: 21 },
  oneTime: { fontSize: 13, color: colors.dim, fontFamily: fonts.bodyMedium },
  perks: {
    marginTop: 16,
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
  table: {
    marginTop: 12,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  tableRow: { flexDirection: 'row', alignItems: 'center', minHeight: 34 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  cell: { paddingVertical: 6 },
  rowLabel: { flex: 1, fontSize: 12, color: colors.text, fontFamily: fonts.body, paddingRight: 8 },
  col: { width: 72, textAlign: 'center' },
  head: { fontSize: 11, letterSpacing: 0.5, color: colors.muted, fontFamily: fonts.bodySemi },
  cellText: { fontSize: 11, color: colors.muted, fontFamily: fonts.bodyMedium },
  iconCell: { alignItems: 'center' },
  dash: { fontSize: 13, color: colors.dim },
  error: { marginTop: 12, color: colors.accent, fontFamily: fonts.body, fontSize: 13 },
  footer: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12, gap: 10 },
  links: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 4 },
  triesLeft: { fontSize: 12, color: colors.muted, fontFamily: fonts.body, textAlign: 'center' },
  legal: { color: colors.dim, fontSize: 11, fontFamily: fonts.body, textAlign: 'center', marginTop: 6 },
  smallLink: { color: colors.dim, fontSize: 11, fontFamily: fonts.bodyMedium, textDecorationLine: 'underline' },
  storeNote: { marginTop: 12, color: colors.muted, fontFamily: fonts.body, fontSize: 12 },
  link: { color: colors.muted, fontSize: 13, fontFamily: fonts.bodyMedium, textDecorationLine: 'underline' },
});
