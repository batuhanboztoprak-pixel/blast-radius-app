import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';

import { WELCOME_KEY } from '../config';
import { t, type MessageKey } from '../i18n/core';
import { useUpsell } from '../upsell/upsell';
import { colors, fonts, radius } from '../theme';
import { PaywallArt } from './PaywallArt';
import { RING_STYLE } from './rings';
import { PrimaryButton } from './ui';


/** True if the welcome cards still need to be shown on this device. */
export async function needsWelcome(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(WELCOME_KEY)) !== '1';
  } catch {
    return false;
  }
}

const CARDS: { title: MessageKey; body: MessageKey; art: 'target' | 'asteroids' | 'cinematic' }[] = [
  { title: 'welcome.1.title', body: 'welcome.1.body', art: 'target' },
  { title: 'welcome.2.title', body: 'welcome.2.body', art: 'asteroids' },
  { title: 'welcome.3.title', body: 'welcome.3.body', art: 'cinematic' },
];

/**
 * Three swipeable cards shown once, right after the launch intro: how it
 * works, real NASA asteroids, and the cinematic strike (with a light Pro
 * mention). Skippable at any time.
 */
export function Welcome({ onDone }: { onDone: () => void }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const upsell = useUpsell();
  const [page, setPage] = useState(0);
  const [fade] = useState(() => new Animated.Value(1));
  const scroll = useRef<ScrollView>(null);
  const last = page === CARDS.length - 1;

  useEffect(() => {
    AsyncStorage.setItem(WELCOME_KEY, '1').catch(() => {});
  }, []);

  const finish = (then?: () => void) => {
    Animated.timing(fade, { toValue: 0, duration: 260, useNativeDriver: true }).start(() => {
      onDone();
      then?.();
    });
  };

  const next = () => {
    if (last) return finish();
    scroll.current?.scrollTo({ x: width * (page + 1), animated: true });
    setPage(page + 1);
  };

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.screen, { opacity: fade, paddingTop: insets.top, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.top}>
        <Pressable onPress={() => finish()} hitSlop={12} accessibilityRole="button">
          <Text style={styles.skip}>{t('welcome.skip')}</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scroll}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        style={styles.pager}
      >
        {CARDS.map((c) => (
          <View key={c.title} style={[styles.page, { width }]}>
            <View style={styles.art}>
              {c.art === 'target' ? <TargetArt width={width - 48} /> : <PaywallArt feature={c.art} width={width - 48} />}
            </View>
            <Text style={styles.title}>{t(c.title)}</Text>
            <Text style={styles.body}>{t(c.body)}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots} accessibilityElementsHidden>
        {CARDS.map((c, i) => (
          <View key={c.title} style={[styles.dot, i === page && styles.dotOn]} />
        ))}
      </View>
      <View style={styles.footer}>
        <PrimaryButton label={t(last ? 'welcome.start' : 'welcome.next')} onPress={next} />
        <Pressable
          onPress={() => finish(() => upsell.openPaywall('cinematic', 'welcome'))}
          style={[styles.proLink, !last && styles.hidden]}
          disabled={!last}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Text style={styles.proText}>{t('welcome.seePro')}</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

/** A pin dropped on a city, with the damage rings around it. */
function TargetArt({ width }: { width: number }) {
  const H = 150;
  const cx = width / 2;
  const cy = H * 0.56;
  return (
    <Svg width={width} height={H}>
      <Rect x={8} y={6} width={width - 16} height={H - 12} rx={radius.lg} fill="#162036" />
      <G stroke="rgba(139,146,168,0.18)" strokeWidth={1}>
        {[0.25, 0.45, 0.65, 0.85].map((f) => (
          <Line key={`h${f}`} x1={8} y1={H * f} x2={width - 8} y2={H * f} />
        ))}
        {[0.2, 0.4, 0.6, 0.8].map((f) => (
          <Line key={`v${f}`} x1={width * f} y1={6} x2={width * f} y2={H - 6} />
        ))}
      </G>
      <Path d={`M 8 ${H * 0.7} Q ${width * 0.3} ${H * 0.55} ${width * 0.55} ${H * 0.78} T ${width - 8} ${H * 0.62}`} stroke="rgba(74,158,255,0.35)" strokeWidth={6} fill="none" />
      <Circle cx={cx} cy={cy} r={58} fill={RING_STYLE.windows.fill} stroke={RING_STYLE.windows.stroke} strokeWidth={1.5} />
      <Circle cx={cx} cy={cy} r={34} fill={RING_STYLE.severe.fill} stroke={RING_STYLE.severe.stroke} strokeWidth={1.5} />
      <Circle cx={cx} cy={cy} r={9} fill={RING_STYLE.crater.fill} stroke={RING_STYLE.crater.stroke} strokeWidth={1.5} />
      {/* Map pin */}
      <Path d={`M ${cx} ${cy - 2} C ${cx - 12} ${cy - 18} ${cx - 14} ${cy - 30} ${cx} ${cy - 40} C ${cx + 14} ${cy - 30} ${cx + 12} ${cy - 18} ${cx} ${cy - 2} Z`} fill={colors.accent} />
      <Circle cx={cx} cy={cy - 27} r={4.5} fill="#FFFFFF" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg, zIndex: 90 },
  top: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingVertical: 10 },
  skip: { fontSize: 15, color: colors.muted, fontFamily: fonts.bodyMedium },
  pager: { flexGrow: 0 },
  page: { paddingHorizontal: 24, paddingTop: 24, alignItems: 'center' },
  art: { height: 170, justifyContent: 'center', marginBottom: 28 },
  title: { fontSize: 28, lineHeight: 34, color: colors.text, fontFamily: fonts.display, textAlign: 'center' },
  body: { marginTop: 12, fontSize: 16, lineHeight: 23, color: colors.muted, fontFamily: fonts.body, textAlign: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 'auto', marginBottom: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotOn: { width: 22, backgroundColor: colors.accent },
  footer: { paddingHorizontal: 20, gap: 14, alignItems: 'stretch' },
  proLink: { alignSelf: 'center' },
  proText: { fontSize: 14, color: colors.accent, fontFamily: fonts.bodySemi },
  hidden: { opacity: 0 },
});
