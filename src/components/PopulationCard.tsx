import { Pressable, StyleSheet, Text, View } from 'react-native';

import { t, tPlural } from '../i18n/core';
import { dec, formatPeople } from '../physics/format';
import { WORLD_POPULATION } from '../population/casualties';
import type { Strike } from '../state/world';
import { colors, fonts, radius } from '../theme';

interface Props {
  strike: Strike | null;
  survivors: number;
  strikes: number;
  onReset: () => void;
}

/** Casualties from this strike plus the running world-population counter. */
export function PopulationCard({ strike, survivors, strikes, onReset }: Props) {
  const share = survivors / WORLD_POPULATION;
  const impact = strike?.impact;
  const global = impact && impact.globalDeaths > 0.5;

  return (
    <View style={styles.card}>
      {impact && (
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={styles.kicker}>{t('population.casualties')}</Text>
            <Text style={styles.big}>{formatPeople(impact.localCasualties)}</Text>
            <Text style={styles.hint}>{t('population.casualtiesHint')}</Text>
          </View>
          {global && (
            <View style={styles.flex}>
              <Text style={[styles.kicker, { color: colors.accent }]}>{t('population.worldwide')}</Text>
              <Text style={[styles.big, { color: colors.accent }]}>{formatPeople(impact.globalDeaths)}</Text>
              <Text style={styles.hint}>
                {t('population.worldwideHint', { pct: Math.round(impact.globalFraction * 100) })}
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.divider} />

      <View style={styles.worldHeader}>
        <Text style={styles.kicker}>{t('population.worldLeft')}</Text>
        {strikes > 0 && (
          <Pressable onPress={onReset} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('population.resetA11y')}>
            <Text style={styles.reset}>{t('population.reset')}</Text>
          </Pressable>
        )}
      </View>
      <Text style={styles.world} adjustsFontSizeToFit numberOfLines={1}>
        {formatPeople(survivors)}
      </Text>
      <View style={styles.bar} accessibilityLabel={t('population.barA11y', { pct: dec(share * 100, 1) })}>
        <View style={[styles.fill, { width: `${Math.max(share * 100, share > 0 ? 0.5 : 0)}%` as `${number}%` }]} />
      </View>
      <Text style={styles.hint}>
        {strikes === 0
          ? t('population.intro')
          : tPlural('plural.strikes', strikes, { pct: dec(share * 100, share < 0.01 ? 3 : 1) })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 14,
    gap: 6,
  },
  row: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1, gap: 2 },
  kicker: { fontSize: 11, letterSpacing: 1.2, color: colors.muted, fontFamily: fonts.bodySemi },
  big: { fontSize: 22, color: colors.text, fontFamily: fonts.display },
  hint: { fontSize: 11, color: colors.dim, fontFamily: fonts.body, lineHeight: 15 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 6 },
  worldHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reset: { fontSize: 12, color: colors.blue, fontFamily: fonts.bodySemi },
  world: { fontSize: 28, color: colors.text, fontFamily: fonts.display },
  bar: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.blue },
});
