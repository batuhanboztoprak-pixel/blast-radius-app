import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdBanner } from '../ads/AdBanner';
import { GlobeView } from '../components/GlobeView';
import { GLOBE_AVAILABLE_ABOVE_M, GLOBE_DEFAULT_ABOVE_M } from '../components/globe';
import { ImpactMap } from '../components/ImpactMap';
import { RingLegend } from '../components/RingLegend';
import { BackIcon, LockIcon, ShareIcon } from '../components/icons';
import { visibleRings } from '../components/rings';
import { IconButton, PrimaryButton, SecondaryButton, StatCard } from '../components/ui';
import { PopulationCard } from '../components/PopulationCard';
import {
  formatDistance,
  formatEnergyMt,
  formatMultiple,
  formatPeople,
  formatYears,
  sig3,
} from '../physics/format';
import type { Ring } from '../physics/impact';
import { PRESETS } from '../physics/presets';
import { usePremium } from '../state/premium';
import { useSimulation } from '../state/simulation';
import { useWorld } from '../state/world';
import { colors, fonts, radius } from '../theme';

const ringRadius = (rings: Ring[], kind: Ring['kind']) => rings.find((r) => r.kind === kind);

export default function Result() {
  const { result, location, presetId } = useSimulation();
  const { isPro } = usePremium();
  const { width, height } = useWindowDimensions();
  const world = useWorld();
  const [focus, setFocus] = useState<Ring['kind'] | null>(null);
  // Play the strike when the screen opens; Replay bumps it.
  const [strikeToken, setStrikeToken] = useState(1);
  const [playedToken, setPlayedToken] = useState(0);
  const [view, setView] = useState<'map' | 'globe'>('map');

  if (!result || !location) return <Redirect href="/" />;

  const rings = visibleRings(result.rings, isPro);
  const energy = formatEnergyMt(result.effectiveEnergyMt);
  const multiple = formatMultiple(result.hiroshimaMultiple);
  const airburst = result.airburstAltitudeM !== null;
  const severe = ringRadius(result.rings, 'severe');
  const windows = ringRadius(result.rings, 'windows');
  const thermal = ringRadius(result.rings, 'thermal');
  const preset = PRESETS.find((p) => p.id === presetId);
  const openPaywall = () => router.push('/paywall');
  const largest = result.rings[0]?.radiusM ?? 0;
  const globeAvailable = largest >= GLOBE_AVAILABLE_ABOVE_M;
  const mapHeight = Math.max(260, height * 0.36);
  const focusRing = focus ? rings.find((r) => r.kind === focus) : undefined;
  const replay = () => {
    setFocus(null);
    setView('map');
    setStrikeToken((t) => t + 1);
  };

  const distanceText = (r: Ring | undefined) =>
    r ? `${r.capped ? '>' : ''}${formatDistance(r.radiusM)}` : 'None';
  const inRing = world.lastStrike?.impact.inRing ?? {};
  const ringHint = (r: Ring | undefined, what: string) => {
    const n = r ? inRing[r.kind] : undefined;
    return n !== undefined ? `radius · ${formatPeople(n)} people inside` : what;
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <IconButton onPress={() => router.back()} label="Back">
          <BackIcon />
        </IconButton>
        <Text style={styles.place} numberOfLines={1}>
          {location.label}
        </Text>
        <IconButton onPress={() => router.push('/share')} label="Share">
          <ShareIcon />
        </IconButton>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
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
              />
              <RingLegend
                rings={rings}
                selected={focus}
                onSelect={setFocus}
                onLockedThermal={!isPro && thermal ? openPaywall : undefined}
              />
            </>
          ) : (
            <View style={styles.globe}>
              <GlobeView
                key={`${location.latitude},${location.longitude}`}
                latitude={location.latitude}
                longitude={location.longitude}
                rings={rings}
                size={Math.min(mapHeight - 24, width - 64)}
              />
              <Text style={styles.globeHint}>Drag to spin</Text>
            </View>
          )}
          <View style={styles.mapTools}>
            <Pressable onPress={replay} style={styles.tool} accessibilityRole="button" accessibilityLabel="Replay impact">
              <Text style={styles.toolText}>↻ Replay</Text>
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
                      {v === 'map' ? 'Map' : 'Globe'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={styles.headline}>
          <Text style={styles.kicker}>{airburst ? 'AIRBURST ENERGY' : 'ENERGY RELEASED'}</Text>
          <Text style={styles.energy} adjustsFontSizeToFit numberOfLines={1}>
            {energy.value} {energy.unit}
          </Text>
          <Text style={styles.multiple}>≈ {multiple} the Hiroshima bomb</Text>
        </View>

        <View style={styles.grid}>
          {airburst ? (
            <StatCard
              label="CRATER WIDTH"
              value="None"
              hint={`Exploded ${sig3(result.airburstAltitudeM! / 1000)} km up`}
            />
          ) : (
            <StatCard
              label="CRATER WIDTH"
              value={formatDistance(result.craterDiameterM!)}
              hint={`${formatDistance(result.craterDepthM!)} deep`}
            />
          )}
          <StatCard
            label="QUAKE EQUIVALENT"
            value={result.seismicMagnitude !== null ? `${result.seismicMagnitude.toFixed(1)} M` : '—'}
            hint={result.seismicMagnitude !== null ? 'Richter scale' : 'Airbursts barely shake the ground'}
          />
        </View>
        <View style={styles.grid}>
          <StatCard label="BUILDINGS COLLAPSE" value={distanceText(severe)} hint={ringHint(severe, 'radius, ~5 psi')} />
          <StatCard label="WINDOWS SHATTER" value={distanceText(windows)} hint={ringHint(windows, 'radius, ~1 psi')} />
        </View>

        <PopulationCard
          strike={world.lastStrike}
          survivors={world.survivors}
          strikes={world.strikes}
          onReset={world.reset}
        />

        {isPro ? (
          <View style={styles.grid}>
            <StatCard
              label="3RD-DEGREE BURNS"
              value={distanceText(thermal)}
              hint={thermal ? ringHint(thermal, 'radius, exposed skin') : 'No thermal pulse at ground'}
            />
            <StatCard label="HAPPENS ON EARTH" value={formatYears(result.recurrenceYears)} />
          </View>
        ) : (
          <SecondaryButton
            label="Unlock thermal burns ring · Pro"
            onPress={openPaywall}
            style={styles.unlock}
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
            <Text style={styles.footnote}>
              Pro adds iron & comet asteroids, the burns ring and famous impacts.
            </Text>
          </View>
        )}
        <Text style={styles.footnote}>
          Estimates from the Earth Impact Effects Program equations (Collins, Melosh & Marcus,
          2005). Assumes a land impact at {result.params.angleDeg}°. People from NASA SEDAC GPWv4
          scaled to 2026; casualties per NASA&apos;s PAIR model (everyone inside the 4 psi or burns
          radius), global deaths per Chapman &amp; Morrison (1994). Rough estimates.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <SecondaryButton label="Try again" onPress={() => router.back()} style={styles.flex} />
        <PrimaryButton label="Share" onPress={() => router.push('/share')} style={styles.flex} />
      </View>
      <AdBanner />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  place: { flex: 1, fontSize: 13, color: colors.muted, fontFamily: fonts.bodySemi },
  body: { paddingHorizontal: 20, paddingBottom: 16, gap: 10 },
  mapWrap: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#0F1424' },
  globe: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  globeHint: { position: 'absolute', bottom: 8, fontSize: 10, color: colors.dim, fontFamily: fonts.body },
  mapTools: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
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
  unlock: { minHeight: 48 },
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
