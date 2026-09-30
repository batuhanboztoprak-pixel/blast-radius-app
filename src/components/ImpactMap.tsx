import * as Haptics from 'expo-haptics';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  StyleSheet,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';

import type { Ring } from '../physics/impact';
import type { ImpactLocation } from '../state/simulation';
import { regionForRadius } from '../lib/geo';
import { FALLBACK_FRAME_RADIUS_M, RING_STYLE } from './rings';
import { StrikeAnimation, type StrikeRing } from './StrikeAnimation';

interface Props {
  location: ImpactLocation;
  rings: Ring[];
  /** Zoom to this radius instead of framing every ring (tap a ring in the legend). */
  focusRadiusM?: number | null;
  /** Change this number to play the strike animation (0 = don't play). */
  strikeToken?: number;
  /** Called once the rings are on the map after a strike (animated or not). */
  onStrikeEnd?: () => void;
  style?: StyleProp<ViewStyle>;
}

const EARTH_RADIUS_M = 6.371e6;

type Strike = { center: { x: number; y: number }; rings: StrikeRing[]; token: number };

/** Apple Maps (MapKit) on iOS with the damage rings drawn as geodesic circles. */
export const ImpactMap = forwardRef<MapView | null, Props>(function ImpactMap(
  { location, rings, focusRadiusM = null, strikeToken = 0, onStrikeEnd, style },
  ref,
) {
  const map = useRef<MapView>(null);
  useImperativeHandle(ref, () => map.current as MapView);

  const [ready, setReady] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [strike, setStrike] = useState<Strike | null>(null);
  /** Hide the real rings while the animation is drawing them. */
  const [ringsHidden, setRingsHidden] = useState(strikeToken > 0);
  const shake = useState(() => new Animated.Value(0))[0];
  const endRef = useRef(onStrikeEnd);
  useEffect(() => {
    endRef.current = onStrikeEnd;
  });
  const reveal = () => {
    setRingsHidden(false);
    endRef.current?.();
  };

  const frameRadius = focusRadiusM ?? rings[0]?.radiusM ?? FALLBACK_FRAME_RADIUS_M;
  const region = regionForRadius(location.latitude, location.longitude, frameRadius);

  // Re-frame when the target, the largest ring or the focused ring changes.
  const firstFrame = useRef(true);
  useEffect(() => {
    if (firstFrame.current) {
      firstFrame.current = false;
      return;
    }
    map.current?.animateToRegion(region, 450);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.latitude, location.longitude, frameRadius]);

  // Measure the rings in screen points, then play the strike.
  useEffect(() => {
    if (!ready || strikeToken === 0 || size.width === 0) return;
    let cancelled = false;
    (async () => {
      const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled().catch(() => false);
      const m = map.current;
      if (cancelled) return;
      if (reduceMotion || !m) {
        reveal();
        return;
      }
      try {
        // A replay may have just re-framed the map; let that animation settle first.
        if (strikeToken > 1) await new Promise((r) => setTimeout(r, 500));
        if (cancelled) return;
        // Screen scale at the impact latitude from a point 50 km east along the parallel.
        const probeM = 50_000;
        const cos = Math.max(Math.cos((location.latitude * Math.PI) / 180), 0.01);
        const dLon = ((probeM / (EARTH_RADIUS_M * cos)) * 180) / Math.PI;
        const c = await m.pointForCoordinate(location);
        const p = await m.pointForCoordinate({ latitude: location.latitude, longitude: location.longitude + dLon });
        const pxPerM = Math.abs(p.x - c.x) / probeM;
        if (cancelled) return;
        if (!(pxPerM > 0)) throw new Error('no scale');
        setRingsHidden(true);
        setStrike({
          center: c,
          rings: rings.map((r) => ({ kind: r.kind, px: r.radiusM * pxPerM })),
          token: strikeToken,
        });
      } catch {
        if (!cancelled) reveal();
      }
    })();
    return () => {
      cancelled = true;
    };
    // Only a new token (or the map becoming ready) starts a strike.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, strikeToken, size.width > 0]);

  // Safety net: never leave the rings hidden if the map or animation stalls.
  useEffect(() => {
    if (!ringsHidden) return;
    const t = setTimeout(reveal, 4_500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ringsHidden]);

  const onImpact = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}), 160);
    shake.setValue(0);
    Animated.timing(shake, { toValue: 1, duration: 420, useNativeDriver: true }).start();
  };

  const shakeX = shake.interpolate({
    inputRange: [0, 0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1],
    outputRange: [0, -7, 6, -5, 4, -2, 1, 0],
  });
  const shakeY = shake.interpolate({
    inputRange: [0, 0.15, 0.3, 0.5, 0.7, 1],
    outputRange: [0, 5, -4, 3, -1, 0],
  });

  return (
    <Animated.View
      style={[styles.map, style, { transform: [{ translateX: shakeX }, { translateY: shakeY }] }]}
      onLayout={(e: LayoutChangeEvent) => setSize(e.nativeEvent.layout)}
    >
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        onMapReady={() => setReady(true)}
        userInterfaceStyle="dark"
        showsPointsOfInterests={false}
        pitchEnabled={false}
        rotateEnabled={false}
        toolbarEnabled={false}
      >
        {!ringsHidden &&
          rings.map((ring) => {
            const s = RING_STYLE[ring.kind];
            return (
              <Circle
                key={ring.kind}
                center={location}
                radius={ring.radiusM}
                fillColor={s.fill}
                strokeColor={s.stroke}
                strokeWidth={1.5}
              />
            );
          })}
        <Marker coordinate={location} pinColor="#FF6B4A" />
      </MapView>
      {strike && (
        <StrikeAnimation
          key={strike.token}
          width={size.width}
          height={size.height}
          center={strike.center}
          rings={strike.rings}
          onImpact={onImpact}
          onDone={reveal}
        />
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  map: { flex: 1 },
});
