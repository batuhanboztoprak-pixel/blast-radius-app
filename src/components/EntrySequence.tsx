import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { t } from '../i18n/core';
import { formatDistance, formatSpeed, type Units } from '../physics/format';
import type { Composition } from '../physics/impact';
import { colors, fonts } from '../theme';

/** How long the entry plays before the map dive takes over, ms (ImpactMap waits this long). */
export const ENTRY_MS = 3200;
/** Cross-fade into the map dive, ms. */
const FADE_MS = 650;
/** The readout runs from here down to the atmosphere's edge, where the map HUD takes over. */
const START_ALT_M = 400_000;
const HANDOFF_ALT_M = 100_000;

const METEOR = require('../../assets/brand/impact-meteor.png');
const METEOR_ASPECT = 557 / 629;
/** The rock's centre inside the meteor image, as fractions of its size. */
const ROCK = { x: 0.343, y: 0.657 };
/** Unit vector from the rock back along its tail (up and to the right). */
const TAIL = { x: 0.668, y: -0.744 };
/** The tail's angle from straight up, degrees: streaks rush past along it. */
const TAIL_DEG = (Math.atan2(TAIL.x, -TAIL.y) * 180) / Math.PI;

/**
 * How each kind of asteroid burns on entry (matching the map strike's looks):
 * stony rock glows orange-yellow (sodium), an iron body burns white-hot and
 * throws golden sparks, an icy comet comes in fast with a blue-cyan glow.
 */
const ENTRY_LOOK: Record<
  Composition,
  {
    heat: [string, string, string, string];
    tint: [string, string];
    streak: string;
    core: [string, string, string];
    /** A coloured wash over the meteor art (icy blue for comets), or null to keep its own colours. */
    wash: { color: string; opacity: number } | null;
    sparks: string | null;
  }
> = {
  rock: {
    heat: ['#FFF4C2', '#FFB347', '#FF5A1F', '#FF2E2E'],
    tint: ['#FF3D2E', '#FF7A1A'],
    streak: '#FFE2B8',
    core: ['#FFFBE6', '#FFC24A', '#FF6A2E'],
    wash: null,
    sparks: null,
  },
  iron: {
    heat: ['#FFFFFF', '#FFF0C8', '#FFB15A', '#FF7A2E'],
    tint: ['#FFB347', '#FFE2A8'],
    streak: '#FFF6DE',
    core: ['#FFFFFF', '#FFF3D1', '#FFC27A'],
    wash: null,
    sparks: '#FFE3A3',
  },
  comet: {
    heat: ['#F4FEFF', '#A8E9FF', '#4AD3E6', '#4A9EFF'],
    tint: ['#1E5BFF', '#4AD3E6'],
    streak: '#CFF7FF',
    core: ['#FFFFFF', '#CFF7FF', '#4AD3E6'],
    wash: { color: '#78C8FF', opacity: 0.75 },
    sparks: '#CFF7FF',
  },
};

/** Deterministic pseudo-random numbers, so the starfield is the same every time. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface Props {
  composition: Composition;
  velocityMs: number;
  units: Units;
  /** Where the readout panel sits (matches the map HUD, so the hand-over is seamless). */
  top: number;
  onDone: () => void;
}

/**
 * The cinematic strike's opening shot, full screen: deep space, the Earth's
 * glowing limb rising as we fall towards it with the meteor, then the meteor
 * ignites in the atmosphere, plasma, heat and streaks rushing past, until it
 * cross-fades into the real map dive. Played only when Reduce Motion is off.
 */
export function EntrySequence({ composition, velocityMs, units, top, onDone }: Props) {
  const look = ENTRY_LOOK[composition] ?? ENTRY_LOOK.rock;
  const { width: W, height: H } = useWindowDimensions();
  const [p] = useState(() => new Animated.Value(0));
  const [fade] = useState(() => new Animated.Value(1));
  const [shakeX] = useState(() => new Animated.Value(0));
  const [shakeY] = useState(() => new Animated.Value(0));
  const [rush] = useState(() => [0, 1, 2].map(() => new Animated.Value(0)));

  useEffect(() => {
    const loops: Animated.CompositeAnimation[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [];
    const jitter = (v: Animated.Value, ms: number) =>
      Animated.loop(
        Animated.sequence(
          [0.8, -1, 0.5, -0.6, 1, -0.3].map((x) =>
            Animated.timing(v, { toValue: x, duration: ms, easing: Easing.linear, useNativeDriver: true }),
          ),
        ),
      );
    loops.push(jitter(shakeX, 46), jitter(shakeY, 58));
    rush.forEach((v, i) => {
      const l = Animated.loop(Animated.timing(v, { toValue: 1, duration: 420, easing: Easing.linear, useNativeDriver: true }));
      loops.push(l);
      timers.push(setTimeout(() => l.start(), i * 140));
    });
    loops.slice(0, 2).forEach((l) => l.start());

    Animated.timing(p, { toValue: 1, duration: ENTRY_MS, easing: Easing.linear, useNativeDriver: true }).start();
    timers.push(
      setTimeout(() => {
        Animated.timing(fade, { toValue: 0, duration: FADE_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(
          () => onDone(),
        );
      }, ENTRY_MS),
    );

    return () => {
      loops.forEach((l) => l.stop());
      timers.forEach(clearTimeout);
    };
    // Runs once per mount: every strike mounts a fresh sequence.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Geometry -------------------------------------------------------------
  const rockX = W * 0.5;
  const rockY = H * 0.46;
  const Re = W * 1.6; // the Earth's radius on screen at the start
  const earthCY = H + Re * 0.55;
  const Rv = Re * 1.08; // with room for the atmosphere glow
  const Wm = W * 0.95;
  const Hm = Wm * METEOR_ASPECT;
  const D = Math.ceil(Math.hypot(W, H)) + 40; // streak layer, big enough to rotate
  const glowR = W * 0.55;

  const stars = useMemo(() => {
    const r = seeded(42);
    return Array.from({ length: 90 }, () => ({ x: r() * W, y: r() * H * 1.6, r: 0.4 + r() * 1.3, o: 0.35 + r() * 0.65 }));
  }, [W, H]);
  const streaks = useMemo(() => {
    const r = seeded(7);
    return [0, 1, 2].map(() =>
      Array.from({ length: 6 }, () => ({ x: r() * D, len: 90 + r() * 220, off: r() * D * 0.5, w: 0.8 + r() * 1.6, o: 0.25 + r() * 0.5 })),
    );
  }, [D]);

  const sparks = useMemo(() => {
    const r = seeded(11);
    return Array.from({ length: 14 }, () => ({
      r: 1.2 + r() * 2.2,
      d: r(),
      ox: (r() - 0.5) * Wm * 0.08,
      oy: (r() - 0.5) * Wm * 0.08,
      sx: (r() - 0.5) * 0.7,
      sy: (r() - 0.5) * 0.7,
    }));
  }, [Wm]);

  // --- Animated values --------------------------------------------------------
  const earthScale = p.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.38, 2.5] });
  const starsY = p.interpolate({ inputRange: [0, 1], outputRange: [0, -H * 0.55], easing: Easing.in(Easing.quad) });
  const starsOpacity = p.interpolate({ inputRange: [0, 0.5, 0.75], outputRange: [1, 0.9, 0], extrapolate: 'clamp' });
  const heat = p.interpolate({ inputRange: [0, 0.3, 0.55, 1], outputRange: [0, 0, 0.95, 0.8], extrapolate: 'clamp' });
  const tint = p.interpolate({ inputRange: [0, 0.38, 0.65, 1], outputRange: [0, 0, 0.42, 0.3], extrapolate: 'clamp' });
  const streakOpacity = p.interpolate({ inputRange: [0, 0.36, 0.48, 1], outputRange: [0, 0, 1, 1], extrapolate: 'clamp' });
  const glow = p.interpolate({ inputRange: [0, 0.28, 0.55, 1], outputRange: [0, 0.15, 1, 1], extrapolate: 'clamp' });
  const meteorScale = p.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0.22, 0.62, 1.05], easing: Easing.inOut(Easing.quad) });
  const tailOff = W * 0.6;
  const meteorX = p.interpolate({ inputRange: [0, 0.45, 1], outputRange: [TAIL.x * tailOff, 0, -W * 0.02] });
  const meteorY = p.interpolate({ inputRange: [0, 0.45, 1], outputRange: [TAIL.y * tailOff, 0, H * 0.03] });
  const shakeAmp = p.interpolate({ inputRange: [0, 0.38, 0.9], outputRange: [0, 0, 5], extrapolate: 'clamp' });
  const bars = fade.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const barH = H * 0.075;
  const readout = fade.interpolate({ inputRange: [0.85, 1], outputRange: [0, 1], extrapolate: 'clamp' });

  // Scale around the rock rather than the image centre.
  const ax = (ROCK.x - 0.5) * Wm;
  const ay = (ROCK.y - 0.5) * Hm;

  // --- Readout ----------------------------------------------------------------

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity: fade }]} pointerEvents="auto">
      {/* Stars, drifting up as we fall. */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: starsOpacity, transform: [{ translateY: starsY }] }]}>
        <Svg width={W} height={H * 1.6}>
          {stars.map((s, i) => (
            <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#FFFFFF" opacity={s.o} />
          ))}
        </Svg>
      </Animated.View>

      {/* The Earth: its glowing limb rises and fills the view. */}
      <Animated.View
        style={{ position: 'absolute', left: W / 2 - Rv, top: earthCY - Rv, width: Rv * 2, height: Rv * 2, transform: [{ scale: earthScale }] }}
      >
        <Svg width={Rv * 2} height={Rv * 2}>
          <Defs>
            <RadialGradient id="atmo" cx="50%" cy="50%" r="50%">
              <Stop offset={0.88} stopColor="#5CC8FF" stopOpacity={0} />
              <Stop offset={0.915} stopColor="#8A7CFF" stopOpacity={0.95} />
              <Stop offset={0.94} stopColor="#5CC8FF" stopOpacity={0.45} />
              <Stop offset={1} stopColor="#5CC8FF" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="planet" cx="50%" cy="22%" r="75%">
              <Stop offset={0} stopColor="#4B3CD6" />
              <Stop offset={0.45} stopColor="#22197A" />
              <Stop offset={1} stopColor="#0A0628" />
            </RadialGradient>
          </Defs>
          <Circle cx={Rv} cy={Rv} r={Rv} fill="url(#atmo)" />
          <Circle cx={Rv} cy={Rv} r={Re} fill="url(#planet)" />
          <G opacity={0.35} fill="#6A5CF0">
            <Ellipse cx={Rv - Re * 0.35} cy={Rv - Re * 0.72} rx={Re * 0.22} ry={Re * 0.07} />
            <Ellipse cx={Rv + Re * 0.18} cy={Rv - Re * 0.82} rx={Re * 0.16} ry={Re * 0.05} />
            <Ellipse cx={Rv + Re * 0.42} cy={Rv - Re * 0.6} rx={Re * 0.2} ry={Re * 0.09} />
            <Ellipse cx={Rv - Re * 0.05} cy={Rv - Re * 0.55} rx={Re * 0.26} ry={Re * 0.1} />
          </G>
        </Svg>
      </Animated.View>

      {/* Entry: the air turns to fire around us. */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: tint }]}>
        <Svg width={W} height={H}>
          <Defs>
            <LinearGradient id="tint" x1="0" y1="0" x2="0" y2="1">
              <Stop offset={0} stopColor={look.tint[0]} stopOpacity={0.15} />
              <Stop offset={1} stopColor={look.tint[1]} stopOpacity={0.85} />
            </LinearGradient>
          </Defs>
          <Rect width={W} height={H} fill="url(#tint)" />
        </Svg>
      </Animated.View>

      {/* Streaks rushing past along the meteor's path. */}
      <Animated.View
        style={{
          position: 'absolute',
          left: (W - D) / 2,
          top: (H - D) / 2,
          width: D,
          height: D,
          opacity: streakOpacity,
          transform: [{ rotate: `${TAIL_DEG}deg` }],
        }}
      >
        {streaks.map((group, gi) =>
          group.map((s, i) => (
            <Animated.View
              key={`${gi}-${i}`}
              style={{
                position: 'absolute',
                left: s.x,
                top: 0,
                transform: [{ translateY: rush[gi].interpolate({ inputRange: [0, 1], outputRange: [D + s.off, -s.len - s.off] }) }],
              }}
            >
              <Svg width={4} height={s.len}>
                <Defs>
                  <LinearGradient id={`st${gi}${i}`} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset={0} stopColor={look.streak} stopOpacity={0} />
                    <Stop offset={0.5} stopColor={look.streak} stopOpacity={s.o} />
                    <Stop offset={1} stopColor={look.streak} stopOpacity={0} />
                  </LinearGradient>
                </Defs>
                <Line x1={2} y1={0} x2={2} y2={s.len} stroke={`url(#st${gi}${i})`} strokeWidth={s.w} />
              </Svg>
            </Animated.View>
          )),
        )}
      </Animated.View>

      {/* Plasma glow around the rock, and the heat haze around it. */}
      <Animated.View
        style={{
          position: 'absolute',
          left: rockX - glowR,
          top: rockY - glowR,
          width: glowR * 2,
          height: glowR * 2,
          opacity: heat,
          transform: [{ translateX: meteorX }, { translateY: meteorY }],
        }}
      >
        <Svg width={glowR * 2} height={glowR * 2}>
          <Defs>
            <RadialGradient id="heat" cx="50%" cy="50%" r="50%">
              <Stop offset={0} stopColor={look.heat[0]} stopOpacity={0.95} />
              <Stop offset={0.18} stopColor={look.heat[1]} stopOpacity={0.75} />
              <Stop offset={0.5} stopColor={look.heat[2]} stopOpacity={0.32} />
              <Stop offset={1} stopColor={look.heat[3]} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width={glowR * 2} height={glowR * 2} fill="url(#heat)" />
        </Svg>
      </Animated.View>

      {/* The meteor (the same art as the icon), flying with us, shaking as it burns. */}
      <Animated.View
        style={{
          position: 'absolute',
          left: rockX - ROCK.x * Wm,
          top: rockY - ROCK.y * Hm,
          width: Wm,
          height: Hm,
          transform: [
            { translateX: Animated.add(meteorX, Animated.multiply(shakeX, shakeAmp)) },
            { translateY: Animated.add(meteorY, Animated.multiply(shakeY, shakeAmp)) },
            { translateX: ax },
            { translateY: ay },
            { scale: meteorScale },
            { translateX: -ax },
            { translateY: -ay },
          ],
        }}
      >
        <Animated.Image source={METEOR} style={{ width: Wm, height: Hm }} />
        {look.wash && (
          // Recolours the art for iron (white-hot) and comets (icy blue).
          <Animated.Image
            source={METEOR}
            style={{ position: 'absolute', left: 0, top: 0, width: Wm, height: Hm, tintColor: look.wash.color, opacity: look.wash.opacity }}
          />
        )}
        {look.sparks &&
          sparks.map((k, i) => {
            const r = rush[i % 3];
            const dist = Wm * (0.25 + k.d * 0.4);
            return (
              <Animated.View
                key={i}
                style={{
                  position: 'absolute',
                  left: ROCK.x * Wm + k.ox - k.r,
                  top: ROCK.y * Hm + k.oy - k.r,
                  width: k.r * 2,
                  height: k.r * 2,
                  borderRadius: k.r,
                  backgroundColor: look.sparks ?? undefined,
                  opacity: Animated.multiply(glow, r.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] })),
                  transform: [
                    { translateX: r.interpolate({ inputRange: [0, 1], outputRange: [0, (TAIL.x + k.sx) * dist] }) },
                    { translateY: r.interpolate({ inputRange: [0, 1], outputRange: [0, (TAIL.y + k.sy) * dist] }) },
                  ],
                }}
              />
            );
          })}
        <Animated.View
          style={{
            position: 'absolute',
            left: ROCK.x * Wm - Wm * 0.12,
            top: ROCK.y * Hm - Wm * 0.12,
            width: Wm * 0.24,
            height: Wm * 0.24,
            opacity: glow,
          }}
        >
          <Svg width={Wm * 0.24} height={Wm * 0.24}>
            <Defs>
              <RadialGradient id="core" cx="50%" cy="50%" r="50%">
                <Stop offset={0} stopColor={look.core[0]} stopOpacity={0.9} />
                <Stop offset={0.5} stopColor={look.core[1]} stopOpacity={0.35} />
                <Stop offset={1} stopColor={look.core[2]} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect width={Wm * 0.24} height={Wm * 0.24} fill="url(#core)" />
          </Svg>
        </Animated.View>
      </Animated.View>

      {/* Letterbox bars: it plays like a film. */}
      <Animated.View style={[styles.bar, { top: 0, height: barH, opacity: bars }]} />
      <Animated.View style={[styles.bar, { bottom: 0, height: barH, opacity: bars }]} />

      {/* Readout, in the same spot as the map HUD that takes over at 100 km. */}
      <Animated.View style={[styles.wrap, { top, opacity: readout }]} pointerEvents="none">
        <View style={styles.panel}>
          <Text style={styles.label}>{t('hud.entry')}</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('hud.altitude')}</Text>
            <AltitudeReadout units={units} />
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('hud.speed')}</Text>
            <Text style={styles.rowValue}>{formatSpeed(velocityMs, units)}</Text>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

/**
 * The altitude number on its own, ticking every ~50 ms. Kept separate so its
 * updates re-render only this line, not the whole scene (which would stutter).
 */
function AltitudeReadout({ units }: { units: Units }) {
  const [start] = useState(() => Date.now());
  const [now, setNow] = useState(start);
  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t - start >= ENTRY_MS) clearInterval(id);
    }, 50);
    return () => clearInterval(id);
  }, [start]);
  const k = Math.min((now - start) / ENTRY_MS, 1);
  const alt = HANDOFF_ALT_M + (START_ALT_M - HANDOFF_ALT_M) * Math.pow(1 - k, 1.4);
  return <Text style={styles.rowValue}>{formatDistance(alt, units)}</Text>;
}

const styles = StyleSheet.create({
  root: { backgroundColor: '#02010A', zIndex: 50, overflow: 'hidden' },
  bar: { position: 'absolute', left: 0, right: 0, backgroundColor: '#000000' },
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
    gap: 2,
  },
  label: { fontSize: 11, letterSpacing: 1.6, color: colors.accent, fontFamily: fonts.bodySemi, marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', gap: 18 },
  rowLabel: { fontSize: 11, letterSpacing: 1.4, color: colors.muted, fontFamily: fonts.bodySemi },
  rowValue: { fontSize: 13, color: colors.text, fontFamily: fonts.bodySemi, fontVariant: ['tabular-nums'] },
});
