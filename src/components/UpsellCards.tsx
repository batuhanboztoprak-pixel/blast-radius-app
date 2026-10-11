import { StyleSheet, Text, View } from 'react-native';

import { t } from '../i18n/core';
import { colors, fonts, radius } from '../theme';
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
});
