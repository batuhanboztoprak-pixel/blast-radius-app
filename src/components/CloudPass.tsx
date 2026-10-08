import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import { FALL_START_ALT_M, fallLeft, type CinePhase } from './CinematicHud';

/** The cloud layer: puffs appear from about this altitude down. */
const CLOUD_TOP_M = 14_000;
/** Bursts higher than this never reach the clouds. */
const CLOUD_FLOOR_M = 12_000;

interface Props {
  phase: CinePhase | null;
  /** Date.now() when the current phase began. */
  since: number;
  fallMs: number;
  airburstAltitudeM: number | null;
  width: number;
  height: number;
}

/** Fraction of the on-screen fall at which the readout reaches `altM`. */
function fallFractionAt(altM: number, endAltM: number) {
  const r = (altM - endAltM) / (FALL_START_ALT_M - endAltM);
  return 1 - Math.pow(Math.min(Math.max(r, 0), 1), 1 / 1.6);
}

/**
 * Cinematic strike: in the last moments of the dive the camera punches through
 * the cloud layer, white puffs rushing out past the edges of the screen, timed
 * to when the altitude readout passes through the clouds. Skipped for
 * airbursts high above the clouds.
 */
export function CloudPass({ phase, since, fallMs, airburstAltitudeM, width, height }: Props) {
  const endAlt = airburstAltitudeM ?? 0;
  const show = phase === 'fall' && endAlt < CLOUD_FLOOR_M && width > 0;
  const [p] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!show) return;
    const startMs = fallFractionAt(CLOUD_TOP_M, endAlt) * fallMs;
    const already = Date.now() - since;
    const delay = Math.max(startMs - already, 0);
    const duration = Math.max(fallMs - startMs, 400) + 250;
    p.setValue(0);
    const anim = Animated.sequence([
      Animated.delay(delay),
      Animated.timing(p, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [show, since, fallMs, endAlt, p]);

  const puffs = useMemo(() => {
    // Directions spread around the screen, each puff with its own moment.
    return Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2 + (i % 2 ? 0.4 : 0);
      return { dx: Math.cos(a), dy: Math.sin(a) * 0.8, t0: (i % 5) * 0.1, size: 0.55 + ((i * 37) % 10) / 22 };
    });
  }, []);

  if (!show) return null;
  const R = Math.max(width, height) * 0.6;
  const haze = p.interpolate({ inputRange: [0, 0.35, 0.6, 1], outputRange: [0, 0.22, 0.14, 0] });

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clip]}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.haze, { opacity: haze }]} />
      {puffs.map((c, i) => {
        const range = [c.t0, c.t0 + 0.25, c.t0 + 0.55];
        const scale = p.interpolate({ inputRange: [c.t0, c.t0 + 0.55], outputRange: [0.35, 3.2], extrapolate: 'clamp', easing: Easing.in(Easing.quad) });
        const opacity = p.interpolate({ inputRange: range, outputRange: [0, 0.7, 0], extrapolate: 'clamp' });
        const tx = p.interpolate({ inputRange: [c.t0, c.t0 + 0.55], outputRange: [c.dx * width * 0.08, c.dx * width * 0.9], extrapolate: 'clamp', easing: Easing.in(Easing.quad) });
        const ty = p.interpolate({ inputRange: [c.t0, c.t0 + 0.55], outputRange: [c.dy * height * 0.08, c.dy * height * 0.7], extrapolate: 'clamp', easing: Easing.in(Easing.quad) });
        const w = R * c.size;
        const h = w * 0.62;
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: width / 2 - w / 2,
              top: height / 2 - h / 2,
              width: w,
              height: h,
              opacity,
              transform: [{ translateX: tx }, { translateY: ty }, { scale }],
            }}
          >
            <Svg width={w} height={h}>
              <Defs>
                <RadialGradient id={`cloud${i}`} cx="50%" cy="50%" r="50%">
                  <Stop offset={0} stopColor="#FFFFFF" stopOpacity={0.95} />
                  <Stop offset={0.55} stopColor="#F1F5FB" stopOpacity={0.6} />
                  <Stop offset={1} stopColor="#E4ECF7" stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Ellipse cx={w * 0.5} cy={h * 0.55} rx={w * 0.5} ry={h * 0.45} fill={`url(#cloud${i})`} />
              <Ellipse cx={w * 0.32} cy={h * 0.42} rx={w * 0.3} ry={h * 0.36} fill={`url(#cloud${i})`} />
              <Ellipse cx={w * 0.68} cy={h * 0.4} rx={w * 0.28} ry={h * 0.34} fill={`url(#cloud${i})`} />
            </Svg>
          </Animated.View>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  haze: { backgroundColor: '#EAF1FA' },
});
