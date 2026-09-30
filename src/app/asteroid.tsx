import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { InteractionManager, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdBanner } from '../ads/AdBanner';
import { useAds } from '../ads/ads';
import { Chip, PrimaryButton, StepHeader } from '../components/ui';
import { t } from '../i18n/core';
import {
  compositionLabel,
  formatDiameter,
  formatEnergyMt,
  formatSpeed,
  formatSpeedPerHour,
  type Units,
} from '../physics/format';
import type { Composition } from '../physics/impact';
import { PRESETS, presetText } from '../physics/presets';
import { populationImpact } from '../population/casualties';
import { peopleWithin2015 } from '../population/grid';
import { usePremium } from '../state/premium';
import { useSimulation } from '../state/simulation';
import { useUnits } from '../state/units';
import { useWorld } from '../state/world';
import { colors, fonts } from '../theme';

const MIN_DIAMETER = 10;
const MAX_DIAMETER = 20_000;
// Natural impact speeds (Collins et al. 2005, §Impactor properties): nothing that
// falls from space hits slower than Earth's escape speed (11.2 km/s), and nothing
// bound to the Sun hits faster than ~72 km/s (solar escape speed at 1 AU, 42 km/s,
// plus Earth's orbital speed, 30 km/s, head-on). Asteroids average ~17–20 km/s.
const MIN_SPEED_KMS = 11;
const MAX_SPEED_KMS = 72;

// The diameter slider is logarithmic so 10 m and 20 km are both reachable.
const toSlider = (d: number) => Math.log(d / MIN_DIAMETER) / Math.log(MAX_DIAMETER / MIN_DIAMETER);
const fromSlider = (v: number) => {
  const d = MIN_DIAMETER * (MAX_DIAMETER / MIN_DIAMETER) ** v;
  const step = d < 100 ? 1 : d < 1000 ? 5 : d < 10_000 ? 50 : 100;
  return Math.round(d / step) * step;
};

const COMPOSITIONS: Composition[] = ['comet', 'rock', 'iron'];

export default function SetAsteroid() {
  const { params, updateParams, presetId, applyPreset, result, location } = useSimulation();
  const { isPro } = usePremium();
  const { onSimulation } = useAds();
  const { recordStrike } = useWorld();
  const { units, setUnits } = useUnits();
  const [simulating, setSimulating] = useState(false);
  // Slider thumbs stay uncontrolled while dragging; bump the key to move them programmatically.
  const [sliderKey, setSliderKey] = useState(0);

  // Decode the population grid while the user is still choosing, not when they tap Simulate.
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      peopleWithin2015(0, 0, 1);
    });
    return () => task.cancel();
  }, []);

  const energy = result ? formatEnergyMt(result.entryEnergyMt) : null;

  async function simulate() {
    setSimulating(true);
    if (result && location) {
      recordStrike((survivors) =>
        populationImpact(result, location.latitude, location.longitude, survivors),
      );
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    try {
      await onSimulation();
    } finally {
      setSimulating(false);
      router.push('/result');
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StepHeader
        step={t('asteroid.step')}
        title={t('asteroid.title')}
        subtitle={location ? t('asteroid.target', { place: location.label }) : t('asteroid.subtitle')}
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.group}>
          <View style={styles.row}>
            <Text style={styles.label}>{t('asteroid.diameter')}</Text>
            <Text style={[styles.value, { color: colors.accent }]}>{formatDiameter(params.diameterM, units)}</Text>
          </View>
          <Slider
            key={`d${sliderKey}`}
            value={toSlider(params.diameterM)}
            onValueChange={(v) => updateParams({ diameterM: fromSlider(v) })}
            minimumValue={0}
            maximumValue={1}
            minimumTrackTintColor={colors.accent}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.text}
            accessibilityLabel={t('asteroid.diameterA11y')}
          />
          <View style={styles.row}>
            <Text style={styles.range}>{formatDiameter(MIN_DIAMETER, units)}</Text>
            <Text style={styles.range}>{formatDiameter(MAX_DIAMETER, units)}</Text>
          </View>
        </View>

        <View style={styles.group}>
          <Text style={styles.label}>{t('asteroid.composition')}</Text>
          <View style={styles.chips}>
            {COMPOSITIONS.map((c) => {
              const locked = !isPro && c !== 'rock';
              return (
                <Chip
                  key={c}
                  label={compositionLabel(c)}
                  selected={params.composition === c}
                  locked={locked}
                  style={styles.flexChip}
                  onPress={() =>
                    locked ? router.push('/paywall') : updateParams({ composition: c })
                  }
                />
              );
            })}
          </View>
        </View>

        <View style={styles.group}>
          <View style={styles.row}>
            <Text style={styles.label}>{t('asteroid.speed')}</Text>
            <Text style={[styles.value, { color: colors.blue }]}>{formatSpeed(params.velocityMs, units)}</Text>
          </View>
          <Text style={styles.subValue}>{formatSpeedPerHour(params.velocityMs, units)}</Text>
          <Slider
            key={`v${sliderKey}`}
            value={params.velocityMs / 1000}
            onValueChange={(v) => updateParams({ velocityMs: Math.round(v) * 1000 })}
            minimumValue={MIN_SPEED_KMS}
            maximumValue={MAX_SPEED_KMS}
            step={1}
            minimumTrackTintColor={colors.blue}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.text}
            accessibilityLabel={t('asteroid.speedA11y')}
          />
          <View style={styles.row}>
            <Text style={styles.range}>{formatSpeed(MIN_SPEED_KMS * 1000, units)}</Text>
            <Text style={styles.range}>{formatSpeed(MAX_SPEED_KMS * 1000, units)}</Text>
          </View>
          <Text style={styles.note}>{t('asteroid.speedNote')}</Text>
        </View>

        <View style={styles.group}>
          <Text style={styles.label}>{t('asteroid.presets')}</Text>
          <View style={styles.chips}>
            {PRESETS.map((p) => (
              <Chip
                key={p.id}
                label={presetText(p.id).name}
                selected={presetId === p.id}
                locked={!isPro}
                onPress={() => {
                  if (!isPro) return router.push('/paywall');
                  applyPreset(p);
                  setSliderKey((k) => k + 1);
                }}
              />
            ))}
          </View>
          {presetId && (
            <Text style={styles.note}>{t('asteroid.presetAngle', { angle: params.angleDeg })}</Text>
          )}
        </View>

        {energy && (
          <Text style={styles.preview}>
            {t('asteroid.energyPreview', { value: energy.value, unit: energy.unit })}
          </Text>
        )}

        <View style={[styles.row, styles.unitsRow]}>
          <Text style={styles.label}>{t('units.label')}</Text>
          <View style={styles.chips} accessibilityLabel={t('units.a11y')}>
            {(['metric', 'imperial'] as Units[]).map((u) => (
              <Chip key={u} label={t(`units.${u}`)} selected={units === u} onPress={() => setUnits(u)} />
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton label={t('asteroid.simulate')} onPress={simulate} loading={simulating} />
      </View>
      <AdBanner />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, gap: 26 },
  group: { gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  label: { fontSize: 14, color: colors.text, fontFamily: fonts.bodySemi },
  value: { fontSize: 20, fontFamily: fonts.display },
  subValue: { fontSize: 12, color: colors.muted, fontFamily: fonts.body, textAlign: 'right', marginTop: -8 },
  range: { fontSize: 11, color: colors.dim, fontFamily: fonts.body },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  flexChip: { flexGrow: 1, flexBasis: 0 },
  note: { fontSize: 12, color: colors.muted, fontFamily: fonts.body },
  unitsRow: { alignItems: 'center' },
  preview: { fontSize: 13, color: colors.muted, fontFamily: fonts.bodyMedium, textAlign: 'center' },
  footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
});
