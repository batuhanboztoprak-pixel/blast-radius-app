import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { t } from '../i18n/core';
import { colors, fonts, radius } from '../theme';
import { BackIcon, LockIcon } from './icons';

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function PrimaryButton({ label, onPress, disabled, loading, style }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.primary,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.onAccent} />
      ) : (
        <Text style={styles.primaryLabel}>{label}</Text>
      )}
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress, disabled, style }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.secondary, pressed && styles.pressed, style]}
    >
      <Text style={styles.secondaryLabel}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({
  onPress,
  label,
  children,
}: {
  onPress: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

export function StepHeader({
  step,
  title,
  subtitle,
  onBack,
}: {
  step: string;
  title: string;
  subtitle?: string;
  onBack?: () => void;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.stepRow}>
        {onBack && (
          <IconButton onPress={onBack} label={t('common.back')}>
            <BackIcon />
          </IconButton>
        )}
        <Text style={styles.step}>{step}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function Chip({
  label,
  selected,
  locked,
  onPress,
  style,
}: {
  label: string;
  selected?: boolean;
  locked?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={locked ? t('chip.requiresPro', { label }) : label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.pressed,
        style,
      ]}
    >
      {locked && <LockIcon />}
      <Text
        style={[
          styles.chipLabel,
          selected && styles.chipLabelSelected,
          locked && { color: colors.dim },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} adjustsFontSizeToFit numberOfLines={1}>
        {value}
      </Text>
      {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  primary: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    minHeight: 54,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: { color: colors.onAccent, fontSize: 16, fontFamily: fonts.bodySemi, fontWeight: '700' },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    minHeight: 54,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: { color: colors.text, fontSize: 15, fontFamily: fonts.bodySemi },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.75 },
  iconButton: { minWidth: 32, minHeight: 32, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, gap: 4 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32 },
  step: { fontSize: 12, letterSpacing: 2, color: colors.accent, fontFamily: fonts.bodySemi },
  title: { fontSize: 26, color: colors.text, fontFamily: fonts.display },
  subtitle: { fontSize: 14, color: colors.muted, fontFamily: fonts.body },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 46,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: { backgroundColor: 'rgba(255,107,74,0.12)', borderColor: colors.accent, borderWidth: 1.5 },
  chipLabel: { fontSize: 13, color: colors.muted, fontFamily: fonts.bodySemi },
  chipLabelSelected: { color: colors.accent },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 14,
    gap: 4,
  },
  statLabel: { fontSize: 11, letterSpacing: 0.5, color: colors.muted, fontFamily: fonts.bodySemi },
  statValue: { fontSize: 20, color: colors.text, fontFamily: fonts.display },
  statHint: { fontSize: 11, color: colors.dim, fontFamily: fonts.body },
});
