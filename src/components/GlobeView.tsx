import { Canvas, Circle, Group, Path, RadialGradient, usePathValue } from '@shopify/react-native-skia';
import { useMemo, useState } from 'react';
import { PanResponder, StyleSheet, View, type GestureResponderEvent, type StyleProp, type ViewStyle } from 'react-native';
import { cancelAnimation, useDerivedValue, useSharedValue, withDecay } from 'react-native-reanimated';

import type { Ring } from '../physics/impact';
import { geoCircle } from '../vendor/d3-geo';
import { colors } from '../theme';
import { drawShapes, GRATICULE, LAND_SHAPES, pushRing, type Shapes } from './globeProjection';
import { RING_STYLE } from './rings';

interface Props {
  latitude: number;
  longitude: number;
  rings: Ring[];
  /** Canvas size. When zoomed in, the globe fills the whole canvas. */
  width: number;
  height: number;
  /**
   * The band of the canvas the globe fits in at zoom 1 (defaults to the whole
   * canvas), so the canvas can run under the header while the globe sits below it.
   */
  area?: { top: number; height: number };
  /**
   * Share of humanity outside the rings killed by global effects (0–1). Tints the
   * whole planet so it's clear the damage doesn't stop at the rings.
   */
  haze?: number;
  style?: StyleProp<ViewStyle>;
}

/** Degrees the globe turns per point dragged, at zoom 1. */
const DRAG_DEG_PER_PX = 0.35;
const MAX_ZOOM = 10;
const KM_PER_DEG = 111.195;
const RAD = Math.PI / 180;

/**
 * An orthographic globe centred on the impact, for continent-scale rings that a
 * flat map distorts. Drag to spin (a flick keeps it turning), pinch to zoom.
 * Drawn with Skia on the UI thread, so it stays smooth. Rings are true geodesic
 * circles. Give it a `key` of the impact coordinates so it re-centres when they change.
 */
export function GlobeView({ latitude, longitude, rings, width, height, area, haze = 0, style }: Props) {
  const lat = useSharedValue(latitude);
  const lon = useSharedValue(longitude);
  const zoom = useSharedValue(1);
  const bandTop = area?.top ?? 0;
  const bandH = area?.height ?? height;
  const baseR = Math.min(width, bandH) / 2 - 8;
  const cx = width / 2;
  const cy = bandTop + bandH / 2;

  // Ring circles depend on the strike, not the view: build them once.
  const ringShapes = useMemo(
    () =>
      rings.map((r) => {
        const s: Shapes = { xyz: [], runs: [] };
        const deg = Math.min(Math.max(r.radiusM / 1000 / KM_PER_DEG, 0.25), 179.5);
        const circle = geoCircle().center([longitude, latitude]).precision(2).radius(deg)();
        for (const ring of circle.coordinates) pushRing(s, ring);
        return { kind: r.kind, s, deg };
      }),
    [rings, latitude, longitude],
  );
  // Up to four rings (windows, thermal, severe, crater), largest first.
  const r0 = ringShapes[0]?.s ?? null;
  const r1 = ringShapes[1]?.s ?? null;
  const r2 = ringShapes[2]?.s ?? null;
  const r3 = ringShapes[3]?.s ?? null;
  // cos of each ring's angular radius: the view centre is inside a ring when
  // its angular distance from the impact is smaller.
  const c0 = Math.cos((ringShapes[0]?.deg ?? 0) * RAD);
  const c1 = Math.cos((ringShapes[1]?.deg ?? 0) * RAD);
  const c2 = Math.cos((ringShapes[2]?.deg ?? 0) * RAD);
  const c3 = Math.cos((ringShapes[3]?.deg ?? 0) * RAD);
  const sinI = Math.sin(latitude * RAD);
  const cosI = Math.cos(latitude * RAD);

  const radius = useDerivedValue(() => baseR * zoom.value);
  const land = usePathValue((p) => {
    'worklet';
    drawShapes(p, LAND_SHAPES, lat.value, lon.value, baseR * zoom.value, cx, cy, true);
  });
  const grat = usePathValue((p) => {
    'worklet';
    drawShapes(p, GRATICULE, lat.value, lon.value, baseR * zoom.value, cx, cy, false);
  });
  const ring0 = usePathValue((p) => {
    'worklet';
    if (r0) {
      const d = Math.sin(lat.value * RAD) * sinI + Math.cos(lat.value * RAD) * cosI * Math.cos((lon.value - longitude) * RAD);
      drawShapes(p, r0, lat.value, lon.value, baseR * zoom.value, cx, cy, true, d > c0);
    }
  });
  const ring1 = usePathValue((p) => {
    'worklet';
    if (r1) {
      const d = Math.sin(lat.value * RAD) * sinI + Math.cos(lat.value * RAD) * cosI * Math.cos((lon.value - longitude) * RAD);
      drawShapes(p, r1, lat.value, lon.value, baseR * zoom.value, cx, cy, true, d > c1);
    }
  });
  const ring2 = usePathValue((p) => {
    'worklet';
    if (r2) {
      const d = Math.sin(lat.value * RAD) * sinI + Math.cos(lat.value * RAD) * cosI * Math.cos((lon.value - longitude) * RAD);
      drawShapes(p, r2, lat.value, lon.value, baseR * zoom.value, cx, cy, true, d > c2);
    }
  });
  const ring3 = usePathValue((p) => {
    'worklet';
    if (r3) {
      const d = Math.sin(lat.value * RAD) * sinI + Math.cos(lat.value * RAD) * cosI * Math.cos((lon.value - longitude) * RAD);
      drawShapes(p, r3, lat.value, lon.value, baseR * zoom.value, cx, cy, true, d > c3);
    }
  });
  const ringPaths = [ring0, ring1, ring2, ring3];

  // The impact marker, hidden on the far side.
  const impact = useDerivedValue(() => {
    const sl = Math.sin(lon.value * RAD);
    const cl = Math.cos(lon.value * RAD);
    const sa = Math.sin(lat.value * RAD);
    const ca = Math.cos(lat.value * RAD);
    const c = Math.cos(latitude * RAD);
    const x = c * Math.sin(longitude * RAD);
    const y = Math.sin(latitude * RAD);
    const z = c * Math.cos(longitude * RAD);
    const px = x * cl - z * sl;
    const z1 = x * sl + z * cl;
    const py = y * ca - z1 * sa;
    const pz = y * sa + z1 * ca;
    const R = baseR * zoom.value;
    return { x: cx + R * px, y: cy - R * py, on: pz > 0 ? 1 : 0 };
  });
  const impactX = useDerivedValue(() => impact.value.x);
  const impactY = useDerivedValue(() => impact.value.y);
  const impactOn = useDerivedValue(() => impact.value.on);
  const oceanCenter = useDerivedValue(() => ({ x: cx - radius.value * 0.2, y: cy - radius.value * 0.3 }));
  const oceanR = useDerivedValue(() => radius.value * 1.5);
  const shadeR = useDerivedValue(() => radius.value * 1.4);
  const glowR = useDerivedValue(() => radius.value + 6);

  // Gestures: one finger spins (and coasts after a flick), two fingers zoom.
  const [pan] = useState(() => {
    const g = { lat: 0, lon: 0, pinch0: 0, zoom0: 1, pinching: false };
    const spread = (e: GestureResponderEvent) => {
      const [a, b] = e.nativeEvent.touches;
      return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
    };
    const clampLat = (v: number) => Math.max(-89, Math.min(89, v));
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Keep the gesture away from the parent ScrollView while spinning.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        cancelAnimation(lat);
        cancelAnimation(lon);
        g.lat = lat.value;
        g.lon = lon.value;
        g.pinching = false;
      },
      onPanResponderMove: (e, d) => {
        if (e.nativeEvent.touches.length >= 2) {
          if (!g.pinching) {
            g.pinching = true;
            g.pinch0 = spread(e);
            g.zoom0 = zoom.value;
          }
          zoom.value = Math.max(1, Math.min(MAX_ZOOM, (g.zoom0 * spread(e)) / Math.max(g.pinch0, 1)));
          return;
        }
        if (g.pinching) {
          // Second finger lifted: continue spinning from here without a jump.
          g.pinching = false;
          g.lat = lat.value - (d.dy * DRAG_DEG_PER_PX) / zoom.value;
          g.lon = lon.value + (d.dx * DRAG_DEG_PER_PX) / zoom.value;
        }
        const k = DRAG_DEG_PER_PX / zoom.value;
        lat.value = clampLat(g.lat + d.dy * k);
        lon.value = g.lon - d.dx * k;
      },
      onPanResponderRelease: (_, d) => {
        if (g.pinching) return;
        const k = (DRAG_DEG_PER_PX / zoom.value) * 1000; // px/ms → degrees/s
        lon.value = withDecay({ velocity: -d.vx * k, deceleration: 0.994 });
        lat.value = withDecay({ velocity: d.vy * k, deceleration: 0.994, clamp: [-89, 89] });
      },
    });
  });

  return (
    <View style={[{ width, height }, styles.wrap, style]} {...pan.panHandlers}>
      <Canvas style={{ width, height }}>
        <Circle cx={cx} cy={cy} r={glowR} color={colors.blue} opacity={0.12} />
        {haze > 0 && (
          // Global effects: a burning-red atmosphere rather than a muddy planet.
          <Circle cx={cx} cy={cy} r={glowR} style="stroke" strokeWidth={8} color={colors.accent} opacity={0.15 + 0.35 * haze} />
        )}
        <Circle cx={cx} cy={cy} r={radius}>
          <RadialGradient c={oceanCenter} r={oceanR} colors={['#21417A', '#0A1633']} />
        </Circle>
        <Path path={grat} style="stroke" strokeWidth={0.75} color="rgba(255,255,255,0.1)" />
        <Path path={land} color="#52668F" />
        {haze > 0 && <Circle cx={cx} cy={cy} r={radius} color="#C2461C" opacity={0.05 + 0.13 * haze} />}
        {ringShapes.slice(0, 4).map((r, i) => (
          <Group key={r.kind}>
            <Path path={ringPaths[i]} color={RING_STYLE[r.kind].fill} />
            <Path path={ringPaths[i]} style="stroke" strokeWidth={2} color={RING_STYLE[r.kind].stroke} />
          </Group>
        ))}
        <Circle cx={cx} cy={cy} r={radius}>
          <RadialGradient c={oceanCenter} r={shadeR} colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.45)']} positions={[0, 0.6, 1]} />
        </Circle>
        <Circle cx={cx} cy={cy} r={radius} style="stroke" strokeWidth={1} color="rgba(74,158,255,0.35)" />
        <Group opacity={impactOn}>
          <Circle cx={impactX} cy={impactY} r={7} color={colors.accent} opacity={0.3} />
          <Circle cx={impactX} cy={impactY} r={3.5} color={colors.accent} />
        </Group>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center' },
});
