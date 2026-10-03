import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { t } from '../i18n/core';
import { simulateImpact } from '../physics/impact';
import { PRESETS } from '../physics/presets';
import { colors, fonts } from '../theme';
import type { Feature } from '../upsell/entitlements';
import { globePaths } from './globe';
import { RING_STYLE } from './rings';

const H = 150;

/** Hero illustration for the paywall, one per feature. Decorative, so hidden from VoiceOver. */
export function PaywallArt({ feature, width }: { feature: Feature; width: number }) {
  return (
    <View
      style={[styles.wrap, { width, height: H }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {feature === 'burns' && <BurnsArt width={width} />}
      {feature === 'presets' && <PresetsArt />}
      {feature === 'compositions' && <CompositionsArt width={width} />}
      {feature === 'ads' && <AdsArt width={width} />}
      {feature === 'cinematic' && <CinematicArt width={width} />}
      {feature === 'aftermath' && <AftermathArt width={width} />}
      {feature === 'asteroids' && <AsteroidsArt width={width} />}
    </View>
  );
}

/** Real asteroids: Earth with fly-by paths, the closest one glowing. */
function AsteroidsArt({ width }: { width: number }) {
  const pulse = usePulse(1400);
  const ex = width * 0.3;
  const ey = H * 0.55;
  const rocks = [
    { x: width * 0.6, y: H * 0.24, r: 5, d: `M ${width * 0.08} ${H * 0.06} Q ${width * 0.5} ${H * 0.36} ${width * 0.98} ${H * 0.1}` },
    { x: width * 0.74, y: H * 0.62, r: 7, d: `M ${width * 0.42} ${H * 0.98} Q ${width * 0.62} ${H * 0.5} ${width * 0.98} ${H * 0.42}` },
    { x: width * 0.47, y: H * 0.86, r: 4, d: `M ${width * 0.02} ${H * 0.98} Q ${width * 0.45} ${H * 0.76} ${width * 0.9} ${H * 0.98}` },
  ];
  const glow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });
  return (
    <>
      <Svg width={width} height={H}>
        <Defs>
          <RadialGradient id="earthA" cx="40%" cy="35%" r="70%">
            <Stop offset="0" stopColor="#3D6BC7" />
            <Stop offset="1" stopColor="#0E1E4A" />
          </RadialGradient>
        </Defs>
        {rocks.map((r, i) => (
          <Path key={`p${i}`} d={r.d} stroke="rgba(255,255,255,0.22)" strokeWidth={1.2} strokeDasharray="4 5" fill="none" />
        ))}
        <Circle cx={ex} cy={ey} r={34} fill="url(#earthA)" />
        <Circle cx={ex} cy={ey} r={37} fill="none" stroke="rgba(127,211,255,0.45)" strokeWidth={2} />
        {rocks.map((r, i) => (
          <Circle key={`r${i}`} cx={r.x} cy={r.y} r={r.r} fill="#C9B8A6" />
        ))}
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: glow }]}>
        <Svg width={width} height={H}>
          <Circle cx={rocks[1].x} cy={rocks[1].y} r={13} fill={colors.accent} opacity={0.35} />
        </Svg>
      </Animated.View>
      <Text style={[styles.nasaTag, { left: ex - 30, top: ey + 42 }]}>NASA / JPL</Text>
    </>
  );
}

/** Loops a 0→1→0 value unless Reduce Motion is on (then holds at 1). */
function usePulse(duration: number) {
  const [v] = useState(() => new Animated.Value(1));
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled || reduce) return;
        v.setValue(0);
        loop = Animated.loop(
          Animated.sequence([
            Animated.timing(v, { toValue: 1, duration, useNativeDriver: true }),
            Animated.timing(v, { toValue: 0, duration, useNativeDriver: true }),
          ]),
        );
        loop.start();
      });
    return () => {
      cancelled = true;
      loop?.stop();
    };
  }, [v, duration]);
  return v;
}

function BurnsArt({ width }: { width: number }) {
  const pulse = usePulse(1400);
  const cx = width / 2;
  const cy = H / 2;
  const glow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] });
  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: glow }]}>
        <Svg width={width} height={H}>
          <Defs>
            <RadialGradient id="heat" cx="50%" cy="50%" r="50%">
              <Stop offset="0.55" stopColor={colors.magenta} stopOpacity="0" />
              <Stop offset="0.82" stopColor={colors.magenta} stopOpacity="0.45" />
              <Stop offset="1" stopColor={colors.magenta} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={cx} cy={cy} r={70} fill="url(#heat)" />
        </Svg>
      </Animated.View>
      <Svg width={width} height={H}>
        <Defs>
          <RadialGradient id="fire" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FFE3A3" />
            <Stop offset="0.5" stopColor={colors.accent} />
            <Stop offset="1" stopColor={colors.accent} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={cx} cy={cy} r={58} fill="rgba(224,92,255,0.08)" stroke={colors.magenta} strokeWidth={2} />
        <Circle cx={cx} cy={cy} r={38} fill={RING_STYLE.severe.fill} stroke={RING_STYLE.severe.stroke} strokeWidth={1.5} />
        <Circle cx={cx} cy={cy} r={20} fill="url(#fire)" />
      </Svg>
    </>
  );
}

/** A tilted map: perspective grid, rings squashed into ellipses, a meteor diving in. */
function CinematicArt({ width }: { width: number }) {
  const pulse = usePulse(1600);
  const cx = width / 2;
  const cy = H * 0.66;
  const glow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
  const lines = Array.from({ length: 9 }, (_, i) => i - 4);
  return (
    <>
      <Svg width={width} height={H}>
        <Defs>
          <LinearGradient id="tail2" x1="0" y1="1" x2="1" y2="0">
            <Stop offset="0" stopColor="#FFE9B0" />
            <Stop offset="0.4" stopColor={colors.accent} stopOpacity="0.7" />
            <Stop offset="1" stopColor={colors.accent} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {/* Perspective grid converging on a far horizon. */}
        <G stroke="rgba(139,146,168,0.25)" strokeWidth={1}>
          {lines.map((i) => (
            <Line key={`v${i}`} x1={cx + i * 18} y1={H * 0.18} x2={cx + i * 70} y2={H} />
          ))}
          {[0.28, 0.4, 0.55, 0.74, 0.98].map((f) => (
            <Line key={`h${f}`} x1={0} y1={H * f} x2={width} y2={H * f} />
          ))}
        </G>
        <Path
          d={`M ${cx - 120} ${cy} A 120 34 0 1 0 ${cx + 120} ${cy} A 120 34 0 1 0 ${cx - 120} ${cy}`}
          fill={RING_STYLE.windows.fill}
          stroke={RING_STYLE.windows.stroke}
          strokeWidth={1.5}
        />
        <Path
          d={`M ${cx - 62} ${cy} A 62 18 0 1 0 ${cx + 62} ${cy} A 62 18 0 1 0 ${cx - 62} ${cy}`}
          fill={RING_STYLE.severe.fill}
          stroke={RING_STYLE.severe.stroke}
          strokeWidth={1.5}
        />
        <Line x1={cx + 8} y1={cy - 10} x2={cx + 110} y2={cy - 110} stroke="url(#tail2)" strokeWidth={5} strokeLinecap="round" />
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: glow }]}>
        <Svg width={width} height={H}>
          <Defs>
            <RadialGradient id="blast" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#FFFBEA" />
              <Stop offset="0.35" stopColor="#FFD166" />
              <Stop offset="1" stopColor={colors.accent} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={cx} cy={cy - 6} r={26} fill="url(#blast)" />
        </Svg>
      </Animated.View>
    </>
  );
}

/** Six stops from second 0 to years later. */
function AftermathArt({ width }: { width: number }) {
  const stops = ['impact', 'blast', 'ejecta', 'fires', 'sky', 'climate'] as const;
  const x0 = 28;
  const x1 = width - 28;
  const y = H / 2 - 8;
  const step = (x1 - x0) / (stops.length - 1);
  const tint = ['#FFD166', colors.yellow, '#C9A27A', colors.accent, '#6B7385', colors.blue];
  return (
    <Svg width={width} height={H}>
      <Line x1={x0} y1={y} x2={x1} y2={y} stroke={colors.border} strokeWidth={2} />
      {stops.map((id, i) => (
        <G key={id}>
          <Circle cx={x0 + i * step} cy={y} r={i === 0 ? 12 : 9} fill={tint[i]} opacity={i === 0 ? 1 : 0.85} />
          <Circle cx={x0 + i * step} cy={y} r={i === 0 ? 18 : 14} fill="none" stroke={tint[i]} strokeOpacity={0.35} />
        </G>
      ))}
    </Svg>
  );
}

function PresetsArt() {
  const size = H - 6;
  const paths = useMemo(() => {
    const chicxulub = PRESETS.find((p) => p.id === 'chicxulub')!;
    // Chicxulub, Yucatán; viewed from a little north-east so the rings wrap the globe.
    return globePaths(21.4, -89.5, simulateImpact(chicxulub.params).rings, size, 28, -75);
  }, [size]);
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id="ocean" cx="40%" cy="35%" r="75%">
          <Stop offset="0" stopColor="#1A2E52" />
          <Stop offset="1" stopColor="#0A1326" />
        </RadialGradient>
      </Defs>
      <Path d={paths.sphere} fill="url(#ocean)" />
      <Path d={paths.land} fill="#34435F" />
      {paths.rings.map((r) => (
        <Path key={r.kind} d={r.d} fill={RING_STYLE[r.kind].fill} stroke={RING_STYLE[r.kind].stroke} strokeWidth={1.2} />
      ))}
      <Path d={paths.sphere} fill="none" stroke="rgba(74,158,255,0.35)" strokeWidth={1} />
      {paths.impact && <Circle cx={paths.impact[0]} cy={paths.impact[1]} r={3} fill={colors.accent} />}
    </Svg>
  );
}

function CompositionsArt({ width }: { width: number }) {
  const left = width * 0.3;
  const right = width * 0.7;
  const cy = H / 2 - 10;
  return (
    <>
      <Svg width={width} height={H}>
        <Defs>
          <RadialGradient id="iron" cx="35%" cy="30%" r="75%">
            <Stop offset="0" stopColor="#D9DDE6" />
            <Stop offset="0.45" stopColor="#7C8496" />
            <Stop offset="1" stopColor="#2B303C" />
          </RadialGradient>
          <RadialGradient id="ice" cx="35%" cy="30%" r="75%">
            <Stop offset="0" stopColor="#F2FBFF" />
            <Stop offset="0.5" stopColor="#8FD3FF" />
            <Stop offset="1" stopColor="#2A5C8A" />
          </RadialGradient>
          <LinearGradient id="tail" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#8FD3FF" stopOpacity="0" />
            <Stop offset="1" stopColor="#8FD3FF" stopOpacity="0.6" />
          </LinearGradient>
        </Defs>
        {/* Iron: small and dense, pocked surface. */}
        <Circle cx={left} cy={cy} r={30} fill="url(#iron)" />
        <Circle cx={left - 9} cy={cy + 8} r={4} fill="rgba(0,0,0,0.25)" />
        <Circle cx={left + 11} cy={cy - 4} r={3} fill="rgba(0,0,0,0.25)" />
        <Circle cx={left + 3} cy={cy + 15} r={2.5} fill="rgba(0,0,0,0.25)" />
        {/* Comet: bigger, fluffy, with a tail streaming away. */}
        <Path d={`M ${right - 95} ${cy - 14} L ${right} ${cy - 30} L ${right} ${cy + 30} L ${right - 95} ${cy + 14} Z`} fill="url(#tail)" />
        <Circle cx={right} cy={cy} r={34} fill="url(#ice)" opacity={0.95} />
        <Circle cx={right} cy={cy} r={40} fill="none" stroke="rgba(143,211,255,0.35)" strokeWidth={4} />
      </Svg>
      <View style={[styles.labels, { top: cy + 46 }]}>
        <Text style={[styles.label, { left: left - 60 }]}>{t('composition.iron')}</Text>
        <Text style={[styles.label, { left: right - 60 }]}>{t('composition.comet')}</Text>
      </View>
    </>
  );
}

function AdsArt({ width }: { width: number }) {
  const w = 86;
  const x = width / 2 - w / 2;
  return (
    <Svg width={width} height={H}>
      <Rect x={x} y={8} width={w} height={H - 16} rx={14} fill={colors.surface} stroke={colors.border} strokeWidth={1.5} />
      <Rect x={x + 10} y={24} width={w - 20} height={40} rx={6} fill="rgba(74,158,255,0.15)" />
      <Circle cx={width / 2} cy={44} r={9} fill={RING_STYLE.severe.fill} stroke={RING_STYLE.severe.stroke} />
      <Rect x={x + 10} y={H - 44} width={w - 20} height={20} rx={4} fill="rgba(255,196,74,0.25)" />
      <G stroke={colors.accent} strokeWidth={3} strokeLinecap="round">
        <Line x1={x + 6} y1={H - 52} x2={x + w - 6} y2={H - 16} />
      </G>
    </Svg>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  nasaTag: { position: 'absolute', width: 60, textAlign: 'center', fontSize: 9, letterSpacing: 1, color: colors.muted, fontFamily: fonts.bodySemi },
  labels: { position: 'absolute', left: 0, right: 0 },
  label: {
    position: 'absolute',
    width: 120,
    textAlign: 'center',
    fontSize: 12,
    color: colors.muted,
    fontFamily: fonts.bodySemi,
  },
});
