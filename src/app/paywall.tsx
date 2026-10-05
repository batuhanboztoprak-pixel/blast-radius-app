import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useAds } from '../ads/ads';
import { FEATURE_TINT, FeatureGlyph } from '../components/FeatureGlyph';
import { CheckIcon, CloseIcon } from '../components/icons';
import { PAYWALL_BG, PaywallHero } from '../components/PaywallHero';
import { ADS_CONFIGURED, PRIVACY_POLICY_URL, TERMS_URL } from '../config';
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

const GLASS = 'rgba(255,255,255,0.045)';
const GLASS_BORDER = 'rgba(255,255,255,0.09)';
const CTA_FROM = '#FF8A4A';
const CTA_TO = '#FF3D6E';

export default function Paywall() {
  const params = useLocalSearchParams<{ feature?: string; item?: string; source?: string }>();
  const feature: Feature | null = isFeature(params.feature) ? params.feature : null;
  const item: LockedItem | null = isLockedItem(params.item) ? params.item : null;

  const { isPro, price, busy, error, purchase, restore, setDevPro } = usePremium();
  const { showPrivacyOptions, rewardedReady, showRewarded } = useAds();
  const { grant, rewardsLeftToday } = useUpsell();
  const { updateParams, applyPreset } = useSimulation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
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

  const shown: Feature | null = feature === 'ads' && !ADS_CONFIGURED ? null : feature;
  const perks = shown ? [shown, ...PERK_ORDER.filter((f) => f !== shown)] : PERK_ORDER;
  const title = shown ? t(`paywall.hero.${shown}.title`) : t('paywall.title');
  const subtitle = shown ? t(`paywall.hero.${shown}.body`) : t('paywall.subtitle');
  const heroH = Math.round(Math.min(height * 0.36, width * 0.82));

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <PaywallHero width={width} height={heroH + insets.top} />

        <View style={styles.head}>
          <View style={styles.kickerPill}>
            <Text style={styles.kicker}>{t('paywall.kicker')}</Text>
          </View>
          <Text
            style={styles.title}
            // Hidden upgrade-source counters, dev builds only.
            onLongPress={__DEV__ ? () => router.push('/upgrade-stats') : undefined}
          >
            {title}
          </Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <Text style={styles.section}>{t('paywall.perksTitle')}</Text>
        <View style={styles.perks}>
          {perks.map((f) => {
            const focus = f === shown;
            return (
              <View key={f} style={[styles.perk, focus && styles.perkFocus]}>
                <View style={[styles.badge, { backgroundColor: FEATURE_TINT[f] }]}>
                  <FeatureGlyph feature={f} />
                </View>
                <View style={styles.perkText}>
                  <Text style={styles.perkTitle}>{t(PERKS[f].title)}</Text>
                  <Text style={styles.perkBody}>{t(PERKS[f].body)}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <Text style={styles.section}>{t('compare.title')}</Text>
        <View style={styles.table} accessibilityLabel={t('compare.title')}>
          <View style={styles.tableRow}>
            <View style={styles.rowLabelCell} />
            <Text style={[styles.col, styles.colHead]}>{t('compare.free')}</Text>
            <View style={[styles.col, styles.proCol, styles.proTop]}>
              <Text style={styles.proHead}>{t('compare.pro')}</Text>
            </View>
          </View>
          {COMPARE.map((r, i) => (
            <View key={r.row} style={styles.tableRow}>
              <Text style={[styles.rowLabelCell, styles.rowLabel]}>{t(r.row)}</Text>
              <CompareCell value={r.free} />
              <CompareCell value={r.pro} pro last={i === COMPARE.length - 1} />
            </View>
          ))}
        </View>

        {error && <Text style={styles.error}>{error}</Text>}
        {rewardNote && <Text style={styles.error}>{rewardNote}</Text>}
      </ScrollView>

      {/* Close: floating over the hero. */}
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
        hitSlop={10}
        style={[styles.close, { top: insets.top + 8 }]}
      >
        <CloseIcon size={18} color="#FFFFFF" />
      </Pressable>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.footerFade} pointerEvents="none">
          <Svg width={width} height={28}>
            <Defs>
              <LinearGradient id="ffade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={PAYWALL_BG} stopOpacity={0} />
                <Stop offset="1" stopColor={PAYWALL_BG} stopOpacity={1} />
              </LinearGradient>
            </Defs>
            <Rect width={width} height={28} fill="url(#ffade)" />
          </Svg>
        </View>

        <View style={styles.priceCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.lifetime}>{t('paywall.lifetime')}</Text>
            <Text style={styles.lifetimeNote}>{t('paywall.lifetimeNote')}</Text>
          </View>
          {price ? (
            <Text style={styles.price} adjustsFontSizeToFit numberOfLines={1}>
              {price}
            </Text>
          ) : !isPro ? (
            <ActivityIndicator color={colors.muted} />
          ) : null}
        </View>
        {!price && !busy && !isPro && <Text style={styles.storeNote}>{t('paywall.storeLoading')}</Text>}

        <BuyButton label={t('paywall.unlock')} onPress={purchase} loading={busy} disabled={watching} />

        {canWatch && (
          <Pressable onPress={watchToTry} disabled={watching || busy} accessibilityRole="button" style={styles.watch} hitSlop={6}>
            <Text style={styles.watchText}>
              {t('reward.watch')} · <Text style={styles.watchLeft}>{t('reward.left', { n: rewardsLeftToday })}</Text>
            </Text>
          </Pressable>
        )}
        {limitReached && <Text style={styles.triesLeft}>{t('reward.limit', { n: REWARDED_PER_DAY })}</Text>}

        <View style={styles.links}>
          <Pressable onPress={restore} disabled={busy} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.link}>{t('paywall.restore')}</Text>
          </Pressable>
          <Text style={styles.dot}>·</Text>
          {/* One-time purchase: Apple's standard licence applies; the privacy policy must be reachable in-app. */}
          <Pressable onPress={() => Linking.openURL(TERMS_URL)} accessibilityRole="link" hitSlop={8}>
            <Text style={styles.link}>{t('paywall.terms')}</Text>
          </Pressable>
          <Text style={styles.dot}>·</Text>
          <Pressable onPress={() => Linking.openURL(PRIVACY_POLICY_URL)} accessibilityRole="link" hitSlop={8}>
            <Text style={styles.link}>{t('paywall.privacyPolicy')}</Text>
          </Pressable>
        </View>
        {showPrivacyOptions && (
          <Pressable onPress={showPrivacyOptions} accessibilityRole="button" hitSlop={8} style={{ alignSelf: 'center' }}>
            <Text style={styles.link}>{t('paywall.privacy')}</Text>
          </Pressable>
        )}
        <Text style={styles.legal}>{t('paywall.legal')}</Text>
        {__DEV__ && (
          // Development builds only (never in TestFlight or the App Store): unlock Pro for screenshots and testing.
          <Pressable
            onPress={() => {
              setDevPro(true);
              router.back();
            }}
            accessibilityRole="button"
            style={styles.devPro}
          >
            <Text style={styles.devProText}>DEV · Act as Pro</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/** The big gradient buy button, with a soft glow and a light sweep every few seconds. */
function BuyButton({ label, onPress, loading, disabled }: { label: string; onPress: () => void; loading: boolean; disabled: boolean }) {
  const [w, setW] = useState(0);
  const [sweep] = useState(() => new Animated.Value(0));
  const [breathe] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let loops: Animated.CompositeAnimation[] = [];
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled || reduce) return;
        loops = [
          Animated.loop(
            Animated.sequence([
              Animated.delay(1400),
              Animated.timing(sweep, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
              Animated.timing(sweep, { toValue: 0, duration: 0, useNativeDriver: true }),
            ]),
          ),
          Animated.loop(
            Animated.sequence([
              Animated.timing(breathe, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
              Animated.timing(breathe, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ]),
          ),
        ];
        loops.forEach((l) => l.start());
      });
    return () => {
      cancelled = true;
      loops.forEach((l) => l.stop());
    };
  }, [sweep, breathe]);

  const H = 58;
  const band = 70;
  const off = disabled || loading;
  return (
    <Animated.View
      style={[
        styles.ctaGlow,
        { transform: [{ scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.015] }) }] },
      ]}
    >
      <Pressable
        onPress={onPress}
        disabled={off}
        accessibilityRole="button"
        accessibilityState={{ disabled: off, busy: loading }}
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        style={({ pressed }) => [styles.cta, { height: H }, pressed && { opacity: 0.9, transform: [{ scale: 0.985 }] }, off && { opacity: 0.6 }]}
      >
        {w > 0 && (
          <Svg width={w} height={H} style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id="cta" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={CTA_FROM} />
                <Stop offset="1" stopColor={CTA_TO} />
              </LinearGradient>
            </Defs>
            <Rect width={w} height={H} fill="url(#cta)" />
          </Svg>
        )}
        {w > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { width: band, transform: [{ translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-band * 1.5, w + band] }) }, { skewX: '-20deg' }] },
            ]}
          >
            <Svg width={band} height={H}>
              <Defs>
                <LinearGradient id="sweep" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
                  <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0.35} />
                  <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Rect width={band} height={H} fill="url(#sweep)" />
            </Svg>
          </Animated.View>
        )}
        {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.ctaText}>{label}</Text>}
      </Pressable>
    </Animated.View>
  );
}

function CompareCell({ value, pro, last }: { value: boolean | MessageKey; pro?: boolean; last?: boolean }) {
  const box = [styles.col, pro && styles.proCol, pro && last && styles.proBottom];
  if (typeof value === 'string') {
    return (
      <View style={box}>
        <Text style={[styles.cellText, pro && styles.cellTextPro]}>{t(value)}</Text>
      </View>
    );
  }
  return (
    <View style={box} accessible accessibilityLabel={t(value ? 'compare.yes' : 'compare.no')}>
      {value ? <CheckIcon size={16} color={pro ? colors.accent : colors.muted} /> : <Text style={styles.dash}>—</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PAYWALL_BG },
  close: {
    position: 'absolute',
    right: 16,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,6,40,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  head: { paddingHorizontal: 24, marginTop: -44, gap: 8 },
  kickerPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,107,74,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,74,0.35)',
  },
  kicker: { fontSize: 11, letterSpacing: 1.8, color: colors.accent, fontFamily: fonts.bodySemi },
  title: { fontSize: 32, lineHeight: 37, color: colors.text, fontFamily: fonts.display },
  subtitle: { fontSize: 15, lineHeight: 21, color: '#AEB4C8', fontFamily: fonts.body },
  section: {
    marginTop: 26,
    marginBottom: 10,
    paddingHorizontal: 24,
    fontSize: 11,
    letterSpacing: 1.6,
    color: colors.muted,
    fontFamily: fonts.bodySemi,
    textTransform: 'uppercase',
  },
  perks: { paddingHorizontal: 16, gap: 8 },
  perk: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: GLASS,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
  },
  perkFocus: { borderColor: 'rgba(255,107,74,0.6)', backgroundColor: 'rgba(255,107,74,0.08)' },
  badge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  perkText: { flex: 1, gap: 2 },
  perkTitle: { fontSize: 15, color: colors.text, fontFamily: fonts.bodySemi },
  perkBody: { fontSize: 13, lineHeight: 18, color: colors.muted, fontFamily: fonts.body },
  table: {
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.lg,
    backgroundColor: GLASS,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
  },
  tableRow: { flexDirection: 'row', alignItems: 'stretch', minHeight: 36 },
  rowLabelCell: { flex: 1, paddingRight: 8, paddingVertical: 9 },
  rowLabel: { fontSize: 13, color: colors.text, fontFamily: fonts.body },
  col: { width: 74, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 2 },
  colHead: { fontSize: 12, color: colors.muted, fontFamily: fonts.bodySemi, textAlign: 'center', textAlignVertical: 'center' },
  proCol: { backgroundColor: 'rgba(255,107,74,0.10)' },
  proTop: { borderTopLeftRadius: 12, borderTopRightRadius: 12, marginTop: 4 },
  proBottom: { borderBottomLeftRadius: 12, borderBottomRightRadius: 12, marginBottom: 4 },
  proHead: { fontSize: 12, letterSpacing: 1, color: colors.accent, fontFamily: fonts.display },
  cellText: { fontSize: 11, color: colors.muted, fontFamily: fonts.bodyMedium, textAlign: 'center' },
  cellTextPro: { color: colors.accent },
  dash: { fontSize: 13, color: colors.dim },
  error: { marginTop: 14, paddingHorizontal: 24, color: colors.accent, fontFamily: fonts.body, fontSize: 13 },
  footer: { paddingHorizontal: 16, paddingTop: 6, gap: 10, backgroundColor: PAYWALL_BG },
  footerFade: { position: 'absolute', top: -28, left: 0 },
  priceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,107,74,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,107,74,0.55)',
  },
  lifetime: { fontSize: 16, color: colors.text, fontFamily: fonts.display },
  lifetimeNote: { marginTop: 2, fontSize: 12, color: '#AEB4C8', fontFamily: fonts.body },
  price: { fontSize: 26, color: colors.text, fontFamily: fonts.display, maxWidth: 140 },
  storeNote: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, textAlign: 'center' },
  ctaGlow: {
    borderRadius: 18,
    shadowColor: CTA_TO,
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  cta: { borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 18, color: '#FFFFFF', fontFamily: fonts.display, letterSpacing: 0.3 },
  watch: { alignSelf: 'center', paddingVertical: 2 },
  watchText: { fontSize: 13, color: colors.text, fontFamily: fonts.bodySemi, textAlign: 'center' },
  watchLeft: { color: colors.muted, fontFamily: fonts.body },
  triesLeft: { fontSize: 12, color: colors.muted, fontFamily: fonts.body, textAlign: 'center' },
  links: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  link: { color: colors.muted, fontSize: 12, fontFamily: fonts.bodyMedium },
  dot: { color: colors.dim, fontSize: 12 },
  legal: { color: colors.dim, fontSize: 10.5, lineHeight: 14, fontFamily: fonts.body, textAlign: 'center' },
  devPro: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.dim,
    borderStyle: 'dashed',
  },
  devProText: { color: colors.muted, fontSize: 12, fontFamily: fonts.bodySemi },
});
