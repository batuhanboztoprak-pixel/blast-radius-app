import { Pressable, StyleSheet, Text, View } from 'react-native';

import { t } from '../i18n/core';
import type { Ring } from '../physics/impact';
import { colors, fonts } from '../theme';
import { LockIcon } from './icons';
import { RING_STYLE, ringLabel } from './rings';

interface Props {
  rings: Ring[];
  /** Tap a row to zoom to that ring; tap it again to see every ring. */
  selected?: Ring['kind'] | null;
  onSelect?: (kind: Ring['kind'] | null) => void;
  /** Show a locked "burns" row that opens the paywall. */
  onLockedThermal?: () => void;
}

export function RingLegend({ rings, selected = null, onSelect, onLockedThermal }: Props) {
  if (rings.length === 0 && !onLockedThermal) return null;
  // Smallest first reads naturally: crater → shockwave → windows.
  const ordered = [...rings].reverse();
  return (
    <View style={styles.legend}>
      {ordered.map((r) => {
        const active = selected === r.kind;
        return (
          <Pressable
            key={r.kind}
            onPress={onSelect ? () => onSelect(active ? null : r.kind) : undefined}
            disabled={!onSelect}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={t(active ? 'legend.showAllA11y' : 'legend.zoomA11y', { ring: ringLabel(r.kind) })}
            hitSlop={6}
            style={[styles.row, active && styles.active]}
          >
            <View style={[styles.dot, { backgroundColor: RING_STYLE[r.kind].color }]} />
            <Text style={[styles.text, active && { color: RING_STYLE[r.kind].color }]}>
              {ringLabel(r.kind)}
            </Text>
          </Pressable>
        );
      })}
      {onSelect && rings.length > 1 && (
        <Text style={styles.tip}>{t(selected ? 'legend.tapAgain' : 'legend.tapToZoom')}</Text>
      )}
      {onLockedThermal && (
        <Pressable
          onPress={onLockedThermal}
          accessibilityRole="button"
          accessibilityLabel={t('legend.thermalLockedA11y')}
          style={styles.row}
          hitSlop={8}
        >
          <LockIcon size={10} color={colors.muted} />
          <Text style={[styles.text, { color: colors.muted }]}>{ringLabel('thermal')}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    backgroundColor: 'rgba(11,14,23,0.88)',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 5,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 6, paddingVertical: 1, paddingHorizontal: 2 },
  active: { backgroundColor: 'rgba(255,255,255,0.08)' },
  tip: { fontSize: 10, color: colors.dim, fontFamily: fonts.body, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { fontSize: 11, color: colors.text, fontFamily: fonts.bodyMedium },
});
