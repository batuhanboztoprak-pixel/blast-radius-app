import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';

import type { Ring } from '../physics/impact';
import type { ImpactLocation } from '../state/simulation';
import { regionForRadius } from '../lib/geo';
import { FALLBACK_FRAME_RADIUS_M, RING_STYLE } from './rings';

interface Props {
  location: ImpactLocation;
  rings: Ring[];
  style?: StyleProp<ViewStyle>;
}

/** Apple Maps (MapKit) on iOS with the damage rings drawn as geodesic circles. */
export const ImpactMap = forwardRef<MapView | null, Props>(function ImpactMap(
  { location, rings, style },
  ref,
) {
  const map = useRef<MapView>(null);
  useImperativeHandle(ref, () => map.current as MapView);

  const frameRadius = rings[0]?.radiusM ?? FALLBACK_FRAME_RADIUS_M;
  const region = regionForRadius(location.latitude, location.longitude, frameRadius);

  useEffect(() => {
    map.current?.animateToRegion(region, 400);
    // Only re-frame when the target or the largest ring changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.latitude, location.longitude, frameRadius]);

  return (
    <MapView
      ref={map}
      style={[styles.map, style]}
      initialRegion={region}
      userInterfaceStyle="dark"
      showsPointsOfInterests={false}
      pitchEnabled={false}
      rotateEnabled={false}
      toolbarEnabled={false}
    >
      {rings.map((ring) => {
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
  );
});

const styles = StyleSheet.create({
  map: { flex: 1 },
});
