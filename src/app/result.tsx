import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdBanner } from '../ads/AdBanner';
import { useAds } from '../ads/ads';
import { AftermathTimeline, StageCaption } from '../components/AftermathTimeline';
import { TINT_COLOR, stageLayers } from '../components/aftermathLayers';
import { GlobeView } from '../components/GlobeView';
import { GLOBE_AVAILABLE_ABOVE_M, GLOBE_DEFAULT_ABOVE_M } from '../components/globe';
import { CinematicHud, type CinePhase } from '../components/CinematicHud';
import { CINE_FALL, ImpactMap } from '../components/ImpactMap';
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
  formatLd,
  formatMultiple,
  formatPeople,
  formatShortDate,
  formatYears,
  hiroshimaPercent,
} from '../physics/format';
import { aftermath, type StageId } from '../physics/aftermath';
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

const WHOOSH = require('../../assets/sounds/whoosh.m4a');
const BOOM = require('../../assets/sounds/boom.m4a');
const RUMBLE = require('../../assets/sounds/rumble.m4a');

export default function Result() {
  const { result, location, presetId, realAsteroid } = useSimulation();
  const { isPro, price } = usePremium();
  const { postAdNudge, dismissNudge } = useAds();
  const upsell = useUpsell();
  const { run, unlockForRun } = upsell;
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const world = useWorld();
  const { units } = useUnits();
  const [focus, setFocus] = useState<Ring['kind'] | null>(null);
  // Play the strike when the screen opens; Replay bumps it.
  const [strikeToken, setStrikeToken] = useState(1);
  const [playedToken, setPlayedToken] = useState(0);
  const [view, setView] = useState<'map' | 'globe'>('map');
  // The shock wave is the "normal" map view; other stages paint their own layers.
  const [stageId, setStageId] = useState<StageId>('blast');
  /** A stage was picked from the timeline: the map shows it with a caption. */
  const [stageOpen, setStageOpen] = useState(false);
  const scroll = useRef<ScrollView>(null);

  // Unlocks earned from a rewarded ad apply to the strike on screen.
  const burnsTicket = hasTicket(upsell.state, 'burns');
  const aftermathTicket = hasTicket(upsell.state, 'aftermath');
  useEffect(() => {
    if (!isPro && burnsTicket) unlockForRun('burns');
  }, [isPro, burnsTicket, unlockForRun]);
  useEffect(() => {
    if (!isPro && aftermathTicket) unlockForRun('aftermath');
  }, [isPro, aftermathTicket, unlockForRun]);

  // Cinematic strike: heads-up display state and sound players.
  const [cine, setCine] = useState<{ phase: CinePhase; at: number } | null>(null);
  const whoosh = useAudioPlayer(WHOOSH);
  const boom = useAudioPlayer(BOOM);
  const rumble = useAudioPlayer(RUMBLE);
  useEffect(() => {
    // Respect the silent switch and never stop the user's music.
    setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
  }, []);

  if (!result || !location) return <Redirect href="/" />;

  const burnsUnlocked = isPro || !!run?.burns;
  const cinematic = isPro || !!run?.cinematic;
  // Becoming cinematic (e.g. Pro bought on this screen) changes the token, so
  // the strike plays again straight away in the new style.
  const token = strikeToken * 2 + (cinematic ? 1 : 0);
  const stages = aftermath(result);
  const aftermathUnlocked = isPro || !!run?.aftermath;
  const stage = stages.find((s) => s.id === stageId);
  const stageReadable = !!stage && (!stage.pro || aftermathUnlocked);
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
  // The globe gets (almost) the whole screen; a strip of the page peeks out below
  // so it's clear the details are a scroll away.
  const mapHeight = view === 'globe' ? Math.round(height - 72) : Math.max(380, Math.round(height * 0.62));
  const globeTop = insets.top + 132; // below the top bar, tools and the global-effects banner
  const globeH = mapHeight - globeTop - 60;
  const globalFraction = world.lastStrike?.impact.globalFraction ?? 0;
  const strikeDone = playedToken === token;
  const focusRing = focus ? rings.find((r) => r.kind === focus) : undefined;
  const layers = stageLayers(stageOpen && stageReadable && strikeDone && view === 'map' ? stage : undefined, result);
  const pickStage = (id: StageId, auto = false) => {
    setStageId(id);
    if (auto) {
      // ▶ Play stepping on its own: never switch views or move the page under
      // the user (they may be spinning the globe or reading below).
      if (view === 'map') setStageOpen(true);
      return;
    }
    setStageOpen(true);
    setFocus(null);
    if (view !== 'map') setView('map');
    // Bring the map into view; the caption on it carries the stage's text.
    scroll.current?.scrollTo({ y: 0, animated: true });
  };
  const closeStage = () => {
    setStageOpen(false);
    setStageId('blast');
  };
  const tint = layers.tint !== 'none' ? TINT_COLOR[layers.tint] : null;
  // --- Cinematic strike: heads-up display and sound -------------------------
  const onCinematicPhase = (phase: CinePhase) => {
    setCine({ phase, at: Date.now() });
    try {
      if (phase === 'fall') {
        whoosh.seekTo(0);
        whoosh.play();
      } else if (phase === 'impact') {
        whoosh.pause();
        boom.seekTo(0);
        boom.play();
        rumble.seekTo(0);
        setTimeout(() => rumble.play(), 220);
      }
    } catch {
      // Sound is a nice-to-have; never let it break the strike.
    }
  };

  const replay = () => {
    setCine(null);
    setFocus(null);
    closeStage();
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
      <ScrollView ref={scroll} contentContainerStyle={styles.scroll}>
        <View style={[styles.mapWrap, { height: mapHeight }]}>
          {view === 'map' ? (
            <>
              <ImpactMap
                location={location}
                rings={rings}
                focusRadiusM={focusRing?.radiusM ?? layers.extentM ?? null}
                stageCircles={layers.circles}
                hideRings={layers.hideRings}
                stageEffect={layers.effect}
                // Only unplayed strikes animate, so flipping back from the globe doesn't replay.
                strikeToken={playedToken === token ? 0 : token}
                // Continent-sized rings read better on the globe once the strike has played.
                onStrikeEnd={() => {
                  setPlayedToken(token);
                  if (largest >= GLOBE_DEFAULT_ABOVE_M) setView('globe');
                }}
                lockedRing={lockedThermal}
                onLockedPress={() => openBurns('burns-tag')}
                cinematic={cinematic}
                composition={result.params.composition}
                onCinematicPhase={onCinematicPhase}
              />
              <CinematicHud
                phase={cine?.phase ?? null}
                since={cine?.at ?? 0}
                fallMs={CINE_FALL}
                velocityMs={result.params.velocityMs}
                angleDeg={result.params.angleDeg}
                airburstAltitudeM={result.airburstAltitudeM}
                energyMt={result.effectiveEnergyMt}
                deaths={world.lastStrike?.impact.totalDeaths ?? 0}
                units={units}
                top={insets.top + 100}
              />
              {stageOpen && strikeDone ? (
                <StageCaption
                  stages={stages}
                  selected={stageId}
                  units={units}
                  unlocked={aftermathUnlocked}
                  onSelect={pickStage}
                  onClose={closeStage}
                  onUnlock={() => upsell.openPaywall('aftermath', 'aftermath-stage', 'aftermath')}
                />
              ) : (
                <RingLegend
                  rings={rings}
                  selected={focus}
                  onSelect={(k) => {
                    setFocus(k);
                    closeStage();
                  }}
                  onLockedThermal={lockedThermal ? () => openBurns('burns-legend') : undefined}
                />
              )}
            </>
          ) : (
            <View style={styles.globe}>
              <GlobeView
                key={`${location.latitude},${location.longitude}`}
                latitude={location.latitude}
                longitude={location.longitude}
                rings={rings}
                width={width}
                height={mapHeight}
                area={{ top: globeTop, height: globeH }}
                haze={globalFraction}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.globeHint}>{t('result.dragToSpin')}</Text>
              <Text style={styles.globeScroll}>{t('result.scrollDetails')} ↓</Text>
            </View>
          )}
          {tint && (
            // Aftermath stage over the whole map: fires, dark skies, frost.
            <View pointerEvents="none" style={[styles.haze, { backgroundColor: tint.color, opacity: tint.opacity }]} />
          )}
          {!tint && !stageOpen && view === 'map' && strikeDone && globalFraction > 0 && (
            // (Hidden while an aftermath stage is open, so each stage looks like itself.)
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

        <AftermathTimeline
          stages={stages}
          units={units}
          unlocked={aftermathUnlocked}
          selected={stageId}
          onSelect={pickStage}
          onUnlock={() => upsell.openPaywall('aftermath', 'aftermath-stage', 'aftermath')}
        />

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
            {presetId === 'chicxulub' && <Text style={styles.presetTag}>{t('preset.chicxulub.tag')}</Text>}
            <Text style={styles.noteText}>{preset.note}</Text>
          </View>
        )}

        {realAsteroid && (
          <View style={styles.noteCard}>
            <Text style={styles.noteTitle}>☄️ {t('real.noteTitle', { name: realAsteroid.name })}</Text>
            <Text style={styles.noteText}>
              {t('real.resultBody', { date: formatShortDate(realAsteroid.approachAt), ld: formatLd(realAsteroid.distanceLd) })}
            </Text>
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
  haze: { ...StyleSheet.absoluteFill, backgroundColor: '#7A2E12' },
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
  globe: { flex: 1 },
  globeHint: { position: 'absolute', bottom: 34, left: 0, right: 0, textAlign: 'center', fontSize: 11, color: colors.dim, fontFamily: fonts.body },
  globeScroll: { position: 'absolute', bottom: 10, left: 0, right: 0, textAlign: 'center', fontSize: 12, color: colors.muted, fontFamily: fonts.bodyMedium },
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
  presetTag: { fontSize: 12, color: colors.accent, fontFamily: fonts.bodySemi },
  noteTitle: { fontSize: 13, color: colors.text, fontFamily: fonts.bodySemi },
  noteText: { fontSize: 13, color: colors.muted, fontFamily: fonts.body, lineHeight: 18 },
  lockedHint: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footnote: { fontSize: 11, color: colors.dim, fontFamily: fonts.body, lineHeight: 15, flexShrink: 1 },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  flex: { flex: 1 },
});
