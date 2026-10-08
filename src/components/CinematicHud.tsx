import { useEffect, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { t } from '../i18n/core';
import { dec, formatDistance, formatEnergyMt, formatPeople, formatSpeed, type Units } from '../physics/format';
import { colors, fonts } from '../theme';

export type CinePhase = 'fall' | 'impact' | 'done';

interface Props {
  phase: CinePhase | null;
  /** Date.now() when the current phase began. */
  since: number;
  /** How long the on-screen fall lasts, ms (matches the camera dive). */
  fallMs: number;
  velocityMs: number;
  angleDeg: number;
  /** Where the meteor bursts in the air, or null if it reaches the ground. */
  airburstAltitudeM: number | null;
  energyMt: number;
  /** Everyone killed by this strike (local + global). */
  deaths: number;
  units: Units;
  top: number;
}

/** The atmosphere's edge (Kármán line): where the readout starts. */
const ENTRY_ALT_M = 100_000;
/** How long the numbers take to roll up after impact. */
const ENERGY_ROLL_MS = 1500;
const DEATHS_ROLL_MS = 3200;

/**
 * Fraction of the way from the atmosphere's edge still to fall, at fraction p
 * of the on-screen fall. Fast high up, slower near the ground, so the last few
 * kilometres (and the cloud layer) get screen time.
 */
export const fallLeft = (p: number) => Math.pow(1 - Math.min(Math.max(p, 0), 1), 1.6);
/** Top of the altitude readout's fall: the atmosphere's edge (100 km). */
export const FALL_START_ALT_M = ENTRY_ALT_M;

const easeOut = (x: number) => 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 3);

/**
 * The cinematic strike's heads-up display. While the meteor falls: altitude,
 * speed and a countdown to impact, with real numbers for this asteroid. On
 * impact: the energy and the death toll roll up as the rings spread.
 */
export function CinematicHud({
  phase,
  since,
  fallMs,
  velocityMs,
  angleDeg,
  airburstAltitudeM,
  energyMt,
  deaths,
  units,
  top,
}: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [fade] = useState(() => new Animated.Value(0));

  // Tick while something is moving; stop once the numbers have settled.
  useEffect(() => {
    if (!phase || phase === 'done') return;
    let raf = 0;
    const loop = () => {
      setNow(Date.now());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  useEffect(() => {
    Animated.timing(fade, {
      toValue: phase && phase !== 'done' ? 1 : 0,
      duration: phase === 'done' ? 900 : 250,
      delay: phase === 'done' ? 1200 : 0,
      useNativeDriver: true,
    }).start();
  }, [phase, fade]);

  if (!phase) return null;
  const elapsed = Math.max(0, now - since);

  const endAlt = airburstAltitudeM ?? 0;
  const sin = Math.max(Math.sin((angleDeg * Math.PI) / 180), 0.1);
  /** Real seconds from the atmosphere's edge to impact (or burst) for this asteroid. */
  const realTotal = (ENTRY_ALT_M - endAlt) / sin / velocityMs;

  let body: ReactNode;
  if (phase === 'fall') {
    const left = fallLeft(elapsed / fallMs);
    const alt = endAlt + (ENTRY_ALT_M - endAlt) * left;
    body = (
      <>
        <Row label={t('hud.altitude')} value={formatDistance(alt, units)} />
        <Row label={t('hud.speed')} value={formatSpeed(velocityMs, units)} />
        <View style={styles.countWrap}>
          <Text style={styles.countLabel}>{t(airburstAltitudeM !== null ? 'hud.airburstIn' : 'hud.impactIn')}</Text>
          <Text style={styles.count}>{dec(realTotal * left, 1)} s</Text>
        </View>
      </>
    );
  } else {
    const e = formatEnergyMt(energyMt * easeOut(elapsed / ENERGY_ROLL_MS));
    const d = Math.round(deaths * easeOut(elapsed / DEATHS_ROLL_MS));
    body = (
      <>
        <Text style={styles.bigLabel}>{t('hud.energy')}</Text>
        <Text style={styles.big}>
          {e.value} {e.unit}
        </Text>
        {deaths > 0 && (
          <>
            <Text style={[styles.bigLabel, styles.gap]}>{t('hud.casualties')}</Text>
            <Text style={[styles.big, styles.deaths]}>{formatPeople(d)}</Text>
          </>
        )}
      </>
    );
  }

  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, { top, opacity: fade }]}>
      <View style={styles.panel}>{body}</View>
    </Animated.View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  panel: {
    minWidth: 220,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(8,10,20,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,74,0.45)',
    alignItems: 'center',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', gap: 18 },
  rowLabel: { fontSize: 11, letterSpacing: 1.4, color: colors.muted, fontFamily: fonts.bodySemi },
  rowValue: { fontSize: 13, color: colors.text, fontFamily: fonts.bodySemi, fontVariant: ['tabular-nums'] },
  countWrap: { marginTop: 6, alignItems: 'center' },
  countLabel: { fontSize: 11, letterSpacing: 1.6, color: colors.accent, fontFamily: fonts.bodySemi },
  count: { fontSize: 34, color: colors.text, fontFamily: fonts.display, fontVariant: ['tabular-nums'] },
  bigLabel: { fontSize: 11, letterSpacing: 1.6, color: colors.muted, fontFamily: fonts.bodySemi },
  big: { fontSize: 26, color: colors.text, fontFamily: fonts.display, fontVariant: ['tabular-nums'] },
  deaths: { color: colors.accent },
  gap: { marginTop: 6 },
});
