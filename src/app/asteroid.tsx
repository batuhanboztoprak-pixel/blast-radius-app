import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdBanner } from '../ads/AdBanner';
import { useAds } from '../ads/ads';
import { Chip, PrimaryButton, StepHeader } from '../components/ui';
import { COMPOSITION_LABEL, formatDiameter, formatEnergyMt, formatSpeed } from '../physics/format';
import type { Composition } from '../physics/impact';
import { PRESETS } from '../physics/presets';
import { usePremium } from '../state/premium';
import { useSimulation } from '../state/simulation';
import { colors, fonts } from '../theme';

const MIN_DIAMETER = 10;
const MAX_DIAMETER = 10_000;
const MIN_SPEED_KMS = 11;
const MAX_SPEED_KMS = 72;

// The diameter slider is logarithmic so 10 m and 10 km are both reachable.
const toSlider = (d: number) => Math.log(d / MIN_DIAMETER) / Math.log(MAX_DIAMETER / MIN_DIAMETER);
const fromSlider = (v: number) => {
  const d = MIN_DIAMETER * (MAX_DIAMETER / MIN_DIAMETER) ** v;
  const step = d < 100 ? 1 : d < 1000 ? 5 : 50;
  return Math.round(d / step) * step;
};

const COMPOSITIONS: Composition[] = ['comet', 'rock', 'iron'];

export default function SetAsteroid() {
  const { params, updateParams, presetId, applyPreset, result, location } = useSimulation();
  const { isPro } = usePremium();
  const { onSimulation } = useAds();
  const [simulating, setSimulating] = useState(false);
  // Slider thumbs stay uncontrolled while dragging; bump the key to move them programmatically.
  const [sliderKey, setSliderKey] = useState(0);

  const energy = result ? formatEnergyMt(result.entryEnergyMt) : null;

  async function simulate() {
    setSimulating(true);
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
        step="STEP 2 OF 3"
        title="Set the asteroid"
        subtitle={location ? `Target: ${location.label}` : 'Size and speed decide how bad it gets.'}
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.group}>
          <View style={styles.row}>
            <Text style={styles.label}>Diameter</Text>
            <Text style={[styles.value, { color: colors.accent }]}>{formatDiameter(params.diameterM)}</Text>
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
            accessibilityLabel="Asteroid diameter"
          />
          <View style={styles.row}>
            <Text style={styles.range}>10 m</Text>
            <Text style={styles.range}>10 km</Text>
          </View>
        </View>

        <View style={styles.group}>
          <Text style={styles.label}>Composition</Text>
          <View style={styles.chips}>
            {COMPOSITIONS.map((c) => {
              const locked = !isPro && c !== 'rock';
              return (
                <Chip
                  key={c}
                  label={COMPOSITION_LABEL[c]}
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
            <Text style={styles.label}>Entry speed</Text>
            <Text style={[styles.value, { color: colors.blue }]}>{formatSpeed(params.velocityMs)}</Text>
          </View>
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
            accessibilityLabel="Entry speed"
          />
          <View style={styles.row}>
            <Text style={styles.range}>{MIN_SPEED_KMS} km/s</Text>
            <Text style={styles.range}>{MAX_SPEED_KMS} km/s</Text>
          </View>
        </View>

        <View style={styles.group}>
          <Text style={styles.label}>Famous impacts</Text>
          <View style={styles.chips}>
            {PRESETS.map((p) => (
              <Chip
                key={p.id}
                label={p.name}
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
            <Text style={styles.note}>
              {params.angleDeg}° entry angle, as reconstructed for the real event.
            </Text>
          )}
        </View>

        {energy && (
          <Text style={styles.preview}>
            ≈ {energy.value} {energy.unit} of TNT
          </Text>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton label="Simulate impact" onPress={simulate} loading={simulating} />
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
  range: { fontSize: 11, color: colors.dim, fontFamily: fonts.body },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  flexChip: { flexGrow: 1, flexBasis: 0 },
  note: { fontSize: 12, color: colors.muted, fontFamily: fonts.body },
  preview: { fontSize: 13, color: colors.muted, fontFamily: fonts.bodyMedium, textAlign: 'center' },
  footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
});
