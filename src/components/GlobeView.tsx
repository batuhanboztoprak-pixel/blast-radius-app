import { useEffect, useMemo, useState } from 'react';
import { PanResponder, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';

import type { Ring } from '../physics/impact';
import { colors } from '../theme';
import { globePaths } from './globe';
import { RING_STYLE } from './rings';

interface Props {
  latitude: number;
  longitude: number;
  rings: Ring[];
  size: number;
  /**
   * Share of humanity outside the rings killed by global effects (0–1). Tints the
   * whole planet so it's clear the damage doesn't stop at the rings.
   */
  haze?: number;
  style?: StyleProp<ViewStyle>;
}

/** Degrees the globe turns per pixel dragged. */
const DRAG_DEG_PER_PX = 0.35;

/**
 * An orthographic globe centred on the impact, for continent-scale rings that a
 * flat map distorts. Drag to spin it; rings are true geodesic circles.
 * Give it a `key` of the impact coordinates so it re-centres when they change.
 */
export function GlobeView({ latitude, longitude, rings, size, haze = 0, style }: Props) {
  const [view, setView] = useState({ lat: latitude, lon: longitude });
  /** While dragging or coasting, draw a lighter globe so it keeps up with the finger. */
  const [moving, setMoving] = useState(false);

  // Gesture bookkeeping lives in a plain object created once, not in refs, so
  // nothing mutable is read during render.
  const [gesture] = useState(() => {
    const clampLat = (v: number) => Math.max(-89, Math.min(89, v));
    const g = {
      start: { lat: latitude, lon: longitude },
      pending: { lat: latitude, lon: longitude },
      frame: null as number | null,
      coast: null as number | null,
    };
    const push = () => {
      // At most one re-projection per frame.
      if (g.frame === null) {
        g.frame = requestAnimationFrame(() => {
          g.frame = null;
          setView(g.pending);
        });
      }
    };
    const stopCoast = () => {
      if (g.coast !== null) cancelAnimationFrame(g.coast);
      g.coast = null;
    };
    const pan = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Keep the gesture away from the parent ScrollView while spinning.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        stopCoast();
        g.start = g.pending;
        setMoving(true);
      },
      onPanResponderMove: (_, d) => {
        g.pending = { lat: clampLat(g.start.lat + d.dy * DRAG_DEG_PER_PX), lon: g.start.lon - d.dx * DRAG_DEG_PER_PX };
        push();
      },
      onPanResponderRelease: (_, d) => {
        // Keep spinning with the finger's speed, slowing down, then redraw in full detail.
        let vx = d.vx * 16 * DRAG_DEG_PER_PX; // degrees per frame
        let vy = d.vy * 16 * DRAG_DEG_PER_PX;
        const step = () => {
          vx *= 0.93;
          vy *= 0.93;
          if (Math.abs(vx) + Math.abs(vy) < 0.05) {
            g.coast = null;
            setMoving(false);
            return;
          }
          g.pending = { lat: clampLat(g.pending.lat + vy), lon: g.pending.lon - vx };
          setView(g.pending);
          g.coast = requestAnimationFrame(step);
        };
        g.coast = requestAnimationFrame(step);
      },
      onPanResponderTerminate: () => {
        stopCoast();
        setMoving(false);
      },
    });
    return { g, pan, stopCoast };
  });

  useEffect(
    () => () => {
      if (gesture.g.frame !== null) cancelAnimationFrame(gesture.g.frame);
      gesture.stopCoast();
    },
    [gesture],
  );

  const paths = useMemo(
    () => globePaths(latitude, longitude, rings, size, view.lat, view.lon, moving ? 'fast' : 'full'),
    [latitude, longitude, rings, size, view.lat, view.lon, moving],
  );

  return (
    <View style={[styles.wrap, { width: size, height: size }, style]} {...gesture.pan.panHandlers}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="ocean" cx="40%" cy="35%" r="75%">
            <Stop offset="0" stopColor="#1A2E52" />
            <Stop offset="1" stopColor="#0A1326" />
          </RadialGradient>
          <RadialGradient id="shade" cx="40%" cy="35%" r="70%">
            <Stop offset="0.6" stopColor="#000" stopOpacity="0" />
            <Stop offset="1" stopColor="#000" stopOpacity="0.45" />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2 - 1} fill={colors.blue} opacity={0.08} />
        <Path d={paths.sphere} fill="url(#ocean)" />
        <Path d={paths.graticule} stroke="rgba(255,255,255,0.08)" strokeWidth={0.75} fill="none" />
        <Path d={paths.land} fill="#34435F" />
        {haze > 0 && <Path d={paths.sphere} fill="#8A3414" opacity={0.18 + 0.32 * haze} />}
        {paths.rings.map((r) => (
          <Path
            key={r.kind}
            d={r.d}
            fill={RING_STYLE[r.kind].fill}
            stroke={RING_STYLE[r.kind].stroke}
            strokeWidth={1.5}
          />
        ))}
        <Path d={paths.sphere} fill="url(#shade)" />
        <Path d={paths.sphere} fill="none" stroke="rgba(74,158,255,0.35)" strokeWidth={1} />
        {paths.impact && (
          <>
            <Circle cx={paths.impact[0]} cy={paths.impact[1]} r={7} fill={colors.accent} opacity={0.3} />
            <Circle cx={paths.impact[0]} cy={paths.impact[1]} r={3.5} fill={colors.accent} />
          </>
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center' },
});
