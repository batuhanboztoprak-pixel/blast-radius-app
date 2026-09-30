import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

import { t } from '../i18n/core';
import { colors, fonts } from '../theme';
import { globePaths } from './globe';

/** Cheap deterministic hash → [0, 1). */
const rand = (n: number) => {
  const x = Math.sin(n * 57.31 + 3.7) * 43758.5453;
  return x - Math.floor(x);
};

const TOTAL_MS = 3200;

/**
 * The launch intro: stars, the Earth, a meteor streaking in and flashing on
 * the planet's rim, then the name. It plays once per launch over the first
 * screen and fades away on its own; a tap skips it.
 */
export function IntroSplash({ onDone }: { onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const [p] = useState(() => new Animated.Value(0));
  const [fade] = useState(() => new Animated.Value(1));
  const size = Math.min(width * 0.78, 340);
  const cx = width / 2;
  const cy = height * 0.42;

  const earth = useMemo(() => globePaths(24, 18, [], size, 24, 18), [size]);
  const stars = useMemo(
    () => Array.from({ length: 70 }, (_, i) => ({ x: rand(i) * width, y: rand(i + 500) * height, r: 0.5 + rand(i + 900) * 1.3 })),
    [width, height],
  );

  // The meteor hits the Earth's upper-right rim.
  const hitX = cx + (size / 2) * 0.62;
  const hitY = cy - (size / 2) * 0.62;

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

  // Timeline (fractions of TOTAL_MS): meteor 0.10–0.38, flash 0.38–0.55, title 0.45–0.7.
  const meteorT = p.interpolate({ inputRange: [0, 0.1, 0.38, 1], outputRange: [0, 0, 1, 1] });
  const meteorX = meteorT.interpolate({ inputRange: [0, 1], outputRange: [width * 0.9, 0] });
  const meteorY = meteorT.interpolate({ inputRange: [0, 1], outputRange: [-height * 0.5, 0] });
  const meteorOpacity = p.interpolate({ inputRange: [0, 0.1, 0.37, 0.39, 1], outputRange: [0, 1, 1, 0, 0] });
  const flash = p.interpolate({ inputRange: [0, 0.38, 0.41, 0.6, 1], outputRange: [0, 0, 1, 0, 0] });
  const glowScale = p.interpolate({ inputRange: [0, 0.38, 0.7, 1], outputRange: [0.1, 0.1, 1.6, 1.8] });
  const glowOpacity = p.interpolate({ inputRange: [0, 0.38, 0.45, 1], outputRange: [0, 0, 1, 0.5] });
  const titleOpacity = p.interpolate({ inputRange: [0, 0.45, 0.62, 1], outputRange: [0, 0, 1, 1] });
  const titleY = p.interpolate({ inputRange: [0, 0.45, 0.62, 1], outputRange: [14, 14, 0, 0] });
  const earthScale = p.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.02] });

  const TAIL = 150;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.screen, { opacity: fade }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={finish} accessibilityRole="button" accessibilityLabel={t('intro.skip')}>
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          {stars.map((s, i) => (
            <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#FFFFFF" opacity={0.25 + rand(i + 77) * 0.6} />
          ))}
        </Svg>

        <Animated.View
          style={{
            position: 'absolute',
            left: cx - size / 2,
            top: cy - size / 2,
            width: size,
            height: size,
            transform: [{ scale: earthScale }],
          }}
        >
          <Svg width={size} height={size}>
            <Defs>
              <RadialGradient id="introOcean" cx="40%" cy="35%" r="75%">
                <Stop offset="0" stopColor="#1C3561" />
                <Stop offset="1" stopColor="#081024" />
              </RadialGradient>
              <RadialGradient id="introShade" cx="35%" cy="30%" r="75%">
                <Stop offset="0.55" stopColor="#000" stopOpacity="0" />
                <Stop offset="1" stopColor="#000" stopOpacity="0.6" />
              </RadialGradient>
            </Defs>
            <Circle cx={size / 2} cy={size / 2} r={size / 2 + 6} fill={colors.blue} opacity={0.08} />
            <Path d={earth.sphere} fill="url(#introOcean)" />
            <Path d={earth.graticule} stroke="rgba(255,255,255,0.06)" strokeWidth={0.75} fill="none" />
            <Path d={earth.land} fill="#34435F" />
            <Path d={earth.sphere} fill="url(#introShade)" />
            <Path d={earth.sphere} fill="none" stroke="rgba(74,158,255,0.45)" strokeWidth={1.2} />
          </Svg>
        </Animated.View>

        {/* Impact glow on the rim. */}
        <Animated.View
          style={{
            position: 'absolute',
            left: hitX - 60,
            top: hitY - 60,
            width: 120,
            height: 120,
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          }}
        >
          <Svg width={120} height={120}>
            <Defs>
              <RadialGradient id="introGlow" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor="#FFFBEA" />
                <Stop offset="0.3" stopColor="#FFD166" />
                <Stop offset="0.65" stopColor={colors.accent} stopOpacity="0.7" />
                <Stop offset="1" stopColor={colors.accent} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx={60} cy={60} r={60} fill="url(#introGlow)" />
          </Svg>
        </Animated.View>

        {/* Meteor. */}
        <Animated.View
          style={{
            position: 'absolute',
            left: hitX - 10,
            top: hitY - TAIL,
            width: TAIL + 10,
            height: TAIL + 10,
            opacity: meteorOpacity,
            transform: [{ translateX: meteorX }, { translateY: meteorY }],
          }}
        >
          <Svg width={TAIL + 10} height={TAIL + 10}>
            <Defs>
              <LinearGradient id="introTail" x1="0" y1="1" x2="1" y2="0">
                <Stop offset="0" stopColor="#FFE9B0" />
                <Stop offset="0.35" stopColor={colors.accent} stopOpacity="0.7" />
                <Stop offset="1" stopColor={colors.accent} stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Line x1={10} y1={TAIL} x2={TAIL + 10} y2={0} stroke="url(#introTail)" strokeWidth={5} strokeLinecap="round" />
            <Circle cx={10} cy={TAIL} r={7} fill="#FFFFFF" />
          </Svg>
        </Animated.View>

        <Animated.View style={[StyleSheet.absoluteFill, styles.flash, { opacity: flash }]} pointerEvents="none" />

        <Animated.View style={[styles.titleWrap, { top: cy + size / 2 + 34, opacity: titleOpacity, transform: [{ translateY: titleY }] }]}>
          <View style={styles.brandRow}>
            <View style={styles.dot} />
            <Text style={styles.brand}>BLAST RADIUS</Text>
          </View>
          <Text style={styles.tagline}>{t('intro.tagline')}</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#05070D', zIndex: 100 },
  flash: { backgroundColor: '#FFF6E0' },
  titleWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 8 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.accent },
  brand: { fontSize: 30, letterSpacing: 3, color: colors.text, fontFamily: fonts.display },
  tagline: { fontSize: 15, color: colors.muted, fontFamily: fonts.body },
});
