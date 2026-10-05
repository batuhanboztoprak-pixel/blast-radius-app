import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { t } from '../i18n/core';
import { formatDiameter, formatLd, formatShortDate, formatSpeed } from '../physics/format';
import { usePremium } from '../state/premium';
import { useRealAsteroids } from '../state/realAsteroids';
import { useSimulation } from '../state/simulation';
import { useUnits } from '../state/units';
import { useUpsell } from '../upsell/upsell';
import { colors, fonts, radius } from '../theme';
import { CompositionIcon } from './CompositionIcon';
import { LockIcon } from './icons';

/**
 * "Today's real asteroid" from NASA/JPL, free for everyone: one tap loads its
 * real size and impact speed. "All upcoming" opens the full list (Pro).
 */
export function RealAsteroidCard() {
  const { today, list, source } = useRealAsteroids();
  const { realAsteroid, applyRealAsteroid } = useSimulation();
  const { units } = useUnits();
  const { isPro } = usePremium();
  const upsell = useUpsell();
  if (!today) return null;
  const selected = realAsteroid?.id === today.id;

  return (
    <View style={[styles.card, selected && styles.cardOn]}>
      <View style={styles.row}>
        <CompositionIcon kind="rock" size={40} />
        <View style={styles.info}>
          <Text style={styles.kicker} numberOfLines={1}>
            {t(source === 'nasa' ? 'real.kicker' : 'real.kickerOffline')}
          </Text>
          <Text style={styles.name} numberOfLines={1}>
            {today.name}
          </Text>
          <Text style={styles.meta} numberOfLines={2}>
            {today.sizeEstimated ? '≈ ' : ''}
            {formatDiameter(today.diameterM, units)} · {formatSpeed(today.impactVelocityMs, units)} ·{' '}
            {t('real.passes', { date: formatShortDate(today.approachAt), ld: formatLd(today.distanceLd) })}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            applyRealAsteroid(today);
          }}
          style={[styles.use, selected && styles.useOn]}
          accessibilityRole="button"
          accessibilityState={{ selected }}
          accessibilityLabel={t('real.useA11y', { name: today.name })}
          hitSlop={6}
        >
          <Text style={[styles.useText, selected && styles.useTextOn]}>{selected ? t('real.selected') : t('real.use')}</Text>
        </Pressable>
      </View>
      {selected && <Text style={styles.hint}>{t('real.pickPlace')}</Text>}
      {list.length > 1 && (
        <Pressable
          onPress={() => (isPro ? router.push('/asteroids') : upsell.openPaywall('asteroids', 'asteroid-list'))}
          style={styles.more}
          accessibilityRole="button"
          hitSlop={6}
        >
          {!isPro && <LockIcon size={11} color={colors.accent} />}
          <Text style={styles.moreText}>{t('real.allUpcoming', { n: list.length })}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  cardOn: { borderColor: colors.accent },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  info: { flex: 1, minWidth: 0 },
  kicker: { fontSize: 10, letterSpacing: 1.2, color: colors.accent, fontFamily: fonts.bodySemi },
  name: { fontSize: 15, color: colors.text, fontFamily: fonts.display },
  meta: { fontSize: 11, color: colors.muted, fontFamily: fonts.body },
  use: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  useOn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.accent },
  useText: { fontSize: 13, color: colors.onAccent, fontFamily: fonts.bodySemi },
  useTextOn: { color: colors.accent },
  hint: { fontSize: 12, color: colors.text, fontFamily: fonts.bodyMedium },
  more: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  moreText: { fontSize: 12, color: colors.accent, fontFamily: fonts.bodySemi },
});
