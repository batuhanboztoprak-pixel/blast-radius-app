import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CompositionIcon } from '../components/CompositionIcon';
import { LockIcon } from '../components/icons';
import { StepHeader } from '../components/ui';
import { t } from '../i18n/core';
import { formatDiameter, formatLd, formatShortDate, formatSpeed } from '../physics/format';
import type { RealAsteroid } from '../physics/neo';
import { usePremium } from '../state/premium';
import { useRealAsteroids } from '../state/realAsteroids';
import { useSimulation } from '../state/simulation';
import { useUnits } from '../state/units';
import { useUpsell } from '../upsell/upsell';
import { colors, fonts, radius } from '../theme';

/**
 * Every real asteroid passing Earth in the next 60 days (NASA/JPL). Today's is
 * free; the rest are Pro. Tapping one loads its real size and impact speed.
 */
export default function RealAsteroidsScreen() {
  const { list, today, source } = useRealAsteroids();
  const { realAsteroid, applyRealAsteroid } = useSimulation();
  const { isPro } = usePremium();
  const { units } = useUnits();
  const upsell = useUpsell();

  const pick = (a: RealAsteroid) => {
    const free = a.id === today?.id;
    if (!isPro && !free) {
      upsell.openPaywall('asteroids', 'asteroid-list');
      return;
    }
    Haptics.selectionAsync().catch(() => {});
    applyRealAsteroid(a);
    router.back();
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StepHeader
        step={t('real.listStep')}
        title={t('real.listTitle')}
        subtitle={t(source === 'nasa' ? 'real.listSubtitle' : 'real.listSubtitleOffline')}
        onBack={() => router.back()}
      />
      <FlatList
        data={list}
        keyExtractor={(a) => `${a.id}-${a.approachAt}`}
        contentContainerStyle={styles.list}
        renderItem={({ item: a }) => {
          const locked = !isPro && a.id !== today?.id;
          const on = realAsteroid?.id === a.id;
          return (
            <Pressable
              onPress={() => pick(a)}
              style={({ pressed }) => [styles.row, on && styles.rowOn, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel={locked ? t('chip.requiresPro', { label: a.name }) : a.name}
            >
              <CompositionIcon kind="rock" size={34} />
              <View style={styles.info}>
                <Text style={[styles.name, locked && styles.dim]} numberOfLines={1}>
                  {a.name}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {a.sizeEstimated ? '≈ ' : ''}
                  {formatDiameter(a.diameterM, units)} · {formatSpeed(a.impactVelocityMs, units)}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {t('real.passes', { date: formatShortDate(a.approachAt), ld: formatLd(a.distanceLd) })}
                </Text>
              </View>
              {a.id === today?.id && <Text style={styles.badge}>{t('real.todayBadge')}</Text>}
              {locked && <LockIcon size={14} color={colors.accent} />}
            </Pressable>
          );
        }}
        ListFooterComponent={<Text style={styles.footer}>{t('real.footer')}</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { paddingHorizontal: 20, paddingBottom: 32, gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 12,
  },
  rowOn: { borderColor: colors.accent },
  info: { flex: 1, minWidth: 0, gap: 1 },
  name: { fontSize: 15, color: colors.text, fontFamily: fonts.display },
  dim: { color: colors.muted },
  meta: { fontSize: 12, color: colors.muted, fontFamily: fonts.body },
  badge: { fontSize: 10, letterSpacing: 1, color: colors.accent, fontFamily: fonts.bodySemi },
  footer: { marginTop: 12, fontSize: 11, color: colors.dim, fontFamily: fonts.body, lineHeight: 16 },
});
