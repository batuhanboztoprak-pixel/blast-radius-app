import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Ring } from '../physics/impact';
import { colors, fonts } from '../theme';
import { LockIcon } from './icons';
import { RING_STYLE } from './rings';

interface Props {
  rings: Ring[];
  /** Show a locked "burns" row that opens the paywall. */
  onLockedThermal?: () => void;
}

export function RingLegend({ rings, onLockedThermal }: Props) {
  if (rings.length === 0 && !onLockedThermal) return null;
  // Smallest first reads naturally: crater → shockwave → windows.
  const ordered = [...rings].reverse();
  return (
    <View style={styles.legend}>
      {ordered.map((r) => (
        <View key={r.kind} style={styles.row}>
          <View style={[styles.dot, { backgroundColor: RING_STYLE[r.kind].color }]} />
          <Text style={styles.text}>{RING_STYLE[r.kind].label}</Text>
        </View>
      ))}
      {onLockedThermal && (
        <Pressable
          onPress={onLockedThermal}
          accessibilityRole="button"
          accessibilityLabel="Thermal burns ring, requires Pro"
          style={styles.row}
          hitSlop={8}
        >
          <LockIcon size={10} color={colors.muted} />
          <Text style={[styles.text, { color: colors.muted }]}>{RING_STYLE.thermal.label}</Text>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { fontSize: 11, color: colors.text, fontFamily: fonts.bodyMedium },
});
