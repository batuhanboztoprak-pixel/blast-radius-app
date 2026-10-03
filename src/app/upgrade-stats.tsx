import { Redirect, router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StepHeader } from '../components/ui';
import { t } from '../i18n/core';
import { usePremium } from '../state/premium';
import { UPGRADE_SOURCES, type UpgradeStats } from '../upsell/entitlements';
import { useUpsell } from '../upsell/upsell';
import { colors, fonts, radius } from '../theme';

/**
 * Hidden counters of which prompt opened the paywall and which led to a purchase.
 * Dev builds only: long-press the paywall title. Nothing leaves the device.
 */
export default function UpgradeStatsScreen() {
  const { stats, resetStats, state, resetForTesting } = useUpsell();
  const { devPro, setDevPro } = usePremium();
  if (!__DEV__) return <Redirect href="/" />;

  const rows = (bucket: keyof UpgradeStats) =>
    Object.entries(stats[bucket]).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
  const conversion = UPGRADE_SOURCES.filter((s) => stats.opened[s]).map((s) => ({
    source: s,
    opened: stats.opened[s] ?? 0,
    purchased: stats.purchased[s] ?? 0,
  }));

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StepHeader step="DEV" title={t('debug.title')} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.body}>
        <Section title="TESTING">
          <View style={styles.row}>
            <Text style={styles.key}>Act as Pro (no ads, everything unlocked)</Text>
            <Switch value={devPro} onValueChange={setDevPro} />
          </View>
          <Pressable onPress={resetForTesting} accessibilityRole="button">
            <Text style={styles.resetText}>Reset free tries, cinematic taste, tickets, today’s ad count and the welcome cards</Text>
          </Pressable>
        </Section>
        <Section title={`${t('debug.opened')} → ${t('debug.purchased')}`}>
          {conversion.length === 0 && <Text style={styles.muted}>{t('debug.empty')}</Text>}
          {conversion.map((r) => (
            <Row key={r.source} k={r.source} v={`${r.opened} → ${r.purchased}`} />
          ))}
          {stats.purchased.other ? <Row k="other" v={`– → ${stats.purchased.other}`} /> : null}
        </Section>
        <Section title={t('debug.rewarded')}>
          {rows('rewarded').length === 0 && <Text style={styles.muted}>{t('debug.empty')}</Text>}
          {rows('rewarded').map(([k, v]) => (
            <Row key={k} k={k} v={String(v)} />
          ))}
        </Section>
        <Section title="State">
          <Row k="freeTriesUsed" v={state.freeTriesUsed.join(', ') || '–'} />
          <Row k="tickets" v={state.tickets.join(', ') || '–'} />
          <Row k="cinematicTasted" v={state.cinematicTasted ? 'yes' : 'no'} />
          <Row k="rewards" v={state.rewards ? `${state.rewards.count} on ${state.rewards.day}` : '–'} />
        </Section>
        <Pressable onPress={resetStats} accessibilityRole="button" style={styles.reset}>
          <Text style={styles.resetText}>{t('debug.reset')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.key}>{k}</Text>
      <Text style={styles.value}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 20, gap: 16 },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 14,
    gap: 8,
  },
  sectionTitle: { fontSize: 12, letterSpacing: 1, color: colors.muted, fontFamily: fonts.bodySemi },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  key: { fontSize: 13, color: colors.text, fontFamily: fonts.body, flexShrink: 1 },
  value: { fontSize: 13, color: colors.text, fontFamily: fonts.bodySemi },
  muted: { fontSize: 13, color: colors.dim, fontFamily: fonts.body },
  reset: { alignSelf: 'center', padding: 12 },
  resetText: { color: colors.accent, fontFamily: fonts.bodySemi, fontSize: 14 },
});
