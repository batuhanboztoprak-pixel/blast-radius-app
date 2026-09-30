import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdBanner } from '../ads/AdBanner';
import { useAds } from '../ads/ads';
import { GlobeView } from '../components/GlobeView';
import { GLOBE_AVAILABLE_ABOVE_M, GLOBE_DEFAULT_ABOVE_M } from '../components/globe';
import { ImpactMap } from '../components/ImpactMap';
import { RingLegend } from '../components/RingLegend';
import { BackIcon, LockIcon, ShareIcon } from '../components/icons';
import { visibleRings } from '../components/rings';
import { LockedStatCard, PrimaryButton, SecondaryButton, StatCard } from '../components/ui';
import { AdNudgeCard, FreeTryCard } from '../components/UpsellCards';
import { PopulationCard } from '../components/PopulationCard';
import { t } from '../i18n/core';
import {
  dec,
  formatDistance,
  formatEnergyMt,
  formatMultiple,
  formatPeople,
  formatYears,
  hiroshimaPercent,
} from '../physics/format';
import type { Ring } from '../physics/impact';
import { presetText } from '../physics/presets';
import { usePremium } from '../state/premium';
import { useSimulation } from '../state/simulation';
import { useUnits } from '../state/units';
import { useWorld } from '../state/world';
import { hasTicket } from '../upsell/entitlements';
import { useUpsell } from '../upsell/upsell';
import { colors, fonts, radius } from '../theme';

const ringRadius = (rings: Ring[], kind: Ring['kind']) => rings.find((r) => r.kind === kind);

export default function Result() {
  const { result, location, presetId } = useSimulation();
  const { isPro, price } = usePremium();
  const { postAdNudge, dismissNudge } = useAds();
  const upsell = useUpsell();
  const { run, unlockBurnsForRun } = upsell;
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const world = useWorld();
  const { units } = useUnits();
  const [focus, setFocus] = useState<Ring['kind'] | null>(null);
  // Play the strike when the screen opens; Replay bumps it.
  const [strikeToken, setStrikeToken] = useState(1);
  const [playedToken, setPlayedToken] = useState(0);
  const [view, setView] = useState<'map' | 'globe'>('map');

  // A burns unlock earned from a rewarded ad applies to the strike on screen.
  const burnsTicket = hasTicket(upsell.state, 'burns');
  useEffect(() => {
    if (!isPro && burnsTicket) unlockBurnsForRun();
  }, [isPro, burnsTicket, unlockBurnsForRun]);

  if (!result || !location) return <Redirect href="/" />;

  const burnsUnlocked = isPro || !!run?.burns;
  const rings = visibleRings(result.rings, burnsUnlocked);
  const energy = formatEnergyMt(result.effectiveEnergyMt);
  const hiroshima =
    result.hiroshimaMultiple < 1
      ? t('result.hiroshimaPercent', { pct: hiroshimaPercent(result.hiroshimaMultiple) })
      : t('result.hiroshimaTimes', { x: formatMultiple(result.hiroshimaMultiple) });
  const airburst = result.airburstAltitudeM !== null;
  const severe = ringRadius(result.rings, 'severe');
  const windows = ringRadius(result.rings, 'windows');
  const thermal = ringRadius(result.rings, 'thermal');
  const preset = presetId ? presetText(presetId) : null;
  const openBurns = (source: 'burns-card' | 'burns-tag' | 'burns-legend') =>
    upsell.openPaywall('burns', source, 'burns');
  const lockedThermal = !burnsUnlocked && thermal ? thermal : null;
  const freeTry = !isPro && run?.freeTry && run.freeTry === presetId ? run.freeTry : null;
  const largest = result.rings[0]?.radiusM ?? 0;
  const globeAvailable = largest >= GLOBE_AVAILABLE_ABOVE_M;
  // The map is the show: edge to edge, most of the first screen.
  const mapHeight = Math.max(380, Math.round(height * 0.62));
  const globalFraction = world.lastStrike?.impact.globalFraction ?? 0;
  const strikeDone = playedToken === strikeToken;
  const focusRing = focus ? rings.find((r) => r.kind === focus) : undefined;
  const replay = () => {
    setFocus(null);
    setView('map');
    setStrikeToken((t) => t + 1);
  };

  const distanceText = (r: Ring | undefined) =>
    r ? `${r.capped ? '>' : ''}${formatDistance(r.radiusM, units)}` : t('common.none');
  const inRing = world.lastStrike?.impact.inRing ?? {};
  const ringHint = (r: Ring | undefined, what: string) => {
    const n = r ? inRing[r.kind] : undefined;
    return n !== undefined ? t('result.peopleInside', { n: formatPeople(n) }) : what;
  };

  return (
    <SafeAreaView style={styles.screen} edges={[]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.mapWrap, { height: mapHeight }]}>
          {view === 'map' ? (
            <>
              <ImpactMap
                location={location}
                rings={rings}
                focusRadiusM={focusRing?.radiusM ?? null}
                // Only unplayed strikes animate, so flipping back from the globe doesn't replay.
                strikeToken={playedToken === strikeToken ? 0 : strikeToken}
                // Continent-sized rings read better on the globe once the strike has played.
                onStrikeEnd={() => {
                  setPlayedToken(strikeToken);
                  if (largest >= GLOBE_DEFAULT_ABOVE_M) setView('globe');
                }}
                lockedRing={lockedThermal}
                onLockedPress={() => openBurns('burns-tag')}
              />
              <RingLegend
                rings={rings}
                selected={focus}
                onSelect={setFocus}
                onLockedThermal={lockedThermal ? () => openBurns('burns-legend') : undefined}
              />
            </>
          ) : (
            <View style={styles.globe}>
              <GlobeView
                key={`${location.latitude},${location.longitude}`}
                latitude={location.latitude}
                longitude={location.longitude}
                rings={rings}
                size={Math.min(mapHeight - insets.top - 110, width - 32)}
                haze={globalFraction}
              />
              <Text style={styles.globeHint}>{t('result.dragToSpin')}</Text>
            </View>
          )}
          {view === 'map' && strikeDone && globalFraction > 0 && (
            // Everything beyond the rings is hit too: tint the whole map.
            <View pointerEvents="none" style={[styles.haze, { opacity: 0.12 + 0.2 * globalFraction }]} />
          )}
          <View style={[styles.topBar, { top: insets.top + 6 }]}>
            <Pressable onPress={() => router.back()} style={styles.round} accessibilityRole="button" accessibilityLabel={t('common.back')} hitSlop={6}>
              <BackIcon color={colors.text} />
            </Pressable>
            <View style={styles.placePill}>
              <Text style={styles.place} numberOfLines={1}>
                {location.label}
              </Text>
            </View>
            <Pressable onPress={() => router.push('/share')} style={styles.round} accessibilityRole="button" accessibilityLabel={t('common.share')} hitSlop={6}>
              <ShareIcon color={colors.text} />
            </Pressable>
          </View>
          {strikeDone && globalFraction > 0 && (
            <View pointerEvents="none" style={[styles.globalBanner, { top: insets.top + 96 }]}>
              <View style={styles.globalDot} />
              <Text style={styles.globalText}>{t('result.globalBanner')}</Text>
            </View>
          )}
          <View style={[styles.mapTools, { top: insets.top + 56 }]}>
            <Pressable onPress={replay} style={styles.tool} accessibilityRole="button" accessibilityLabel={t('result.replayA11y')}>
              <Text style={styles.toolText}>{t('result.replay')}</Text>
            </Pressable>
            {globeAvailable && (
              <View style={styles.segment}>
                {(['map', 'globe'] as const).map((v) => (
                  <Pressable
                    key={v}
                    onPress={() => setView(v)}
                    style={[styles.segmentItem, view === v && styles.segmentActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: view === v }}
                  >
                    <Text style={[styles.toolText, view !== v && { color: colors.muted }]}>
                      {t(v === 'map' ? 'result.map' : 'result.globe')}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={styles.body}>
        <View style={styles.headline}>
          <Text style={styles.kicker}>{t(airburst ? 'result.airburstEnergy' : 'result.energyReleased')}</Text>
          <Text style={styles.energy} adjustsFontSizeToFit numberOfLines={1}>
            {energy.value} {energy.unit}
          </Text>
          <Text style={styles.multiple}>{hiroshima}</Text>
        </View>

        <View style={styles.grid}>
          {airburst ? (
            <StatCard
              label={t('result.craterWidth')}
              value={t('common.none')}
              hint={t('result.exploded', { altitude: formatDistance(result.airburstAltitudeM!, units) })}
            />
          ) : (
            <StatCard
              label={t('result.craterWidth')}
              value={formatDistance(result.craterDiameterM!, units)}
              hint={t('result.deep', { depth: formatDistance(result.craterDepthM!, units) })}
            />
          )}
          <StatCard
            label={t('result.quake')}
            value={result.seismicMagnitude !== null ? t('result.quakeValue', { m: dec(result.seismicMagnitude, 1) }) : '—'}
            hint={t(result.seismicMagnitude !== null ? 'result.richter' : 'result.quakeAirburst')}
          />
        </View>
        <View style={styles.grid}>
          <StatCard
            label={t('result.buildings')}
            value={distanceText(severe)}
            hint={ringHint(severe, t('result.buildingsHint'))}
          />
          <StatCard
            label={t('result.windows')}
            value={distanceText(windows)}
            hint={ringHint(windows, t('result.windowsHint'))}
          />
        </View>

        <PopulationCard
          strike={world.lastStrike}
          survivors={world.survivors}
          strikes={world.strikes}
          onReset={world.reset}
        />

        <View style={styles.grid}>
          {burnsUnlocked ? (
            <StatCard
              label={t('result.burns')}
              value={distanceText(thermal)}
              hint={thermal ? ringHint(thermal, t('result.burnsHint')) : t('result.burnsNone')}
            />
          ) : (
            lockedThermal && (
              <LockedStatCard
                label={t('result.burns')}
                hint={t('result.burnsLockedHint')}
                a11yLabel={t('result.burnsLockedA11y')}
                onPress={() => openBurns('burns-card')}
              />
            )
          )}
          <StatCard label={t('result.recurrence')} value={formatYears(result.recurrenceYears)} />
        </View>

        {freeTry && (
          <FreeTryCard
            presetName={presetText(freeTry).name}
            onUnlock={() => upsell.openPaywall('presets', 'free-try-card', freeTry)}
          />
        )}

        {preset && (
          <View style={styles.noteCard}>
            <Text style={styles.noteTitle}>
              {preset.name}, {preset.year}
            </Text>
            <Text style={styles.noteText}>{preset.note}</Text>
          </View>
        )}

        {!isPro && (
          <View style={styles.lockedHint}>
            <LockIcon size={12} color={colors.dim} />
            <Text style={styles.footnote}>{t('result.proHint')}</Text>
          </View>
        )}
        <Text style={styles.footnote}>{t('result.footnote', { angle: result.params.angleDeg })}</Text>
        </View>
      </ScrollView>

      {postAdNudge && (
        <AdNudgeCard
          price={price}
          onPress={() => {
            dismissNudge();
            upsell.openPaywall('ads', 'ad-nudge');
          }}
          onDismiss={dismissNudge}
        />
      )}
      <View style={styles.footer}>
        <SecondaryButton label={t('result.tryAgain')} onPress={() => router.back()} style={styles.flex} />
        <PrimaryButton label={t('common.share')} onPress={() => router.push('/share')} style={styles.flex} />
      </View>
      <AdBanner />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: 16 },
  topBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  round: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11,14,23,0.82)',
    borderColor: colors.border,
    borderWidth: 1,
  },
  placePill: {
    flex: 1,
    alignItems: 'center',
  },
  place: {
    fontSize: 13,
    color: colors.text,
    fontFamily: fonts.bodySemi,
    backgroundColor: 'rgba(11,14,23,0.82)',
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: '100%',
  },
  body: { paddingHorizontal: 20, paddingTop: 6, gap: 10 },
  mapWrap: {
    overflow: 'hidden',
    backgroundColor: '#0F1424',
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  haze: { ...StyleSheet.absoluteFillObject, backgroundColor: '#7A2E12' },
  globalBanner: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '88%',
    backgroundColor: 'rgba(11,14,23,0.88)',
    borderColor: 'rgba(255,107,74,0.6)',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  globalDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  globalText: { fontSize: 12, color: colors.text, fontFamily: fonts.bodySemi, flexShrink: 1 },
  globe: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  globeHint: { position: 'absolute', bottom: 8, fontSize: 10, color: colors.dim, fontFamily: fonts.body },
  mapTools: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tool: {
    backgroundColor: 'rgba(11,14,23,0.88)',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  toolText: { fontSize: 12, color: colors.text, fontFamily: fonts.bodySemi },
  segment: {
    flexDirection: 'row',
    backgroundColor: 'rgba(11,14,23,0.88)',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 999,
    padding: 2,
  },
  segmentItem: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  segmentActive: { backgroundColor: 'rgba(255,255,255,0.12)' },
  headline: { paddingTop: 8, paddingBottom: 4 },
  kicker: { fontSize: 12, letterSpacing: 1.5, color: colors.muted, fontFamily: fonts.bodySemi },
  energy: { fontSize: 34, color: colors.text, fontFamily: fonts.display, lineHeight: 40 },
  multiple: { fontSize: 13, color: colors.accent, fontFamily: fonts.bodySemi, marginTop: 2 },
  grid: { flexDirection: 'row', gap: 10 },
  noteCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 14,
    gap: 4,
  },
  noteTitle: { fontSize: 13, color: colors.text, fontFamily: fonts.bodySemi },
  noteText: { fontSize: 13, color: colors.muted, fontFamily: fonts.body, lineHeight: 18 },
  lockedHint: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footnote: { fontSize: 11, color: colors.dim, fontFamily: fonts.body, lineHeight: 15, flexShrink: 1 },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  flex: { flex: 1 },
});
