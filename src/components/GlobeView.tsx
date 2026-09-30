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
  style?: StyleProp<ViewStyle>;
}

/** Degrees the globe turns per pixel dragged. */
const DRAG_DEG_PER_PX = 0.35;

/**
 * An orthographic globe centred on the impact, for continent-scale rings that a
 * flat map distorts. Drag to spin it; rings are true geodesic circles.
 * Give it a `key` of the impact coordinates so it re-centres when they change.
 */
export function GlobeView({ latitude, longitude, rings, size, style }: Props) {
  const [view, setView] = useState({ lat: latitude, lon: longitude });

  // Gesture bookkeeping lives in a plain object created once, not in refs, so
  // nothing mutable is read during render.
  const [gesture] = useState(() => {
    const g = {
      start: { lat: latitude, lon: longitude },
      pending: { lat: latitude, lon: longitude },
      frame: null as number | null,
    };
    const pan = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Keep the gesture away from the parent ScrollView while spinning.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        g.start = g.pending;
      },
      onPanResponderMove: (_, d) => {
        g.pending = {
          lat: Math.max(-89, Math.min(89, g.start.lat + d.dy * DRAG_DEG_PER_PX)),
          lon: g.start.lon - d.dx * DRAG_DEG_PER_PX,
        };
        // At most one re-projection per frame.
        if (g.frame === null) {
          g.frame = requestAnimationFrame(() => {
            g.frame = null;
            setView(g.pending);
          });
        }
      },
    });
    return { g, pan };
  });

  useEffect(
    () => () => {
      if (gesture.g.frame !== null) cancelAnimationFrame(gesture.g.frame);
    },
    [gesture],
  );

  const paths = useMemo(
    () => globePaths(latitude, longitude, rings, size, view.lat, view.lon),
    [latitude, longitude, rings, size, view.lat, view.lon],
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
