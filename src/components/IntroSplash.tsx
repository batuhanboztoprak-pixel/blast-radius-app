import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Pressable, StyleSheet, Text, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { t } from '../i18n/core';
import { fonts } from '../theme';

// The key art is split in two layers so the meteor can fly in: the Earth with
// the rings (the meteor painted out), and the meteor with its tail and shards.
const PLATE = require('../../assets/brand/impact-plate.jpg');
const METEOR = require('../../assets/brand/impact-meteor.png');
const WORDMARK = require('../../assets/brand/wordmark.png');
const WORDMARK_ASPECT = 1543 / 488;

// Positions in the artwork, as fractions of its size.
/** The meteor layer's box. */
const MET = { x: 395 / 1024, y: 0, w: 629 / 1024, h: 557 / 1024 };
/** Centre of the rock: the meteor grows from here as it comes closer. */
const ROCK = { x: 0.5965, y: 0.3573 };
/** Where the rings are centred, and their extent. */
const RINGS = { x: 0.502, y: 0.558, rx: 0.4, ry: 0.2 };
/** The glowing impact point just under the rock. */
const IMPACT = { x: 0.502, y: 0.518 };
/** Unit vector from the rock back along its tail (up and to the right). */
const TAIL = { x: 0.668, y: -0.744 };

const TOTAL_MS = 3600;
const SPLASH_WORDMARK_WIDTH = 280;
/** The native splash colour (app.json), so the hand-over is seamless. */
export const INTRO_BG = '#0A0340';

/**
 * The launch intro. It starts exactly where the native splash leaves off (the
 * wordmark, centred, 280 pt wide). Then the Earth rises in behind it and the
 * meteor streaks in from deep space, growing as it comes closer, until it is
 * right above the ground; the rings flare up and the tagline appears. A tap
 * skips it.
 */
export function IntroSplash({ onDone }: { onDone: () => void }) {
  const { width: w, height: h } = useWindowDimensions();
  const [p] = useState(() => new Animated.Value(0));
  const [fade] = useState(() => new Animated.Value(1));

  // Wordmark: starts as on the native splash, ends over the bottom of the planet.
  const wm0 = SPLASH_WORDMARK_WIDTH;
  const wm1 = Math.min(w * 0.64, 300);
  const wmH0 = wm0 / WORDMARK_ASPECT;
  const wmScale = wm1 / wm0;

  // Artwork: a little wider than the screen; art + wordmark + tagline are
  // centred on the screen as a group.
  const A = w * 1.12;
  const artLeft = (w - A) / 2;
  const artTop = Math.max(h * 0.04, (h - (A * 0.93 + (wmH0 * wmScale) / 2 + 50)) / 2);
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
  const HIT = 0.4;
  const artOpacity = p.interpolate({ inputRange: [0, 0.05, 0.22, 1], outputRange: [0, 0, 1, 1] });
  const artScale = p.interpolate({ inputRange: [0, 0.05, 0.2, 0.4, 1], outputRange: [1.12, 1.12, 1.06, 1.025, 1] });
  const move = p.interpolate({ inputRange: [0, 0.07, 0.13, 0.19, 0.25, 1], outputRange: [0, 0, 0.35, 0.75, 1, 1] });
  const wmY = move.interpolate({ inputRange: [0, 1], outputRange: [0, endCY - h / 2] });
  const wmS = move.interpolate({ inputRange: [0, 1], outputRange: [1, wmScale] });

  // The meteor: far away and small, then faster and bigger (ease-in), stopping
  // just above the ground; afterwards it keeps creeping in a touch.
  const KF = [0, 0.1, 0.17, 0.24, 0.3, 0.35, HIT, 1];
  const AP = [0, 0, 0.12, 0.3, 0.52, 0.76, 1, 1];
  const approach = p.interpolate({ inputRange: KF, outputRange: AP });
  const D = A * 0.55;
  const creep = A * 0.014;
  const along = (k: number) =>
    KF.map((q, i) => (q >= HIT ? -k * creep * ((q - HIT) / (1 - HIT)) : k * D * (1 - AP[i])));
  const meteorX = p.interpolate({ inputRange: KF, outputRange: along(TAIL.x) });
  const meteorY = p.interpolate({ inputRange: KF, outputRange: along(TAIL.y) });
  const meteorScale = approach.interpolate({ inputRange: [0, 1], outputRange: [0.28, 1] });
  const meteorOpacity = p.interpolate({ inputRange: [0, 0.1, 0.15, 1], outputRange: [0, 0, 1, 1] });

  // Impact: the rings light up, a flash, the impact point flares.
  const ringsDim = p.interpolate({ inputRange: [0, HIT, HIT + 0.12, 1], outputRange: [1, 1, 0, 0] });
  const flash = p.interpolate({ inputRange: [0, HIT, HIT + 0.015, HIT + 0.14, 1], outputRange: [0, 0, 0.55, 0, 0] });
  const glowScale = p.interpolate({ inputRange: [0, HIT, HIT + 0.1, HIT + 0.25, 1], outputRange: [0.3, 0.3, 1.25, 1, 1.05] });
  const glowOpacity = p.interpolate({ inputRange: [0, HIT, HIT + 0.03, HIT + 0.3, 1], outputRange: [0, 0, 1, 0.5, 0.4] });
  const tagOpacity = p.interpolate({ inputRange: [0, 0.55, 0.68, 1], outputRange: [0, 0, 1, 1] });
  const tagY = p.interpolate({ inputRange: [0, 0.55, 0.68, 1], outputRange: [10, 10, 0, 0] });

  const glow = A * 0.62;
  const dimW = A * RINGS.rx * 2.3;
  const dimH = A * RINGS.ry * 2.3;
  const metW = A * MET.w;
  const metH = A * MET.h;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.screen, { opacity: fade }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={finish} accessibilityRole="button" accessibilityLabel={t('intro.skip')}>
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
          {/* The Earth and the rings. */}
          <Image source={PLATE} style={{ width: A, height: A }} resizeMode="cover" />

          {/* Before impact the rings are only faint. */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: A * RINGS.x - dimW / 2,
              top: A * RINGS.y - dimH / 2,
              width: dimW,
              height: dimH,
              opacity: ringsDim,
            }}
          >
            <Svg width={dimW} height={dimH}>
              <Defs>
                <RadialGradient id="introDim" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor="#1A0E62" stopOpacity="0.88" />
                  <Stop offset="0.72" stopColor="#1A0E62" stopOpacity="0.8" />
                  <Stop offset="1" stopColor="#1A0E62" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Ellipse cx={dimW / 2} cy={dimH / 2} rx={dimW / 2} ry={dimH / 2} fill="url(#introDim)" />
            </Svg>
          </Animated.View>

          {/* The rings flare on impact. */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: A * IMPACT.x - glow / 2,
              top: A * IMPACT.y - glow / 2,
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

          {/* The meteor, growing from its rock centre as it comes in. */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: A * MET.x,
              top: A * MET.y,
              width: metW,
              height: metH,
              opacity: meteorOpacity,
              transformOrigin: [A * (ROCK.x - MET.x), A * (ROCK.y - MET.y), 0],
              transform: [{ translateX: meteorX }, { translateY: meteorY }, { scale: meteorScale }],
            }}
          >
            <Image source={METEOR} style={{ width: metW, height: metH }} resizeMode="stretch" />
          </Animated.View>

          {/* Fade the artwork's top and bottom edges into the background. */}
          <Svg width={A} height={A} style={StyleSheet.absoluteFill} pointerEvents="none">
            <Defs>
              <LinearGradient id="introFade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={INTRO_BG} stopOpacity="0.6" />
                <Stop offset="0.1" stopColor={INTRO_BG} stopOpacity="0" />
                <Stop offset="0.66" stopColor={INTRO_BG} stopOpacity="0" />
                <Stop offset="1" stopColor={INTRO_BG} stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={A} height={A} fill="url(#introFade)" />
          </Svg>
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
