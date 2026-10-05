import * as Haptics from 'expo-haptics';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import MapView, { Circle, Marker, type Region } from 'react-native-maps';

import { t } from '../i18n/core';
import type { Composition, Ring } from '../physics/impact';
import { colors, fonts } from '../theme';
import { LockIcon } from './icons';
import type { ImpactLocation } from '../state/simulation';
import { regionForRadius } from '../lib/geo';
import { FALLBACK_FRAME_RADIUS_M, RING_STYLE } from './rings';
import type { StageCircle, StageEffect } from './aftermathLayers';
import { StageEffects } from './StageEffects';
import { ENTRY_MS } from './EntrySequence';
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
  /**
   * A Pro ring the user can't use yet (free users' burns ring). Not drawn, so
   * its size stays hidden; a "Burns zone · Pro" tag sits above the pin instead.
   */
  lockedRing?: Ring | null;
  /** Aftermath stage layers (fireball, ejecta, fires, dust…), drawn after the strike. */
  stageCircles?: StageCircle[];
  /** Hide the damage rings while a stage shows its own layers. */
  hideRings?: boolean;
  /** Animated particles for the selected aftermath stage. */
  stageEffect?: StageEffect;
  /** Rock, iron or comet: sets the meteor's look in the strike. */
  composition?: Composition;
  onLockedPress?: () => void;
  /**
   * Play the cinematic version: the camera dives in tilted with the meteor, the
   * real map rings grow from the impact while it pulls back and circles, then
   * it settles top-down. Pro, a first-strike taste, or a rewarded unlock.
   */
  cinematic?: boolean;
  /**
   * Cinematic only: the full-screen entry shot starts, the meteor starts falling
   * on the map, hits, and the sequence ends (for the entry shot, HUD and sound).
   */
  onCinematicPhase?: (phase: 'entry' | 'fall' | 'impact' | 'done') => void;
  style?: StyleProp<ViewStyle>;
}

const EARTH_RADIUS_M = 6.371e6;


/** Cinematic timeline, ms. */
export const CINE_FALL = 2800;
const CINE_GROW = 2000;
/** The first moments after impact play in slow motion: this long, at this speed. */
const SLOW_MS = 700;
const SLOW_RATE = 0.3;
/** Extra wall-clock time the slow motion adds. */
const SLOW_EXTRA = SLOW_MS * (1 - SLOW_RATE);
const CINE_ORBIT = 1600;
const CINE_SETTLE = 900;
/** Beyond this the camera can't frame the rings on a tilted flat map anyway. */
const CINE_MAX_FRAME_M = 3_000_000;

const easeOut = (x: number) => 1 - (1 - Math.min(Math.max(x, 0), 1)) ** 3;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Strike = {
  center: { x: number; y: number };
  rings: StrikeRing[];
  token: number;
  cinematic: boolean;
};

/** Apple Maps (MapKit) on iOS with the damage rings drawn as geodesic circles. */
export const ImpactMap = forwardRef<MapView | null, Props>(function ImpactMap(
  {
    location,
    rings,
    focusRadiusM = null,
    strikeToken = 0,
    onStrikeEnd,
    onCinematicPhase,
    lockedRing,
    onLockedPress,
    cinematic = false,
    stageCircles,
    hideRings = false,
    stageEffect,
    composition = 'rock',
    style,
  },
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
  /** Cinematic: ms since impact while the map rings grow (null = not growing). */
  const [growth, setGrowth] = useState<number | null>(null);
  /** Cinematic: camera tilt and rotation are allowed while it plays. */
  const [cameraFree, setCameraFree] = useState(false);
  /** Cinematic: set when the meteor lands; starts the ring growth and camera pull-back. */
  const [impactAt, setImpactAt] = useState(0);
  const endRef = useRef(onStrikeEnd);
  const phaseRef = useRef(onCinematicPhase);
  useEffect(() => {
    phaseRef.current = onCinematicPhase;
    endRef.current = onStrikeEnd;
  });
  const reveal = () => {
    setRingsHidden(false);
    endRef.current?.();
  };

  // --- Aftermath stage particles --------------------------------------------
  // They're drawn in screen space, so measure the map's scale once it has
  // settled, and hide them while the map moves.
  const [effectFrame, setEffectFrame] = useState<{ center: { x: number; y: number }; pxPerM: number } | null>(null);
  const [moving, setMoving] = useState(false);
  const [stillMotion, setStillMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setStillMotion)
      .catch(() => {});
  }, []);
  /** The last settled region, for the fallback measurement below. */
  const lastRegion = useRef<Region | null>(null);
  const measureFrame = async () => {
    const m = map.current;
    if (!m) return;
    const probeM = 50_000;
    const cos = Math.max(Math.cos((location.latitude * Math.PI) / 180), 0.01);
    const dLon = ((probeM / (EARTH_RADIUS_M * cos)) * 180) / Math.PI;
    try {
      // Ask MapKit where the impact is on screen; give up quickly if it doesn't answer.
      const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 400));
      const [c, p] = await Promise.race([
        Promise.all([
          m.pointForCoordinate(location),
          m.pointForCoordinate({ latitude: location.latitude, longitude: location.longitude + dLon }),
        ]),
        timeout,
      ]);
      const pxPerM = Math.abs(p.x - c.x) / probeM;
      if (!(pxPerM > 0) || !Number.isFinite(c.x) || !Number.isFinite(c.y)) throw new Error('no scale');
      setEffectFrame({ center: c, pxPerM });
    } catch {
      // Fall back to Web-Mercator maths on the visible region (the map is top-down here).
      const r = lastRegion.current ?? region;
      if (size.width === 0 || !(r.longitudeDelta > 0)) return;
      const pxPerDeg = size.width / r.longitudeDelta;
      const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
      const pxPerRad = pxPerDeg * (180 / Math.PI);
      setEffectFrame({
        center: {
          x: size.width / 2 + (location.longitude - r.longitude) * pxPerDeg,
          y: size.height / 2 - (mercY(location.latitude) - mercY(r.latitude)) * pxPerRad,
        },
        pxPerM: pxPerDeg / ((EARTH_RADIUS_M * cos * Math.PI) / 180),
      });
    }
  };
  const effectKey = stageEffect ? `${stageEffect.kind}:${stageEffect.radiusM}` : '';
  useEffect(() => {
    if (!effectKey || !ready) return;
    // Give a re-framing animation time to finish, then measure.
    const t = setTimeout(measureFrame, 650);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectKey, ready]);

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
        if (cinematic) {
          const R = Math.min(rings[0]?.radiusM ?? FALLBACK_FRAME_RADIUS_M, CINE_MAX_FRAME_M);
          const close = Math.max((rings.find((x) => x.kind === 'severe')?.radiusM ?? R / 3) * 2.4, 2500);
          setCameraFree(true);
          setImpactAt(0);
          setGrowth(0);
          setRingsHidden(false);
          // Start high above (hidden under the full-screen entry shot), then dive
          // in tilted while the meteor falls.
          m.setCamera({ center: location, pitch: 0, heading: 0, altitude: R * 7 });
          phaseRef.current?.('entry');
          await wait(ENTRY_MS);
          if (cancelled) return;
          m.animateCamera({ center: location, pitch: 60, heading: 30, altitude: close }, { duration: CINE_FALL });
          setStrike({
            center: { x: size.width / 2, y: size.height / 2 },
            rings: rings.map((r) => ({ kind: r.kind, px: Math.min(r.radiusM, R) * (size.height / (2.6 * R)) })),
            token: strikeToken,
            cinematic: true,
          });
          phaseRef.current?.('fall');
          return;
        }
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
          cinematic: false,
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
  }, [ringsHidden]);

  // Cinematic: after impact, grow the real map rings (~20 fps) while the camera
  // pulls back and circles, then settle top-down and hand over.
  useEffect(() => {
    if (!impactAt) return;
    const m = map.current;
    const R = Math.min(rings[0]?.radiusM ?? FALLBACK_FRAME_RADIUS_M, CINE_MAX_FRAME_M);
    const tick = setInterval(() => {
      // Slow motion first, then real speed.
      const w = Date.now() - impactAt;
      const e = w < SLOW_MS ? w * SLOW_RATE : w - SLOW_EXTRA;
      if (e >= CINE_GROW) {
        clearInterval(tick);
        setGrowth(CINE_GROW);
      } else setGrowth(Math.max(e, 1));
    }, 40);
    const G = CINE_GROW + SLOW_EXTRA;
    m?.animateCamera({ center: location, pitch: 50, heading: 75, altitude: R * 3.4 }, { duration: G + 300 });
    const orbit = setTimeout(() => {
      map.current?.animateCamera({ heading: 115 }, { duration: CINE_ORBIT });
    }, G + 300);
    const settle = setTimeout(() => {
      map.current?.animateCamera({ center: location, pitch: 0, heading: 0 }, { duration: CINE_SETTLE });
    }, G + 300 + CINE_ORBIT);
    const frame = setTimeout(() => {
      map.current?.animateToRegion(region, 400);
    }, G + 300 + CINE_ORBIT + CINE_SETTLE);
    const done = setTimeout(() => {
      setGrowth(null);
      setCameraFree(false);
      setImpactAt(0);
      phaseRef.current?.('done');
      reveal();
    }, G + 300 + CINE_ORBIT + CINE_SETTLE + 450);
    return () => {
      clearInterval(tick);
      clearTimeout(orbit);
      clearTimeout(settle);
      clearTimeout(frame);
      clearTimeout(done);
    };
    // One run per impact.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [impactAt]);

  const onImpact = () => {
    const big = strike?.cinematic ?? false;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    setTimeout(
      () => Haptics.impactAsync(big ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
      140,
    );
    if (big) {
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}), 320);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}), 560);
      // The ground keeps shaking as the shock wave rolls out.
      [820, 1050, 1300, 1600, 1950].forEach((ms, i) =>
        setTimeout(
          () => Haptics.impactAsync(i < 2 ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
          ms,
        ),
      );
      phaseRef.current?.('impact');
      setImpactAt(Date.now());
    }
    shake.setValue(0);
    Animated.timing(shake, { toValue: 1, duration: big ? 700 : 420, useNativeDriver: true }).start();
  };

  const k = strike?.cinematic ? 2 : 1;
  const shakeX = shake.interpolate({
    inputRange: [0, 0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1],
    outputRange: [0, -7 * k, 6 * k, -5 * k, 4 * k, -2 * k, 1 * k, 0],
  });
  const shakeY = shake.interpolate({
    inputRange: [0, 0.15, 0.3, 0.5, 0.7, 1],
    outputRange: [0, 5 * k, -4 * k, 3 * k, -1 * k, 0],
  });

  const maxR = rings[0]?.radiusM ?? 0;
  /** Radius of a ring at this moment: full size unless the cinematic is growing it. */
  const radiusNow = (r: number) => {
    if (growth === null) return r;
    return r * easeOut(growth / (450 + 1100 * Math.sqrt(r / Math.max(maxR, 1))));
  };

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
        onRegionChange={() => {
          if (stageEffect && !moving) setMoving(true);
        }}
        onRegionChangeComplete={(r) => {
          lastRegion.current = r;
          if (!stageEffect) return;
          setMoving(false);
          measureFrame();
        }}
        userInterfaceStyle="dark"
        showsPointsOfInterests={false}
        pitchEnabled={cameraFree}
        rotateEnabled={cameraFree}
        toolbarEnabled={false}
      >
        {!ringsHidden &&
          growth === null &&
          stageCircles?.map((c) => (
            <Circle
              key={`stage-${c.key}`}
              center={location}
              radius={c.radiusM}
              fillColor={c.fill}
              strokeColor={c.stroke}
              strokeWidth={1.5}
            />
          ))}
        {!ringsHidden &&
          !(hideRings && growth === null) &&
          rings.map((ring) => {
            const s = RING_STYLE[ring.kind];
            const radius = radiusNow(ring.radiusM);
            if (radius < 1) return null;
            return (
              <Circle
                key={ring.kind}
                center={location}
                radius={radius}
                fillColor={s.fill}
                strokeColor={s.stroke}
                strokeWidth={2}
              />
            );
          })}
        {growth !== null && growth > 0 && growth < 1500 && maxR > 0 && (
          // Cinematic shock front: a bright ring running just ahead of the largest wave.
          <Circle
            center={location}
            radius={maxR * 1.06 * easeOut(growth / 1500)}
            strokeColor={`rgba(255,255,255,${(0.9 * (1 - growth / 1500)).toFixed(2)})`}
            fillColor="rgba(0,0,0,0)"
            strokeWidth={2.5}
          />
        )}
        {!ringsHidden && growth === null && lockedRing && (
          // No ring for the locked burns zone: drawing it would give its size away.
          // Just a tag above the pin that opens the paywall.
          <Marker
            coordinate={location}
            anchor={{ x: 0.5, y: 0.5 }}
            centerOffset={{ x: 0, y: -52 }}
            onPress={onLockedPress}
            accessibilityLabel={t('result.burnsTagA11y')}
          >
            <View style={styles.tag}>
              <LockIcon size={10} color={colors.text} />
              <Text style={styles.tagText}>{t('result.burnsTag')}</Text>
            </View>
          </Marker>
        )}
        <Marker coordinate={location} pinColor="#FF6B4A" />
      </MapView>
      {stageEffect && effectFrame && !moving && growth === null && !ringsHidden && (
        <StageEffects
          key={effectKey}
          width={size.width}
          height={size.height}
          center={effectFrame.center}
          pxPerM={effectFrame.pxPerM}
          effect={stageEffect}
          reduceMotion={stillMotion}
        />
      )}
      {strike && (
        <StrikeAnimation
          key={strike.token}
          width={size.width}
          height={size.height}
          center={strike.center}
          rings={strike.rings}
          onImpact={onImpact}
          // The cinematic hands over itself, once the camera has settled.
          onDone={strike.cinematic ? () => {} : reveal}
          fallMs={strike.cinematic ? CINE_FALL : undefined}
          intensity={strike.cinematic ? 1.6 : 1}
          drawRings={!strike.cinematic}
          composition={composition}
        />
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  map: { flex: 1 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(11,14,23,0.9)',
    borderColor: 'rgba(224,92,255,0.7)',
    borderWidth: 1,
  },
  tagText: { fontSize: 10, color: colors.text, fontFamily: fonts.bodySemi },
});
