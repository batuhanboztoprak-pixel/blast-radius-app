import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Circle, Marker, type LatLng } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdBanner } from '../ads/AdBanner';
import { LocateIcon, SearchIcon } from '../components/icons';
import { IconButton, PrimaryButton, StepHeader } from '../components/ui';
import { formatCoords } from '../lib/geo';
import { useSimulation, type ImpactLocation } from '../state/simulation';
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
        setSearchError(`No place found for “${q}”.`);
        return;
      }
      const [address] = await Location.reverseGeocodeAsync(hit).catch(() => []);
      await drop(hit.latitude, hit.longitude, labelFor(address, hit.latitude, hit.longitude));
      map.current?.animateToRegion(
        { latitude: hit.latitude, longitude: hit.longitude, latitudeDelta: 1.2, longitudeDelta: 1.2 },
        500,
      );
    } catch {
      setSearchError('Search is unavailable right now. Tap the map instead.');
    } finally {
      setSearching(false);
    }
  }

  async function locateMe() {
    setSearchError(null);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        setSearchError('Location access is off. Search or tap the map instead.');
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
      setSearchError('Could not find your location. Search or tap the map instead.');
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StepHeader
        step="STEP 1 OF 3"
        title="Where should it hit?"
        subtitle="Tap anywhere on the map or search a city."
      />

      <View style={styles.searchWrap}>
        <View style={styles.search}>
          <SearchIcon />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={search}
            placeholder="Search a city or address"
            placeholderTextColor={colors.dim}
            returnKeyType="search"
            autoCorrect={false}
            style={styles.searchInput}
            accessibilityLabel="Search a city or address"
          />
          {searching && <ActivityIndicator color={colors.muted} />}
        </View>
        {searchError && <Text style={styles.searchError}>{searchError}</Text>}
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
          <IconButton onPress={locateMe} label="Use my location">
            <LocateIcon />
          </IconButton>
        </View>
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          label={location ? 'Continue' : 'Drop a pin to continue'}
          disabled={!location}
          onPress={() => router.push('/asteroid')}
        />
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
  footer: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
});
