import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAds } from '../ads/ads';
import { CheckIcon, CloseIcon } from '../components/icons';
import { IconButton, PrimaryButton } from '../components/ui';
import { usePremium } from '../state/premium';
import { colors, fonts, radius } from '../theme';

const PERKS = [
  { title: 'No ads', body: 'Banners and full-screen ads, gone for good.' },
  { title: 'Iron & comet asteroids', body: 'Dense iron punches deeper; icy comets burst higher and faster.' },
  { title: 'Thermal burns ring', body: 'See how far the fireball’s heat causes 3rd-degree burns.' },
  { title: 'Famous impacts', body: 'Tunguska, Chelyabinsk and Chicxulub — dropped anywhere you like.' },
];

export default function Paywall() {
  const { isPro, price, busy, error, purchase, restore } = usePremium();
  const { showPrivacyOptions } = useAds();

  useEffect(() => {
    if (isPro) router.back();
  }, [isPro]);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.top}>
        <IconButton onPress={() => router.back()} label="Close">
          <CloseIcon />
        </IconButton>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.kicker}>BLAST RADIUS PRO</Text>
        <Text style={styles.title}>Unlock the full arsenal</Text>
        <Text style={styles.subtitle}>One payment. Yours forever. No subscription.</Text>

        <View style={styles.perks}>
          {PERKS.map((p) => (
            <View key={p.title} style={styles.perk}>
              <CheckIcon />
              <View style={styles.perkText}>
                <Text style={styles.perkTitle}>{p.title}</Text>
                <Text style={styles.perkBody}>{p.body}</Text>
              </View>
            </View>
          ))}
        </View>

        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={price ? `Unlock Pro · ${price}` : 'Unlock Pro'}
          onPress={purchase}
          loading={busy}
        />
        <View style={styles.links}>
          <Pressable onPress={restore} disabled={busy} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.link}>Restore purchase</Text>
          </Pressable>
          {showPrivacyOptions && (
            <Pressable onPress={showPrivacyOptions} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.link}>Ad privacy choices</Text>
            </Pressable>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  top: { paddingHorizontal: 16, paddingTop: 8, alignItems: 'flex-end' },
  body: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16, gap: 6 },
  kicker: { fontSize: 12, letterSpacing: 2, color: colors.accent, fontFamily: fonts.bodySemi },
  title: { fontSize: 30, color: colors.text, fontFamily: fonts.display },
  subtitle: { fontSize: 15, color: colors.muted, fontFamily: fonts.body },
  perks: {
    marginTop: 20,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 18,
    gap: 16,
  },
  perk: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  perkText: { flex: 1, gap: 2 },
  perkTitle: { fontSize: 15, color: colors.text, fontFamily: fonts.bodySemi },
  perkBody: { fontSize: 13, color: colors.muted, fontFamily: fonts.body, lineHeight: 18 },
  error: { marginTop: 12, color: colors.accent, fontFamily: fonts.body, fontSize: 13 },
  footer: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12, gap: 14 },
  links: { flexDirection: 'row', justifyContent: 'center', gap: 24 },
  link: { color: colors.muted, fontSize: 13, fontFamily: fonts.bodyMedium, textDecorationLine: 'underline' },
});
