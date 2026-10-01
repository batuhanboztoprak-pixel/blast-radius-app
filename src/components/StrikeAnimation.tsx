import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Stop, Line } from 'react-native-svg';

import type { Composition, Ring } from '../physics/impact';
import { METEOR_LOOK } from './CompositionIcon';
import { RING_STYLE } from './rings';

export interface StrikeRing {
  kind: Ring['kind'];
  /** Ring radius in screen points at the map's current zoom. */
  px: number;
}

interface Props {
  width: number;
  height: number;
  /** Impact point in screen points. */
  center: { x: number; y: number };
  rings: StrikeRing[];
  /** Fired the moment the meteor lands: haptics, camera shake. */
  onImpact: () => void;
  /** Fired when the shockwaves have reached their final size. */
  onDone: () => void;
  /** How long the meteor takes to fall, ms. The cinematic strike falls slower. */
  fallMs?: number;
  /** Scales the fireball, flash, meteor and debris (cinematic uses ~1.6). */
  intensity?: number;
  /**
   * Draw the expanding rings and shock front here. The cinematic strike grows
   * the real map circles instead, because screen-space circles don't match a
   * tilted map.
   */
  drawRings?: boolean;
  /** Rock, iron or comet: each has its own meteor, tail and fireball colours. */
  composition?: Composition;
}

const DEFAULT_FALL_MS = 650;
/** Views larger than this are pointless (off screen) and cost memory. */
const MAX_RING_PX = 1600;
const DEBRIS = 14;

/** Cheap hash → [0, 1). */
const jitter = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * The strike sequence drawn over the map: a meteor streaks in, a white flash,
 * a fireball, then each damage ring expands to its real size on the map,
 * smallest first, with a bright shock front leading the way. Every animation
 * runs on the native driver (transforms and opacity only).
 */
export function StrikeAnimation({
  width,
  height,
  center,
  rings,
  onImpact,
  onDone,
  fallMs = DEFAULT_FALL_MS,
  intensity = 1,
  drawRings = true,
  composition = 'rock',
}: Props) {
  const FALL_MS = fallMs;
  const look = METEOR_LOOK[composition];
  const TAIL = look.tailLength;
  const sparks = useMemo(
    () =>
      look.sparks
        ? Array.from({ length: 12 }, (_, i) => {
            const along = 18 + jitter(i + 200) * (TAIL - 30);
            const off = (jitter(i + 300) - 0.5) * (composition === 'comet' ? 22 : 10);
            // Points along the tail line (from the head at (10, TAIL) up-right), pushed sideways.
            return { x: 10 + along * 0.707 + off * 0.707, y: TAIL - along * 0.707 + off * 0.707, r: 0.8 + jitter(i + 400) * 1.6 };
          })
        : [],
    [look.sparks, TAIL, composition],
  );
  const fall = useState(() => new Animated.Value(0))[0];
  const flash = useState(() => new Animated.Value(0))[0];
  const fire = useState(() => new Animated.Value(0))[0];
  const fade = useState(() => new Animated.Value(1))[0];
  const waves = useState(() => rings.map(() => new Animated.Value(0)))[0];
  const front = useState(() => new Animated.Value(0))[0];
  const debris = useState(() => new Animated.Value(0))[0];
  const plume = useState(() => new Animated.Value(0))[0];
  /** The cinematic strike gets a longer, blinding flash and a rising fireball plume. */
  const cine = intensity > 1;

  const maxPx = Math.min(Math.max(...rings.map((r) => r.px), 60), MAX_RING_PX);
  const crater = rings.find((r) => r.kind === 'crater')?.px ?? 0;
  const fireR = Math.min(Math.max(crater * 2.5, 34) * intensity, 150 * intensity);
  const travel = Math.hypot(width, height);

  // Debris directions look random but are deterministic (render must stay pure).
  const shards = useMemo(
    () =>
      Array.from({ length: DEBRIS }, (_, i) => {
        const j = jitter(i);
        const a = (i / DEBRIS) * 2 * Math.PI + j * 0.4;
        const d = Math.min(maxPx * (0.35 + jitter(i + 31) * 0.35), 220) * intensity;
        return { dx: Math.cos(a) * d, dy: Math.sin(a) * d, s: 2 + jitter(i + 57) * 3 };
      }),
    [maxPx, intensity],
  );

  useEffect(() => {
    const native = { useNativeDriver: true } as const;
    // Smaller rings are reached first; durations follow √radius so big ones still read.
    const waveAnims = rings.map((r, i) =>
      Animated.timing(waves[i], {
        toValue: 1,
        duration: 450 + 1100 * Math.sqrt(Math.min(r.px, MAX_RING_PX) / maxPx),
        easing: Easing.out(Easing.cubic),
        ...native,
      }),
    );

    const seq = Animated.sequence([
      Animated.timing(fall, { toValue: 1, duration: FALL_MS, easing: Easing.in(Easing.quad), ...native }),
      Animated.parallel([
        Animated.sequence([
          Animated.timing(flash, { toValue: 1, duration: 70 * intensity, ...native }),
          Animated.timing(flash, { toValue: 0, duration: cine ? 1400 : 420 * intensity, easing: Easing.out(Easing.quad), ...native }),
        ]),
        ...(cine ? [Animated.timing(plume, { toValue: 1, duration: 3000, easing: Easing.out(Easing.quad), ...native })] : []),
        Animated.timing(fire, { toValue: 1, duration: 1300, easing: Easing.out(Easing.quad), ...native }),
        Animated.timing(front, { toValue: 1, duration: 1500, easing: Easing.out(Easing.cubic), ...native }),
        Animated.timing(debris, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), ...native }),
        ...waveAnims,
      ]),
      Animated.delay(250),
    ]);

    const impactTimer = setTimeout(onImpact, FALL_MS);
    seq.start(({ finished }) => {
      if (!finished) return;
      onDone();
      Animated.timing(fade, { toValue: 0, duration: 450, ...native }).start();
    });
    return () => {
      clearTimeout(impactTimer);
      seq.stop();
    };
    // Runs once per mount; the parent remounts for a replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The meteor comes in from the upper right at 45°, like the default entry angle.
  const meteorX = fall.interpolate({ inputRange: [0, 1], outputRange: [travel * 0.7, 0] });
  const meteorY = fall.interpolate({ inputRange: [0, 1], outputRange: [-travel * 0.7, 0] });
  const meteorOpacity = fall.interpolate({ inputRange: [0, 0.98, 1], outputRange: [1, 1, 0] });

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: fade }]}>
      {/* Expanding damage rings, drawn largest first so small ones stay on top. */}
      {drawRings && rings.map((r, i) => {
        const px = Math.min(r.px, MAX_RING_PX);
        const s = RING_STYLE[r.kind];
        return (
          <Animated.View
            key={r.kind}
            style={[
              styles.ring,
              {
                left: center.x - px,
                top: center.y - px,
                width: px * 2,
                height: px * 2,
                borderRadius: px,
                backgroundColor: s.fill,
                borderColor: s.stroke,
                opacity: waves[i].interpolate({ inputRange: [0, 0.05, 1], outputRange: [0, 1, 1] }),
                transform: [{ scale: waves[i].interpolate({ inputRange: [0, 1], outputRange: [0.01, 1] }) }],
              },
            ]}
          />
        );
      })}

      {/* Shock front: a thin bright ring running just ahead of the largest wave. */}
      {drawRings && <Animated.View
        style={[
          styles.front,
          {
            left: center.x - maxPx * 1.06,
            top: center.y - maxPx * 1.06,
            width: maxPx * 2.12,
            height: maxPx * 2.12,
            borderRadius: maxPx * 1.06,
            opacity: front.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 0.9, 0.35, 0] }),
            transform: [{ scale: front.interpolate({ inputRange: [0, 1], outputRange: [0.01, 1] }) }],
          },
        ]}
      />}

      {/* Debris thrown out of the crater. */}
      {shards.map((d, i) => (
        <Animated.View
          key={i}
          style={[
            styles.shard,
            {
              left: center.x - d.s / 2,
              top: center.y - d.s / 2,
              width: d.s,
              height: d.s,
              borderRadius: d.s / 2,
              opacity: debris.interpolate({ inputRange: [0, 0.05, 1], outputRange: [0, 1, 0] }),
              transform: [
                { translateX: debris.interpolate({ inputRange: [0, 1], outputRange: [0, d.dx] }) },
                { translateY: debris.interpolate({ inputRange: [0, 1], outputRange: [0, d.dy] }) },
              ],
            },
          ]}
        />
      ))}

      {/* Fireball. */}
      <Animated.View
        style={{
          position: 'absolute',
          left: center.x - fireR,
          top: center.y - fireR,
          width: fireR * 2,
          height: fireR * 2,
          opacity: fire.interpolate({ inputRange: [0, 0.05, 0.4, 1], outputRange: [0, 1, 0.85, 0] }),
          transform: [{ scale: fire.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.15, 1, 1.25] }) }],
        }}
      >
        <Svg width={fireR * 2} height={fireR * 2}>
          <Defs>
            <RadialGradient id="fireball" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={look.fire[0]} stopOpacity="1" />
              <Stop offset="0.25" stopColor={look.fire[1]} stopOpacity="1" />
              <Stop offset="0.6" stopColor={look.fire[2]} stopOpacity="0.8" />
              <Stop offset="1" stopColor={look.fire[2]} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={fireR} cy={fireR} r={fireR} fill="url(#fireball)" />
        </Svg>
      </Animated.View>

      {/* Meteor: glowing head with a tail pointing back along its path. */}
      <Animated.View
        style={{
          position: 'absolute',
          left: center.x - 10,
          top: center.y - TAIL,
          width: TAIL + 10,
          height: TAIL + 10,
          opacity: meteorOpacity,
          transform: [{ translateX: meteorX }, { translateY: meteorY }],
        }}
      >
        <Svg width={TAIL + 10} height={TAIL + 10}>
          <Defs>
            <LinearGradient id="tail" x1="0" y1="1" x2="1" y2="0">
              <Stop offset="0" stopColor={look.tail[0]} stopOpacity="1" />
              <Stop offset="0.35" stopColor={look.tail[1]} stopOpacity="0.7" />
              <Stop offset="1" stopColor={look.tail[1]} stopOpacity="0" />
            </LinearGradient>
            <RadialGradient id="head" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={look.head[0]} stopOpacity="1" />
              <Stop offset="0.5" stopColor={look.head[1]} stopOpacity="0.9" />
              <Stop offset="1" stopColor={look.head[2]} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          {composition === 'comet' && (
            // A comet's second, fainter dust tail, curving away from the ion tail.
            <Line x1={10} y1={TAIL} x2={TAIL * 0.8} y2={TAIL * 0.12} stroke="url(#tail)" strokeWidth={look.tailWidth * 1.6} strokeLinecap="round" opacity={0.35} />
          )}
          <Line x1={10} y1={TAIL} x2={TAIL + 10} y2={0} stroke="url(#tail)" strokeWidth={look.tailWidth} strokeLinecap="round" />
          {sparks.map((s, i) => (
            <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill={look.sparks ?? '#fff'} opacity={0.85} />
          ))}
          <Circle cx={10} cy={TAIL} r={composition === 'comet' ? 11 : 9} fill="url(#head)" />
        </Svg>
      </Animated.View>

      {cine && (
        // A fireball plume rising out of the impact and spreading as it cools.
        <Animated.View
          style={{
            position: 'absolute',
            left: center.x - fireR * 1.4,
            top: center.y - fireR * 1.4,
            width: fireR * 2.8,
            height: fireR * 2.8,
            opacity: plume.interpolate({ inputRange: [0, 0.06, 0.45, 1], outputRange: [0, 0.95, 0.75, 0] }),
            transform: [
              { translateY: plume.interpolate({ inputRange: [0, 1], outputRange: [0, -fireR * 1.5] }) },
              { scale: plume.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.25, 1, 1.5] }) },
            ],
          }}
        >
          <Svg width={fireR * 2.8} height={fireR * 2.8}>
            <Defs>
              <RadialGradient id="plume" cx="50%" cy="45%" r="50%">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.95" />
                <Stop offset="0.2" stopColor={look.fire[1]} stopOpacity="0.9" />
                <Stop offset="0.55" stopColor={look.fire[2]} stopOpacity="0.55" />
                <Stop offset="0.8" stopColor="#3A2A2A" stopOpacity="0.35" />
                <Stop offset="1" stopColor="#3A2A2A" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx={fireR * 1.4} cy={fireR * 1.4} r={fireR * 1.4} fill="url(#plume)" />
          </Svg>
        </Animated.View>
      )}

      {/* Flash. */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.flash, { opacity: flash.interpolate({ inputRange: [0, 1], outputRange: [0, cine ? 1 : 0.85] }) }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ring: { position: 'absolute', borderWidth: 2 },
  front: { position: 'absolute', borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)' },
  shard: { position: 'absolute', backgroundColor: '#FFD9A0' },
  flash: { backgroundColor: '#FFF6E0' },
});
