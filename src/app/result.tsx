import { Redirect, router } from 'expo-router';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdBanner } from '../ads/AdBanner';
import { ImpactMap } from '../components/ImpactMap';
import { RingLegend } from '../components/RingLegend';
import { BackIcon, LockIcon, ShareIcon } from '../components/icons';
import { visibleRings } from '../components/rings';
import { IconButton, PrimaryButton, SecondaryButton, StatCard } from '../components/ui';
import {
  formatDistance,
  formatEnergyMt,
  formatMultiple,
  formatYears,
  sig3,
} from '../physics/format';
import type { Ring } from '../physics/impact';
import { PRESETS } from '../physics/presets';
import { usePremium } from '../state/premium';
import { useSimulation } from '../state/simulation';
import { colors, fonts, radius } from '../theme';

const ringRadius = (rings: Ring[], kind: Ring['kind']) => rings.find((r) => r.kind === kind);

export default function Result() {
  const { result, location, presetId } = useSimulation();
  const { isPro } = usePremium();
  const { height } = useWindowDimensions();

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

  const distanceText = (r: Ring | undefined) =>
    r ? `${r.capped ? '>' : ''}${formatDistance(r.radiusM)}` : 'None';

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
        <View style={[styles.mapWrap, { height: Math.max(260, height * 0.36) }]}>
          <ImpactMap location={location} rings={rings} />
          <RingLegend
            rings={rings}
            onLockedThermal={!isPro && thermal ? openPaywall : undefined}
          />
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
          <StatCard label="BUILDINGS COLLAPSE" value={distanceText(severe)} hint="radius, ~5 psi" />
          <StatCard label="WINDOWS SHATTER" value={distanceText(windows)} hint="radius, ~1 psi" />
        </View>

        {isPro ? (
          <View style={styles.grid}>
            <StatCard
              label="3RD-DEGREE BURNS"
              value={distanceText(thermal)}
              hint={thermal ? 'radius, exposed skin' : 'No thermal pulse at ground'}
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
          2005). Assumes a land impact at {result.params.angleDeg}°.
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
