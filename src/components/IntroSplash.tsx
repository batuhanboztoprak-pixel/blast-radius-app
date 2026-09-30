import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Pressable, StyleSheet, Text, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { t } from '../i18n/core';
import { fonts } from '../theme';

const ART = require('../../assets/brand/impact-art.jpg');
const WORDMARK = require('../../assets/brand/wordmark.png');
const WORDMARK_ASPECT = 1543 / 488;
/** Where the rings are centred in the artwork (fractions of its size). */
const IMPACT = { x: 0.502, y: 0.518 };

const TOTAL_MS = 3200;
/** The native splash colour (app.json), so the hand-over is seamless. */
export const INTRO_BG = '#0A0340';

/**
 * The launch intro. It starts exactly where the native splash leaves off (the
 * wordmark, centred at 70% width), then the impact artwork rises in behind it,
 * the meteor hits with a flash and a shake, the rings glow, and the wordmark
 * settles below with the tagline. A tap skips it.
 */
export function IntroSplash({ onDone }: { onDone: () => void }) {
  const { width: w, height: h } = useWindowDimensions();
  const [p] = useState(() => new Animated.Value(0));
  const [fade] = useState(() => new Animated.Value(1));

  // Wordmark: starts as on the native splash, ends smaller over the bottom of the planet.
  const wm0 = w * 0.7;
  const wm1 = w * 0.64;
  const wmH0 = wm0 / WORDMARK_ASPECT;
  const wmScale = wm1 / wm0;

  // Artwork: a little wider than the screen; artwork + wordmark + tagline are
  // centred on the screen as a group.
  const A = w * 1.12;
  const artLeft = (w - A) / 2;
  const artTop = Math.max(h * 0.04, (h - (A * 0.93 + (wmH0 * wmScale) / 2 + 50)) / 2);
  const ix = artLeft + A * IMPACT.x;
  const iy = artTop + A * IMPACT.y;
  const endCY = artTop + A * 0.93;

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
          timer = setTimeout(finish, 1400);
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

  // Timeline (fractions of TOTAL_MS). Easing is baked into the ranges, since
  // interpolate easing isn't supported on the native driver.
  const HIT = 0.3;
  const artOpacity = p.interpolate({ inputRange: [0, 0.06, 0.26, 1], outputRange: [0, 0, 1, 1] });
  const artScale = p.interpolate({ inputRange: [0, 0.06, 0.16, 0.3, 1], outputRange: [1.18, 1.18, 1.1, 1.05, 1] });
  const move = p.interpolate({ inputRange: [0, 0.08, 0.14, 0.2, 0.26, 1], outputRange: [0, 0, 0.35, 0.75, 1, 1] });
  const wmY = move.interpolate({ inputRange: [0, 1], outputRange: [0, endCY - h / 2] });
  const wmS = move.interpolate({ inputRange: [0, 1], outputRange: [1, wmScale] });
  const flash = p.interpolate({ inputRange: [0, HIT, HIT + 0.015, HIT + 0.16, 1], outputRange: [0, 0, 0.75, 0, 0] });
  const glowScale = p.interpolate({ inputRange: [0, HIT, HIT + 0.1, HIT + 0.25, 1], outputRange: [0.3, 0.3, 1.25, 1, 1.05] });
  const glowOpacity = p.interpolate({ inputRange: [0, HIT, HIT + 0.03, HIT + 0.3, 1], outputRange: [0, 0, 1, 0.55, 0.45] });
  const shake = p.interpolate({
    inputRange: [0, HIT, HIT + 0.015, HIT + 0.03, HIT + 0.045, HIT + 0.06, 1],
    outputRange: [0, 0, -7, 6, -3, 0, 0],
  });
  const tagOpacity = p.interpolate({ inputRange: [0, 0.46, 0.6, 1], outputRange: [0, 0, 1, 1] });
  const tagY = p.interpolate({ inputRange: [0, 0.46, 0.6, 1], outputRange: [10, 10, 0, 0] });

  const glow = A * 0.62;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.screen, { opacity: fade }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={finish} accessibilityRole="button" accessibilityLabel={t('intro.skip')}>
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: shake }] }]}>
          {/* The impact artwork, faded into the background at the bottom. */}
          <Animated.View
            style={{
              position: 'absolute',
              left: artLeft,
              top: artTop,
              width: A,
              height: A,
              opacity: artOpacity,
              transform: [{ scale: artScale }],
            }}
          >
            <Image source={ART} style={{ width: A, height: A }} resizeMode="cover" />
            <Svg width={A} height={A} style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id="introFade" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={INTRO_BG} stopOpacity="0.9" />
                  <Stop offset="0.12" stopColor={INTRO_BG} stopOpacity="0" />
                  <Stop offset="0.66" stopColor={INTRO_BG} stopOpacity="0" />
                  <Stop offset="1" stopColor={INTRO_BG} stopOpacity="1" />
                </LinearGradient>
              </Defs>
              <Rect x={0} y={0} width={A} height={A} fill="url(#introFade)" />
            </Svg>
          </Animated.View>

          {/* The rings flare on impact. */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: ix - glow / 2,
              top: iy - glow / 2,
              width: glow,
              height: glow,
              opacity: glowOpacity,
              transform: [{ scaleY: 0.45 }, { scale: glowScale }],
            }}
          >
            <Svg width={glow} height={glow}>
              <Defs>
                <RadialGradient id="introGlow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.95" />
                  <Stop offset="0.2" stopColor="#FFE27A" stopOpacity="0.8" />
                  <Stop offset="0.55" stopColor="#FF7A1A" stopOpacity="0.35" />
                  <Stop offset="1" stopColor="#FF7A1A" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Circle cx={glow / 2} cy={glow / 2} r={glow / 2} fill="url(#introGlow)" />
            </Svg>
          </Animated.View>
        </Animated.View>

        <Animated.View style={[StyleSheet.absoluteFill, styles.flash, { opacity: flash }]} pointerEvents="none" />

        {/* Wordmark: starts exactly where the native splash drew it. */}
        <Animated.View
          style={{
            position: 'absolute',
            left: (w - wm0) / 2,
            top: h / 2 - wmH0 / 2,
            width: wm0,
            height: wmH0,
            transform: [{ translateY: wmY }, { scale: wmS }],
          }}
        >
          <Image source={WORDMARK} style={{ width: wm0, height: wmH0 }} resizeMode="contain" accessibilityLabel="Blast Radius" />
        </Animated.View>

        <Animated.View style={[styles.tagWrap, { top: endCY + (wmH0 * wmScale) / 2 + 12, opacity: tagOpacity, transform: [{ translateY: tagY }] }]}>
          <Text style={styles.tagline}>{t('intro.tagline')}</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: INTRO_BG, zIndex: 100 },
  flash: { backgroundColor: '#FFF1D6' },
  tagWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  tagline: { fontSize: 16, color: 'rgba(230,226,255,0.85)', fontFamily: fonts.bodyMedium, letterSpacing: 0.3 },
});
