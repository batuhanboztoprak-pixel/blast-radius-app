import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { t } from '../i18n/core';
import { fonts } from '../theme';

/** Cheap deterministic hash → [0, 1). */
const rand = (n: number) => {
  const x = Math.sin(n * 57.31 + 3.7) * 43758.5453;
  return x - Math.floor(x);
};

const TOTAL_MS = 3400;
/** The native splash colour (app.json), so the hand-over is seamless. */
export const INTRO_BG = '#2A1FB5';

/** Direction from the meteor's head back along its tail (up and to the right). */
const UX = 0.4;
const UY = -0.9165;

/** A lumpy closed outline around (cx, cy), the same shape as the app icon's rock. */
function rockPath(cx: number, cy: number, r: number): string {
  const n = 11;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const k = r * (0.9 + rand(i + 3) * 0.16);
    return [cx + Math.cos(a) * k, cy + Math.sin(a) * k];
  });
  const mid = (p: number[], q: number[]) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  let d = '';
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % n];
    const m = mid(p, q);
    if (i === 0) {
      const m0 = mid(pts[n - 1], p);
      d += `M ${m0[0].toFixed(1)} ${m0[1].toFixed(1)} `;
    }
    d += `Q ${p[0].toFixed(1)} ${p[1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)} `;
  });
  return `${d}Z`;
}

/**
 * The launch intro, drawn in the app icon's style: a violet sky, the curve of
 * the Earth, a white-hot meteor streaking in, a flash, the damage rings
 * spreading on the ground, then the name. It plays once per launch over the
 * first screen and fades away on its own; a tap skips it.
 */
export function IntroSplash({ onDone }: { onDone: () => void }) {
  const { width: w, height: h } = useWindowDimensions();
  const [p] = useState(() => new Animated.Value(0));
  const [fade] = useState(() => new Animated.Value(1));

  // Scene geometry.
  const limbY = h * 0.6;
  const planetR = w * 1.7;
  const ringRx = w * 0.42;
  const ringRy = ringRx * 0.25;
  const ix = w / 2;
  const iy = limbY + ringRy + 10;

  // Meteor: drawn in its own box with the head at (headX, headY).
  const R = w * 0.1;
  const L = w * 0.62;
  const S = L + 2.6 * R;
  const headX = 1.3 * R;
  const headY = S - 1.3 * R;
  const meteor = useMemo(() => {
    const nx = -UY;
    const ny = UX;
    const tw = R * 0.86;
    const ex = headX + UX * L;
    const ey = headY + UY * L;
    const cx1 = headX + nx * tw * 1.05 + UX * L * 0.45;
    const cy1 = headY + ny * tw * 1.05 + UY * L * 0.45;
    const cx2 = headX - nx * tw * 1.05 + UX * L * 0.45;
    const cy2 = headY - ny * tw * 1.05 + UY * L * 0.45;
    const tail =
      `M ${headX + nx * tw} ${headY + ny * tw} Q ${cx1} ${cy1} ${ex} ${ey} ` +
      `Q ${cx2} ${cy2} ${headX - nx * tw} ${headY - ny * tw} Z`;
    const lines = [
      { off: 1.25, a: 1.5, b: 2.9, sw: R * 0.085, op: 0.6 },
      { off: -1.25, a: 1.9, b: 2.8, sw: R * 0.07, op: 0.45 },
    ].map((l) => ({
      x1: headX + nx * R * l.off + UX * R * l.a,
      y1: headY + ny * R * l.off + UY * R * l.a,
      x2: headX + nx * R * l.off + UX * R * l.b,
      y2: headY + ny * R * l.off + UY * R * l.b,
      sw: l.sw,
      op: l.op,
    }));
    const k = R / 132; // craters are placed in icon units (rock radius 132)
    const craters = [
      [-30, -34, 30, 26],
      [40, 16, 36, 31],
      [-46, 48, 18, 15],
      [24, -62, 14, 12],
      [58, 64, 12, 10],
    ].map(([a, b, rx, ry]) => ({ cx: headX + a * k, cy: headY + b * k, rx: rx * k, ry: ry * k }));
    return { tail, ex, ey, lines, craters, rock: rockPath(headX, headY, R) };
  }, [R, L, headX, headY]);

  const stars = useMemo(
    () => Array.from({ length: 60 }, (_, i) => ({ x: rand(i) * w, y: rand(i + 500) * limbY, r: 0.6 + rand(i + 900) * 1.4 })),
    [w, limbY],
  );

  const finish = () => {
    Animated.timing(fade, { toValue: 0, duration: 380, useNativeDriver: true }).start(() => onDone());
  };

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) {
          p.setValue(1);
          timer = setTimeout(finish, 1200);
          return;
        }
        Animated.timing(p, { toValue: 1, duration: TOTAL_MS, easing: Easing.linear, useNativeDriver: true }).start(
          ({ finished }) => finished && finish(),
        );
      });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // Plays once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timeline (fractions of TOTAL_MS): meteor 0.04–0.34, impact at 0.34, rings 0.34–0.7, title 0.5–0.68.
  const HIT = 0.34;
  // (Easing is baked into the ranges: interpolate easing isn't supported on the native driver.)
  const fall = p.interpolate({
    inputRange: [0, 0.04, 0.115, 0.19, 0.265, HIT, 1],
    outputRange: [0, 0, 0.0625, 0.25, 0.5625, 1, 1],
  });
  const startD = h * 0.95;
  const endD = R * 0.7;
  const meteorX = fall.interpolate({ inputRange: [0, 1], outputRange: [UX * startD, UX * endD] });
  const meteorY = fall.interpolate({ inputRange: [0, 1], outputRange: [UY * startD, UY * endD] });
  const meteorOpacity = p.interpolate({ inputRange: [0, 0.04, HIT - 0.01, HIT + 0.01, 1], outputRange: [0, 1, 1, 0, 0] });
  const flash = p.interpolate({ inputRange: [0, HIT, HIT + 0.02, HIT + 0.2, 1], outputRange: [0, 0, 0.85, 0, 0] });
  const glowScale = p.interpolate({ inputRange: [0, HIT, HIT + 0.25, 1], outputRange: [0.2, 0.2, 1.3, 1.1] });
  const glowOpacity = p.interpolate({ inputRange: [0, HIT, HIT + 0.04, 1], outputRange: [0, 0, 1, 0.85] });
  const ringScale = p.interpolate({
    inputRange: [0, HIT, HIT + 0.09, HIT + 0.18, HIT + 0.27, 0.7, 1],
    outputRange: [0.05, 0.05, 0.6, 0.88, 0.985, 1, 1.03],
  });
  const ringOpacity = p.interpolate({ inputRange: [0, HIT, HIT + 0.05, 1], outputRange: [0, 0, 1, 1] });
  const titleOpacity = p.interpolate({ inputRange: [0, 0.5, 0.68, 1], outputRange: [0, 0, 1, 1] });
  const titleY = p.interpolate({ inputRange: [0, 0.5, 0.68, 1], outputRange: [14, 14, 0, 0] });
  const shake = p.interpolate({
    inputRange: [0, HIT, HIT + 0.02, HIT + 0.04, HIT + 0.06, HIT + 0.08, 1],
    outputRange: [0, 0, -6, 5, -3, 0, 0],
  });

  const ringBox = { w: ringRx * 2 + 24, h: ringRy * 2 + 24 };
  const glow = w * 0.55;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.screen, { opacity: fade }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={finish} accessibilityRole="button" accessibilityLabel={t('intro.skip')}>
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: shake }] }]}>
          {/* Sky, stars and the curve of the Earth. */}
          <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id="introSky" x1="0.2" y1="0" x2="0.6" y2="1">
                <Stop offset="0" stopColor="#6A4BFF" />
                <Stop offset="0.55" stopColor="#3726D6" />
                <Stop offset="1" stopColor="#170F66" />
              </LinearGradient>
              <RadialGradient id="introPlanet" cx="50%" cy="0%" r="60%">
                <Stop offset="0" stopColor="#2A3AB8" />
                <Stop offset="1" stopColor="#0B0D3A" />
              </RadialGradient>
            </Defs>
            <Rect x={0} y={0} width={w} height={h} fill="url(#introSky)" />
            {stars.map((s, i) => (
              <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#FFFFFF" opacity={0.25 + rand(i + 77) * 0.55} />
            ))}
            {/* Atmosphere: a few soft strokes stand in for a blur. */}
            <Circle cx={w / 2} cy={limbY + planetR} r={planetR + 14} fill="none" stroke="#7FD3FF" strokeOpacity={0.12} strokeWidth={22} />
            <Circle cx={w / 2} cy={limbY + planetR} r={planetR + 5} fill="none" stroke="#7FD3FF" strokeOpacity={0.35} strokeWidth={8} />
            <Circle cx={w / 2} cy={limbY + planetR} r={planetR} fill="url(#introPlanet)" stroke="#9FE0FF" strokeOpacity={0.9} strokeWidth={2.5} />
          </Svg>

          {/* Damage rings spreading on the ground. */}
          <Animated.View
            style={{
              position: 'absolute',
              left: ix - ringBox.w / 2,
              top: iy - ringBox.h / 2,
              width: ringBox.w,
              height: ringBox.h,
              opacity: ringOpacity,
              transform: [{ scale: ringScale }],
            }}
          >
            <Svg width={ringBox.w} height={ringBox.h}>
              <Defs>
                <RadialGradient id="introRingFill" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor="#FFD166" stopOpacity="0.5" />
                  <Stop offset="0.6" stopColor="#FF5A4A" stopOpacity="0.18" />
                  <Stop offset="1" stopColor="#FF5A4A" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Ellipse cx={ringBox.w / 2} cy={ringBox.h / 2} rx={ringRx} ry={ringRy} fill="url(#introRingFill)" />
              {[
                { k: 1, c: '#FF5A4A', o: 0.65, sw: 3.5 },
                { k: 0.71, c: '#FF8A3D', o: 0.9, sw: 4 },
                { k: 0.44, c: '#FFD166', o: 1, sw: 4.5 },
              ].map((r) => (
                <Ellipse
                  key={r.k}
                  cx={ringBox.w / 2}
                  cy={ringBox.h / 2}
                  rx={ringRx * r.k}
                  ry={ringRy * r.k}
                  fill="none"
                  stroke={r.c}
                  strokeOpacity={r.o}
                  strokeWidth={r.sw}
                />
              ))}
              <Ellipse cx={ringBox.w / 2} cy={ringBox.h / 2} rx={ringRx * 0.2} ry={ringRy * 0.2} fill="#FFFFFF" />
            </Svg>
          </Animated.View>

          {/* Impact glow. */}
          <Animated.View
            style={{
              position: 'absolute',
              left: ix - glow / 2,
              top: iy - glow / 2 - 8,
              width: glow,
              height: glow,
              opacity: glowOpacity,
              transform: [{ scaleY: 0.62 }, { scale: glowScale }],
            }}
          >
            <Svg width={glow} height={glow}>
              <Defs>
                <RadialGradient id="introGlow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor="#FFFFFF" />
                  <Stop offset="0.22" stopColor="#FFE7B0" />
                  <Stop offset="0.55" stopColor="#FF8A3D" stopOpacity="0.5" />
                  <Stop offset="1" stopColor="#FF8A3D" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Circle cx={glow / 2} cy={glow / 2} r={glow / 2} fill="url(#introGlow)" />
            </Svg>
          </Animated.View>

          {/* The meteor, flying straight down its own tail into the impact point. */}
          <Animated.View
            style={{
              position: 'absolute',
              left: ix - headX,
              top: iy - headY,
              width: S,
              height: S,
              opacity: meteorOpacity,
              transform: [{ translateX: meteorX }, { translateY: meteorY }],
            }}
          >
            <Svg width={S} height={S}>
              <Defs>
                <LinearGradient id="introTail" x1={headX} y1={headY} x2={meteor.ex} y2={meteor.ey} gradientUnits="userSpaceOnUse">
                  <Stop offset="0" stopColor="#FFFFFF" />
                  <Stop offset="0.18" stopColor="#FFE9B8" />
                  <Stop offset="0.45" stopColor="#FF8A3D" stopOpacity="0.85" />
                  <Stop offset="1" stopColor="#FF4F6D" stopOpacity="0" />
                </LinearGradient>
                <RadialGradient id="introSheath" cx={headX - R * 0.3} cy={headY + R * 0.3} r={R * 1.4} gradientUnits="userSpaceOnUse">
                  <Stop offset="0.55" stopColor="#FF8A3D" stopOpacity="0.85" />
                  <Stop offset="1" stopColor="#FF8A3D" stopOpacity="0" />
                </RadialGradient>
                <RadialGradient id="introRock" cx={headX - R * 0.45} cy={headY + R * 0.45} r={R * 1.55} gradientUnits="userSpaceOnUse">
                  <Stop offset="0" stopColor="#FFFFFF" />
                  <Stop offset="0.3" stopColor="#FFE8C8" />
                  <Stop offset="0.75" stopColor="#C7B8E8" />
                  <Stop offset="1" stopColor="#5B4AA8" />
                </RadialGradient>
              </Defs>
              {meteor.lines.map((l, i) => (
                <Line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#FFFFFF" strokeOpacity={l.op} strokeWidth={l.sw} strokeLinecap="round" />
              ))}
              <Path d={meteor.tail} fill="url(#introTail)" />
              <Circle cx={headX} cy={headY} r={R * 1.4} fill="url(#introSheath)" />
              <Path d={meteor.rock} fill="url(#introRock)" />
              <G>
                {meteor.craters.map((c, i) => (
                  <Ellipse key={i} cx={c.cx} cy={c.cy} rx={c.rx} ry={c.ry} fill="#6B58B8" opacity={0.9} />
                ))}
              </G>
            </Svg>
          </Animated.View>
        </Animated.View>

        <Animated.View style={[StyleSheet.absoluteFill, styles.flash, { opacity: flash }]} pointerEvents="none" />

        <Animated.View style={[styles.titleWrap, { top: limbY * 0.4, opacity: titleOpacity, transform: [{ translateY: titleY }] }]}>
          <Text style={styles.brand}>BLAST RADIUS</Text>
          <Text style={styles.tagline}>{t('intro.tagline')}</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: INTRO_BG, zIndex: 100 },
  flash: { backgroundColor: '#FFF3DC' },
  titleWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 8 },
  brand: { fontSize: 32, letterSpacing: 4, color: '#FFFFFF', fontFamily: fonts.display },
  tagline: { fontSize: 15, color: 'rgba(220,225,255,0.8)', fontFamily: fonts.body },
});
