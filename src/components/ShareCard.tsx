import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import MapView from 'react-native-maps';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { snapshotFrame } from '../lib/geo';
import { t, upper } from '../i18n/core';
import {
  formatDiameter,
  formatDistance,
  formatEnergyMt,
  formatMultiple,
  dec,
  hiroshimaPercent,
  type Units,
} from '../physics/format';
import type { ImpactResult, Ring } from '../physics/impact';
import type { ImpactLocation } from '../state/simulation';
import { colors, fonts } from '../theme';
import { FALLBACK_FRAME_RADIUS_M, RING_STYLE, ringLabel } from './rings';

interface Props {
  width: number;
  result: ImpactResult;
  location: ImpactLocation;
  rings: Ring[];
  units: Units;
  /** Called once the map image is in place and the card is ready to capture. */
  onReady: () => void;
}

export const CARD_ASPECT = 5 / 4; // height / width — Instagram-feed friendly

/**
 * The shareable image. The map is rendered once as a MapKit snapshot and the
 * rings are drawn on top with SVG, so view-shot captures a plain image instead
 * of a live Metal-backed map view.
 */
export const ShareCard = forwardRef<View, Props>(function ShareCard(
  { width, result, location, rings, units, onReady },
  ref,
) {
  const height = Math.round(width * CARD_ASPECT);
  const pad = Math.round(width * 0.06);
  const mapW = width - pad * 2;
  const mapH = Math.round(height * 0.52);

  const map = useRef<MapView>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);

  // Never leave the share button stuck if the map snapshot doesn't come back.
  useEffect(() => {
    const t = setTimeout(onReady, 6000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const frameRadius = rings[0]?.radiusM ?? FALLBACK_FRAME_RADIUS_M;
  const frame = useMemo(
    () => snapshotFrame(location.latitude, location.longitude, frameRadius, mapW, mapH),
    [location.latitude, location.longitude, frameRadius, mapW, mapH],
  );

  async function takeSnapshot() {
    try {
      const uri = await map.current?.takeSnapshot({
        width: mapW,
        height: mapH,
        region: frame.region,
        format: 'png',
        result: 'file',
      });
      if (uri) setSnapshot(uri);
      else onReady();
    } catch {
      // Fall back to capturing without a map background.
      onReady();
    }
  }

  const energy = formatEnergyMt(result.effectiveEnergyMt);
  const kicker = upper(
    t('share.kicker', {
      size: formatDiameter(result.params.diameterM, units),
      object: t(`share.object.${result.params.composition}`),
      place: location.label.split(',')[0],
    }),
  );
  const hiroshima =
    result.hiroshimaMultiple < 1
      ? t('share.hiroshimaPercent', { pct: hiroshimaPercent(result.hiroshimaMultiple) })
      : t('share.hiroshimaTimes', { x: formatMultiple(result.hiroshimaMultiple) });

  return (
    <View ref={ref} collapsable={false} style={{ width, height, backgroundColor: colors.bg }}>
      <Svg style={StyleSheet.absoluteFill} width={width} height={height}>
        <Defs>
          <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.bg} />
            <Stop offset="1" stopColor={colors.bgDeep} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="url(#bg)" />
      </Svg>

      <View style={[styles.brand, { paddingHorizontal: pad, paddingTop: pad * 0.8 }]}>
        <View style={styles.brandDot} />
        <Text style={styles.brandText}>BLAST RADIUS</Text>
      </View>

      <View style={[styles.map, { marginHorizontal: pad, width: mapW, height: mapH }]}>
        {snapshot ? (
          <Image source={{ uri: snapshot }} style={{ width: mapW, height: mapH }} onLoad={onReady} />
        ) : (
          <MapView
            ref={map}
            style={{ width: mapW, height: mapH }}
            initialRegion={frame.region}
            userInterfaceStyle="dark"
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            showsPointsOfInterests={false}
            onMapReady={takeSnapshot}
          />
        )}
        <Svg style={StyleSheet.absoluteFill} width={mapW} height={mapH} pointerEvents="none">
          {rings.map((r) => {
            const s = RING_STYLE[r.kind];
            return (
              <Circle
                key={r.kind}
                cx={mapW / 2}
                cy={mapH / 2}
                r={Math.max(r.radiusM * frame.pxPerMeter, r.kind === 'crater' ? 3 : 0)}
                fill={s.fill}
                stroke={s.stroke}
                strokeWidth={1.5}
              />
            );
          })}
          <Circle cx={mapW / 2} cy={mapH / 2} r={3.5} fill={colors.accent} stroke={colors.bg} strokeWidth={1.5} />
        </Svg>
      </View>

      <View style={{ paddingHorizontal: pad, paddingTop: pad * 0.8, gap: 4 }}>
        <Text style={styles.kicker} numberOfLines={2}>
          {kicker}
        </Text>
        <Text style={[styles.headline, { fontSize: width * 0.075 }]} numberOfLines={2} adjustsFontSizeToFit>
          {energy.value} {energy.unit} —{'\n'}
          {hiroshima}
        </Text>
      </View>

      <View style={[styles.legend, { paddingHorizontal: pad, paddingTop: pad * 0.6 }]}>
        {[...rings].reverse().map((r) => (
          <View key={r.kind} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: RING_STYLE[r.kind].color }]} />
            <Text style={styles.legendText}>
              {ringLabel(r.kind)} {r.capped ? '>' : ''}
              {formatDistance(r.kind === 'crater' ? r.radiusM * 2 : r.radiusM, units)}
            </Text>
          </View>
        ))}
        {result.airburstAltitudeM !== null && rings.length === 0 && (
          <Text style={styles.legendText}>{t('share.airburst')}</Text>
        )}
      </View>

      <View style={{ flex: 1 }} />
      <View style={[styles.footer, { paddingHorizontal: pad, paddingBottom: pad * 0.8 }]}>
        <Text style={styles.footerText}>{t('share.footer')}</Text>
        <Text style={styles.footerText}>{result.seismicMagnitude !== null ? t('share.quake', { m: dec(result.seismicMagnitude, 1) }) : ''}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.accent },
  brandText: { fontSize: 14, letterSpacing: 1, color: colors.text, fontFamily: fonts.display },
  map: { marginTop: 14, borderRadius: 20, overflow: 'hidden', backgroundColor: '#0F1424' },
  kicker: { fontSize: 11, letterSpacing: 1.5, color: colors.muted, fontFamily: fonts.bodySemi },
  headline: { color: colors.text, fontFamily: fonts.display, lineHeight: undefined },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 11, color: colors.text, fontFamily: fonts.bodyMedium },
  footer: { flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 11, color: colors.dim, fontFamily: fonts.body },
});
