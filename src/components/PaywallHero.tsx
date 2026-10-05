import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

// The same key art as the app icon and the launch intro: the Earth with its
// rings, and the meteor as a separate layer so it can hover.
const PLATE = require('../../assets/brand/impact-plate.jpg');
const METEOR = require('../../assets/brand/impact-meteor.png');
/** The meteor layer's box in the artwork, as fractions of its size. */
const MET = { x: 395 / 1024, y: 0, w: 629 / 1024, h: 557 / 1024 };
/** Ring centre and the glowing impact point. */
const RINGS = { x: 0.502, y: 0.558 };
const IMPACT = { x: 0.502, y: 0.518 };
/** Unit vector from the rock back along its tail. */
const TAIL = { x: 0.668, y: -0.744 };

/** The paywall's page colour: deep brand indigo. The hero fades into it. */
export const PAYWALL_BG = '#0A0628';

/**
 * The paywall header: the brand key art with the meteor hovering just above
 * the impact point and the rings breathing, fading into the page at the bottom.
 */
export function PaywallHero({ width, height }: { width: number; height: number }) {
  const A = width * 1.05;
  const artLeft = (width - A) / 2;
  const artTop = height * 0.66 - A * RINGS.y;
  const [t] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled || reduce) return;
        loop = Animated.loop(
          Animated.sequence([
            Animated.timing(t, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(t, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]),
        );
        loop.start();
      });
    return () => {
      cancelled = true;
      loop?.stop();
    };
  }, [t]);

  // The meteor drifts a few points back along its tail and returns.
  const drift = A * 0.014;
  const meteorStyle = {
    transform: [
      { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, TAIL.x * drift] }) },
      { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, TAIL.y * drift] }) },
    ],
  };
  const glowStyle = {
    opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.85, 0.45] }),
    transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 0.92] }) }],
  };
  const glowR = A * 0.2;

  return (
    <View style={{ width, height, overflow: 'hidden' }} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Image source={PLATE} style={{ position: 'absolute', left: artLeft, top: artTop, width: A, height: A }} />
      <Animated.View
        style={[
          { position: 'absolute', left: artLeft + IMPACT.x * A - glowR, top: artTop + IMPACT.y * A - glowR, width: glowR * 2, height: glowR * 2 },
          glowStyle,
        ]}
      >
        <Svg width={glowR * 2} height={glowR * 2}>
          <Defs>
            <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#FFE8A0" stopOpacity={0.9} />
              <Stop offset="0.35" stopColor="#FF8A3D" stopOpacity={0.45} />
              <Stop offset="1" stopColor="#FF3D7F" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width={glowR * 2} height={glowR * 2} fill="url(#glow)" />
        </Svg>
      </Animated.View>
      <Animated.Image
        source={METEOR}
        style={[
          { position: 'absolute', left: artLeft + MET.x * A, top: artTop + MET.y * A, width: MET.w * A, height: MET.h * A },
          meteorStyle,
        ]}
      />
      {/* Fades: a little at the top for the close button, fully into the page at the bottom. */}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={PAYWALL_BG} stopOpacity={0.55} />
            <Stop offset="0.22" stopColor={PAYWALL_BG} stopOpacity={0} />
            <Stop offset="0.62" stopColor={PAYWALL_BG} stopOpacity={0} />
            <Stop offset="1" stopColor={PAYWALL_BG} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#fade)" />
      </Svg>
    </View>
  );
}
