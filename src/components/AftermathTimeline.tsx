import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { t, type MessageKey } from '../i18n/core';
import type { Stage } from '../physics/aftermath';
import { dec, formatArea, formatDistance, formatDuration, formatTempDrop, type Units } from '../physics/format';
import { colors, fonts, radius } from '../theme';
import { LockIcon } from './icons';
import { PrimaryButton } from './ui';

interface Props {
  stages: Stage[];
  units: Units;
  /** Pro stages are readable (Pro, or unlocked for this strike). */
  unlocked: boolean;
  onUnlock: () => void;
}

/**
 * "What happens next": a row of stages from second 0 to years later, and the
 * facts for the selected one. Free users read the first minutes; later stages
 * show a lock and open the paywall.
 */
export function AftermathTimeline({ stages, units, unlocked, onUnlock }: Props) {
  const [selected, setSelected] = useState(stages[0]?.id ?? 'impact');
  const stage = stages.find((s) => s.id === selected) ?? stages[0];
  if (!stage) return null;
  const locked = stage.pro && !unlocked;

  const fill = (f: Stage['facts'][number]) => {
    const params: Record<string, string> = {};
    if (f.dist !== undefined) params.dist = formatDistance(f.dist, units);
    if (f.time !== undefined) params.time = formatDuration(f.time);
    if (f.area !== undefined) params.area = formatArea(f.area, units);
    if (f.drop !== undefined) params.drop = formatTempDrop(f.drop, units);
    if (f.m !== undefined) params.m = dec(f.m, 1);
    return t(f.key as MessageKey, params);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.header}>{t('af.header')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.track}>
        {stages.map((s, i) => {
          const on = s.id === stage.id;
          const lock = s.pro && !unlocked;
          const name = t(`af.stage.${s.id}`);
          return (
            <Pressable
              key={s.id}
              onPress={() => setSelected(s.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={lock ? t('af.lockA11y', { stage: name }) : name}
              style={styles.step}
            >
              <View style={styles.dotRow}>
                <View style={[styles.line, i === 0 && styles.hidden]} />
                <View style={[styles.dot, on && styles.dotOn, lock && styles.dotLocked]}>
                  {lock && <LockIcon size={9} color={on ? colors.onAccent : colors.muted} />}
                </View>
                <View style={[styles.line, i === stages.length - 1 && styles.hidden]} />
              </View>
              <Text style={[styles.stepName, on && styles.stepNameOn]} numberOfLines={1}>
                {name}
              </Text>
              <Text style={styles.stepWhen} numberOfLines={1}>
                {t(`af.when.${s.id}`)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={[styles.card, locked && styles.cardLocked]}>
        {locked ? (
          <>
            <View style={styles.lockTitle}>
              <LockIcon size={14} color={colors.accent} />
              <Text style={styles.cardTitle}>{t('af.locked.title')}</Text>
            </View>
            <Text style={styles.fact}>{t('af.locked.body')}</Text>
            <PrimaryButton label={t('af.locked.button')} onPress={onUnlock} style={styles.unlock} />
          </>
        ) : (
          <>
            <Text style={styles.cardTitle}>
              {t(`af.stage.${stage.id}`)} · <Text style={styles.cardWhen}>{t(`af.when.${stage.id}`)}</Text>
            </Text>
            {stage.facts.map((f) => (
              <Text key={f.key} style={styles.fact}>
                {fill(f)}
              </Text>
            ))}
            {stage.facts.some((f) => f.key === 'af.climate.winter') && (
              <Text style={styles.source}>{t('af.source')}</Text>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  header: { fontSize: 12, letterSpacing: 1.5, color: colors.muted, fontFamily: fonts.bodySemi },
  track: { paddingVertical: 2 },
  step: { width: 92, alignItems: 'center', gap: 3 },
  dotRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  line: { flex: 1, height: 2, backgroundColor: colors.border },
  hidden: { opacity: 0 },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  dotLocked: { borderColor: colors.dim },
  stepName: { fontSize: 12, color: colors.muted, fontFamily: fonts.bodySemi, maxWidth: 88 },
  stepNameOn: { color: colors.text },
  stepWhen: { fontSize: 10, color: colors.dim, fontFamily: fonts.body, maxWidth: 88 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 14,
    gap: 8,
  },
  cardLocked: { borderColor: 'rgba(255,107,74,0.5)' },
  lockTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { fontSize: 15, color: colors.text, fontFamily: fonts.bodySemi },
  cardWhen: { color: colors.muted, fontFamily: fonts.body },
  fact: { fontSize: 13, color: colors.text, fontFamily: fonts.body, lineHeight: 19 },
  source: { fontSize: 11, color: colors.dim, fontFamily: fonts.body },
  unlock: { marginTop: 4, minHeight: 46 },
});
