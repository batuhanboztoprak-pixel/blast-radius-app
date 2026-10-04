import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Circle, Marker, type LatLng } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdBanner } from '../ads/AdBanner';
import { LocateIcon, SearchIcon } from '../components/icons';
import { RealAsteroidCard } from '../components/RealAsteroidCard';
import { IconButton, PrimaryButton, StepHeader } from '../components/ui';
import { PRIVACY_POLICY_URL } from '../config';
import { t } from '../i18n/core';
import { formatCoords } from '../lib/geo';
import { usePremium } from '../state/premium';
import { useSimulation, type ImpactLocation } from '../state/simulation';
import { useUpsell } from '../upsell/upsell';
import { colors, fonts, radius } from '../theme';

const WORLD = { latitude: 30, longitude: 15, latitudeDelta: 100, longitudeDelta: 100 };

function labelFor(a: Location.LocationGeocodedAddress | undefined, lat: number, lon: number) {
  if (!a) return formatCoords(lat, lon);
  const place = a.city ?? a.subregion ?? a.region ?? a.name;
  if (place && a.country) return `${place}, ${a.country}`;
  return place ?? a.country ?? formatCoords(lat, lon);
}

export default function PickLocation() {
  const { location, setLocation } = useSimulation();
  const { isPro } = usePremium();
  const upsell = useUpsell();
  const map = useRef<MapView>(null);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  async function drop(latitude: number, longitude: number, knownLabel?: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const pin: ImpactLocation = { latitude, longitude, label: knownLabel ?? formatCoords(latitude, longitude) };
    setLocation(pin);
    if (knownLabel) return;
    try {
      const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
      setLocation({ ...pin, label: labelFor(address, latitude, longitude) });
    } catch {
      // Keep the coordinate label (offline, or open ocean).
    }
  }

  function onMapPress(e: { nativeEvent: { coordinate: LatLng } }) {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    drop(latitude, longitude);
  }

  async function search() {
    const q = query.trim();
    if (!q) return;
    Keyboard.dismiss();
    setSearching(true);
    setSearchError(null);
    try {
      const [hit] = await Location.geocodeAsync(q);
      if (!hit) {
        setSearchError(t('pick.noResult', { query: q }));
        return;
      }
      const [address] = await Location.reverseGeocodeAsync(hit).catch(() => []);
      await drop(hit.latitude, hit.longitude, labelFor(address, hit.latitude, hit.longitude));
      map.current?.animateToRegion(
        { latitude: hit.latitude, longitude: hit.longitude, latitudeDelta: 1.2, longitudeDelta: 1.2 },
        500,
      );
    } catch {
      setSearchError(t('pick.searchUnavailable'));
    } finally {
      setSearching(false);
    }
  }

  async function locateMe() {
    setSearchError(null);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        setSearchError(t('pick.locationOff'));
        return;
      }
      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      await drop(coords.latitude, coords.longitude);
      map.current?.animateToRegion(
        { latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: 1.2, longitudeDelta: 1.2 },
        500,
      );
    } catch {
      setSearchError(t('pick.locationFailed'));
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StepHeader
        step={t('pick.step')}
        title={t('pick.title')}
        subtitle={t('pick.subtitle')}
        onTitleLongPress={__DEV__ ? () => router.push('/upgrade-stats') : undefined}
      />

      <View style={styles.searchWrap}>
        <View style={styles.search}>
          <SearchIcon />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={search}
            placeholder={t('pick.searchPlaceholder')}
            placeholderTextColor={colors.dim}
            returnKeyType="search"
            autoCorrect={false}
            style={styles.searchInput}
            accessibilityLabel={t('pick.searchPlaceholder')}
          />
          {searching && <ActivityIndicator color={colors.muted} />}
        </View>
        {searchError && <Text style={styles.searchError}>{searchError}</Text>}
      </View>

      <View style={styles.realWrap}>
        <RealAsteroidCard />
      </View>

      <View style={styles.mapWrap}>
        <MapView
          ref={map}
          style={StyleSheet.absoluteFill}
          initialRegion={WORLD}
          userInterfaceStyle="dark"
          onPress={onMapPress}
          onLongPress={onMapPress}
          rotateEnabled={false}
          pitchEnabled={false}
          toolbarEnabled={false}
        >
          {location && (
            <>
              <Circle
                center={location}
                radius={60_000}
                fillColor="rgba(255,107,74,0.15)"
                strokeColor="rgba(255,107,74,0.4)"
              />
              <Marker coordinate={location} pinColor={colors.accent} />
            </>
          )}
        </MapView>
        {location && (
          <View style={styles.label} pointerEvents="none">
            <Text style={styles.labelText} numberOfLines={1}>
              {location.label}
            </Text>
          </View>
        )}
        <View style={styles.locate}>
          <IconButton onPress={locateMe} label={t('pick.useMyLocation')}>
            <LocateIcon />
          </IconButton>
        </View>
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          label={t(location ? 'pick.continue' : 'pick.dropPin')}
          disabled={!location}
          onPress={() => router.push('/asteroid')}
        />
        {/* Always-reachable Pro (with restore) and privacy policy. */}
        <View style={styles.links}>
          <Pressable
            onPress={() => !isPro && upsell.openPaywall('cinematic', 'home-link')}
            disabled={isPro}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Text style={[styles.link, !isPro && styles.linkPro]}>{isPro ? t('home.proActive') : t('home.getPro')}</Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL(PRIVACY_POLICY_URL)} accessibilityRole="link" hitSlop={8}>
            <Text style={styles.link}>{t('paywall.privacyPolicy')}</Text>
          </Pressable>
        </View>
      </View>
      <AdBanner />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  searchWrap: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12, gap: 6 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 15, fontFamily: fonts.body, paddingVertical: 12 },
  realWrap: { paddingHorizontal: 20, paddingBottom: 12 },
  searchError: { color: colors.accent, fontSize: 13, fontFamily: fonts.body },
  mapWrap: {
    flex: 1,
    marginHorizontal: 20,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#0F1424',
  },
  label: {
    position: 'absolute',
    top: 14,
    alignSelf: 'center',
    maxWidth: '85%',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  labelText: { color: colors.text, fontSize: 13, fontFamily: fonts.bodySemi },
  locate: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  footer: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, gap: 12 },
  links: { flexDirection: 'row', justifyContent: 'center', gap: 24 },
  link: { color: colors.dim, fontSize: 12, fontFamily: fonts.bodyMedium },
  linkPro: { color: colors.accent },
});
