import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { t } from '../i18n/core';
import { colors, fonts, radius } from '../theme';
import { CloseIcon } from './icons';
import { PrimaryButton } from './ui';

/** Shown on the result screen after a preset's one free strike. */
export function FreeTryCard({ presetName, onUnlock }: { presetName: string; onUnlock: () => void }) {
  return (
    <View style={styles.freeTry}>
      <Text style={styles.freeTryTitle}>{t('freeTry.title', { preset: presetName })}</Text>
      <Text style={styles.freeTryBody}>{t('freeTry.body')}</Text>
      <PrimaryButton label={t('paywall.unlock')} onPress={onUnlock} style={styles.freeTryButton} />
    </View>
  );
}

/**
 * "Remove ads for good · $3.99", shown once a session after a full-screen ad.
 * Slides up unless Reduce Motion is on.
 */
export function AdNudgeCard({
  price,
  onPress,
  onDismiss,
}: {
  price: string;
  onPress: () => void;
  onDismiss: () => void;
}) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) progress.setValue(1);
        else Animated.timing(progress, { toValue: 1, duration: 260, useNativeDriver: true }).start();
      });
    return () => {
      cancelled = true;
    };
  }, [progress]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });

  return (
    <Animated.View style={[styles.nudge, { opacity: progress, transform: [{ translateY }] }]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [styles.nudgeMain, pressed && { opacity: 0.75 }]}
      >
        <Text style={styles.nudgeText} numberOfLines={2}>
          {t('nudge.removeAds', { price })}
        </Text>
      </Pressable>
      <Pressable
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel={t('nudge.dismissA11y')}
        hitSlop={10}
        style={styles.nudgeClose}
      >
        <CloseIcon size={18} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  freeTry: {
    backgroundColor: 'rgba(255,196,74,0.08)',
    borderColor: 'rgba(255,196,74,0.5)',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 14,
    gap: 6,
  },
  freeTryTitle: { fontSize: 15, color: colors.text, fontFamily: fonts.bodySemi },
  freeTryBody: { fontSize: 13, color: colors.muted, fontFamily: fonts.body, lineHeight: 18 },
  freeTryButton: { marginTop: 6, minHeight: 46 },
  nudge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: colors.surface,
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  nudgeMain: { flex: 1, minHeight: 48, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  nudgeText: { fontSize: 14, color: colors.text, fontFamily: fonts.bodySemi },
  nudgeClose: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center' },
});
