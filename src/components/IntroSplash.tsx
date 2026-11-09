import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Pressable, StyleSheet, Text, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { t } from '../i18n/core';
import { fonts } from '../theme';

// The key art is split in two layers so the meteor can fly in: the Earth with
// the rings (the meteor painted out, edges faded out: the same image as the
// native launch screen), and the meteor with its tail and shards.
const PLATE = require('../../assets/splash-icon.png');
const METEOR = require('../../assets/brand/impact-meteor.png');

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

const TOTAL_MS = 3200;
/** Width of the art on the native launch screen (app.json `imageWidth`). */
const SPLASH_ART_WIDTH = 360;
/** The native splash colour (app.json), so the hand-over is seamless. */
export const INTRO_BG = '#06032B';

/**
 * The launch intro. It starts exactly where the native launch screen leaves
 * off (the Earth and its rings, centred, 360 pt wide, no text). The planet
 * settles into place, the rings calm, and the meteor streaks in from deep
 * space, growing as it comes closer, until it is right above the ground; the
 * rings flare up, then the wordmark and tagline rise in. A tap skips it.
 */
export function IntroSplash({ onDone }: { onDone: () => void }) {
  const { width: w, height: h } = useWindowDimensions();
  const [p] = useState(() => new Animated.Value(0));
  const [fade] = useState(() => new Animated.Value(1));

  // Artwork: a little wider than the screen; art + wordmark + tagline are
  // centred on the screen as a group.
  const A = w * 1.12;
  const WM_H = 92;
  const artLeft = (w - A) / 2;
  const artTop = Math.max(h * 0.04, (h - (A * 0.86 + WM_H + 40)) / 2);
  /** Top of the wordmark, over the bottom of the planet. */
  const wmTop = artTop + A * 0.84;
  // The art starts as drawn on the launch screen: centred, SPLASH_ART_WIDTH wide.
  const art0Scale = SPLASH_ART_WIDTH / A;
  const art0Y = h / 2 - (artTop + A / 2);

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
  // Settle from the launch-screen framing into place (ease-in-out, baked in).
  const move = p.interpolate({ inputRange: [0, 0.04, 0.1, 0.17, 0.24, 1], outputRange: [0, 0, 0.2, 0.75, 1, 1] });
  const artY = move.interpolate({ inputRange: [0, 1], outputRange: [art0Y, 0] });
  const artScale = p.interpolate({
    inputRange: [0, 0.04, 0.24, 0.4, 1],
    outputRange: [art0Scale, art0Scale, 1.025, 1.01, 1],
  });

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
  // The rings start lit as on the launch screen, calm while the meteor comes in, then flare.
  const ringsDim = p.interpolate({ inputRange: [0, 0.06, 0.18, HIT, HIT + 0.12, 1], outputRange: [0, 0, 1, 1, 0, 0] });
  const flash = p.interpolate({ inputRange: [0, HIT, HIT + 0.015, HIT + 0.14, 1], outputRange: [0, 0, 0.55, 0, 0] });
  const glowScale = p.interpolate({ inputRange: [0, HIT, HIT + 0.1, HIT + 0.25, 1], outputRange: [0.3, 0.3, 1.25, 1, 1.05] });
  const glowOpacity = p.interpolate({ inputRange: [0, HIT, HIT + 0.03, HIT + 0.3, 1], outputRange: [0, 0, 1, 0.5, 0.4] });
  const wmOpacity = p.interpolate({ inputRange: [0, 0.47, 0.6, 1], outputRange: [0, 0, 1, 1] });
  const wmRise = p.interpolate({ inputRange: [0, 0.47, 0.6, 1], outputRange: [14, 14, 0, 0] });
  const tagOpacity = p.interpolate({ inputRange: [0, 0.6, 0.72, 1], outputRange: [0, 0, 1, 1] });
  const tagY = p.interpolate({ inputRange: [0, 0.6, 0.72, 1], outputRange: [10, 10, 0, 0] });

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
            transform: [{ translateY: artY }, { scale: artScale }],
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

          {/* Fade the artwork's bottom into the wordmark area once it has settled
              (absent on the launch frame, so the hand-over is exact). */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: move }]} pointerEvents="none">
            <Svg width={A} height={A} pointerEvents="none">
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
        </Animated.View>

        <Animated.View style={[StyleSheet.absoluteFill, styles.flash, { opacity: flash }]} pointerEvents="none" />

        {/* Wordmark: crisp live type, rising in after the impact. */}
        <Animated.View
          style={[styles.tagWrap, { top: wmTop, opacity: wmOpacity, transform: [{ translateY: wmRise }] }]}
          accessible
          accessibilityLabel="Blast Radius"
        >
          <Text style={styles.wmBlast}>BLAST</Text>
          <Text style={styles.wmRadius}>RADIUS</Text>
        </Animated.View>

        <Animated.View style={[styles.tagWrap, { top: wmTop + WM_H + 8, opacity: tagOpacity, transform: [{ translateY: tagY }] }]}>
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
  wmBlast: {
    fontSize: 46,
    lineHeight: 50,
    color: '#FFFFFF',
    fontFamily: fonts.display,
    letterSpacing: 7,
    marginRight: -7,
    textShadowColor: 'rgba(140,110,255,0.55)',
    textShadowRadius: 18,
  },
  wmRadius: {
    fontSize: 19,
    lineHeight: 24,
    color: '#FF8A4A',
    fontFamily: fonts.display,
    letterSpacing: 13,
    marginRight: -13,
    textShadowColor: 'rgba(255,110,40,0.6)',
    textShadowRadius: 12,
  },
  tagline: { fontSize: 16, color: 'rgba(230,226,255,0.85)', fontFamily: fonts.bodyMedium, letterSpacing: 0.3, textAlign: 'center', paddingHorizontal: 28 },
});
