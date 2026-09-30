import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

import type { StageEffect } from './aftermathLayers';

interface Props {
  width: number;
  height: number;
  /** Impact point on screen. */
  center: { x: number; y: number };
  /** Screen points per metre at the impact latitude. */
  pxPerM: number;
  effect: StageEffect;
  reduceMotion: boolean;
}

/** Cheap deterministic hash → [0, 1), so particles don't jump between renders. */
const rand = (n: number) => {
  const x = Math.sin(n * 91.345 + 7.13) * 43758.5453;
  return x - Math.floor(x);
};

const MAX_PX = 1400;

interface Particle {
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  drift: number;
}

/**
 * Animated particles for an aftermath stage, drawn over the map around the
 * impact: a pulsing fireball, shock pulses, debris raining into the ejecta
 * zone, flickering embers, drifting dust, falling snow. Transforms and opacity
 * only, on the native driver. Reduce Motion shows them still.
 */
export function StageEffects({ width, height, center, pxPerM, effect, reduceMotion }: Props) {
  const radiusPx = effect.radiusM === null ? null : Math.min(effect.radiusM * pxPerM, MAX_PX);
  const innerPx = effect.innerM ? Math.min(effect.innerM * pxPerM, MAX_PX) : null;

  const particles = useMemo<Particle[]>(() => {
    const count = { fireball: 8, shock: 3, debris: 48, embers: 46, dust: 16, snow: 54 }[effect.kind];
    // A point spread evenly over a disc (or the whole map when radius is null).
    const place = (i: number, r: number | null) => {
      if (r === null) return { x: rand(i) * width, y: rand(i + 101) * height };
      const d = Math.sqrt(rand(i)) * r;
      const a = rand(i + 101) * Math.PI * 2;
      return { x: center.x + Math.cos(a) * d, y: center.y + Math.sin(a) * d };
    };
    return Array.from({ length: count }, (_, i) => {
      const k = effect.kind;
      const inner = k === 'debris' && innerPx && i % 5 < 3; // most debris lands near the crater
      const p = place(i + 1, inner ? innerPx : radiusPx);
      const palette =
        k === 'debris'
          ? ['#C9A27A', '#8A6A4A', '#5C4633']
          : k === 'embers'
            ? ['#FFB347', '#FF6B4A', '#FFD166']
            : k === 'snow'
              ? ['#FFFFFF', '#E6F2FF']
              : ['rgba(22,24,30,0.7)', 'rgba(40,42,50,0.6)'];
      return {
        ...p,
        size:
          k === 'dust' ? 50 + rand(i + 7) * 70 : k === 'snow' ? 2 + rand(i + 7) * 3 : 2 + rand(i + 7) * (inner ? 5 : 3),
        color: palette[i % palette.length],
        delay: rand(i + 13) * (k === 'snow' ? 5000 : 1800),
        duration:
          k === 'snow' ? 4000 + rand(i + 17) * 3000 : k === 'dust' ? 6000 + rand(i + 17) * 4000 : 1100 + rand(i + 17) * 900,
        drift: (rand(i + 23) - 0.5) * 2,
      };
    });
  }, [effect.kind, radiusPx, innerPx, width, height, center.x, center.y]);

  return (
    <Animated.View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {effect.kind === 'fireball' && radiusPx !== null && (
        <Fireball cx={center.x} cy={center.y} r={Math.max(radiusPx, 18)} still={reduceMotion} />
      )}
      {effect.kind === 'shock' &&
        radiusPx !== null &&
        [0, 1, 2].map((i) => (
          <Pulse key={i} cx={center.x} cy={center.y} r={radiusPx} delay={i * 800} still={reduceMotion} />
        ))}
      {(effect.kind === 'debris' || effect.kind === 'embers' || effect.kind === 'dust' || effect.kind === 'snow') &&
        particles.map((p, i) => <Mote key={i} p={p} kind={effect.kind} height={height} still={reduceMotion} />)}
    </Animated.View>
  );
}

function useLoop(duration: number, delay: number, still: boolean, easing = Easing.linear) {
  const [v] = useState(() => new Animated.Value(still ? 0.6 : 0));
  useEffect(() => {
    if (still) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration, easing, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, duration, delay, still, easing]);
  return v;
}

function Fireball({ cx, cy, r, still }: { cx: number; cy: number; r: number; still: boolean }) {
  const v = useLoop(1600, 0, still, Easing.inOut(Easing.quad));
  const scale = v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.92, 1.08, 0.92] });
  const opacity = v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.75, 1, 0.75] });
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: cx - r,
        top: cy - r,
        width: r * 2,
        height: r * 2,
        borderRadius: r,
        backgroundColor: 'rgba(255,209,102,0.35)',
        borderColor: 'rgba(255,240,200,0.9)',
        borderWidth: 2,
        shadowColor: '#FFB347',
        shadowOpacity: 0.9,
        shadowRadius: 18,
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}

function Pulse({ cx, cy, r, delay, still }: { cx: number; cy: number; r: number; delay: number; still: boolean }) {
  const v = useLoop(2400, delay, still, Easing.out(Easing.cubic));
  if (still) return null;
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: cx - r,
        top: cy - r,
        width: r * 2,
        height: r * 2,
        borderRadius: r,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.85)',
        opacity: v.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 0.8, 0] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.02, 1] }) }],
      }}
    />
  );
}

function Mote({
  p,
  kind,
  height,
  still,
}: {
  p: Particle;
  kind: StageEffect['kind'];
  height: number;
  still: boolean;
}) {
  const v = useLoop(p.duration, p.delay, still);
  const motion =
    kind === 'debris'
      ? {
          // Falls in from above, lands, then stays dark on the ground.
          opacity: v.interpolate({ inputRange: [0, 0.1, 0.45, 1], outputRange: [0, 1, 1, 0.25] }),
          transform: [
            { translateY: v.interpolate({ inputRange: [0, 0.45, 1], outputRange: [-34, 0, 0] }) },
            { scale: v.interpolate({ inputRange: [0, 0.45, 1], outputRange: [1.8, 1, 1] }) },
          ],
        }
      : kind === 'embers'
        ? {
            opacity: v.interpolate({ inputRange: [0, 0.2, 0.6, 1], outputRange: [0, 1, 0.7, 0] }),
            transform: [
              { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -16] }) },
              { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift * 6] }) },
            ],
          }
        : kind === 'dust'
          ? {
              opacity: v.interpolate({ inputRange: [0, 0.3, 0.7, 1], outputRange: [0, 0.8, 0.8, 0] }),
              transform: [
                { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-40 * p.drift - 20, 40 * p.drift + 20] }) },
              ],
            }
          : {
              // Snow falls across the whole map, drifting sideways.
              opacity: 0.9,
              transform: [
                { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-p.y - 20, height - p.y + 20] }) },
                { translateX: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, p.drift * 14, 0] }) },
              ],
            };
  return (
    <Animated.View
      style={[
        styles.mote,
        {
          left: p.x - p.size / 2,
          top: p.y - p.size / 2,
          width: p.size,
          height: p.size,
          borderRadius: p.size / 2,
          backgroundColor: p.color,
        },
        motion,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  mote: { position: 'absolute' },
});
