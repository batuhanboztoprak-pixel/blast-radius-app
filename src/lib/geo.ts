import type { Region } from 'react-native-maps';

const M_PER_DEG_LAT = 111_320;
const MAX_LAT = 85;

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;
const clampLat = (lat: number) => Math.max(-MAX_LAT, Math.min(MAX_LAT, lat));

/** A region that comfortably shows a circle of `radiusM` around the point. */
export function regionForRadius(latitude: number, longitude: number, radiusM: number): Region {
  const latitudeDelta = Math.min((radiusM * 2.6) / M_PER_DEG_LAT, 150);
  const cos = Math.max(Math.cos(toRad(latitude)), 0.05);
  const longitudeDelta = Math.min(latitudeDelta / cos, 360);
  return { latitude, longitude, latitudeDelta, longitudeDelta };
}

/**
 * For a static map image of `widthPx`×`heightPx` centred on a point, returns the
 * Web-Mercator region that renders `radiusM` at `fillFraction` of the shorter
 * side, plus the resulting pixels-per-metre at the centre. Mercator is
 * conformal, so circles drawn at the centre with this scale line up with the map.
 */
export function snapshotFrame(
  latitude: number,
  longitude: number,
  radiusM: number,
  widthPx: number,
  heightPx: number,
  fillFraction = 0.42,
): { region: Region; pxPerMeter: number } {
  const lat = clampLat(latitude);
  const cos = Math.cos(toRad(lat));
  // Keep the whole map on Earth: at most ~one world width across.
  const maxPxPerMeter = widthPx / (360 * M_PER_DEG_LAT * cos);
  const pxPerMeter = Math.max((fillFraction * Math.min(widthPx, heightPx)) / radiusM, maxPxPerMeter);

  const longitudeDelta = widthPx / pxPerMeter / (M_PER_DEG_LAT * cos);
  // Pixels per radian of longitude, then invert the Mercator y for the top/bottom edges.
  const pxPerRad = widthPx / toRad(longitudeDelta);
  const yCenter = Math.log(Math.tan(Math.PI / 4 + toRad(lat) / 2));
  const yHalf = heightPx / 2 / pxPerRad;
  const latAt = (y: number) => toDeg(2 * Math.atan(Math.exp(y)) - Math.PI / 2);
  const top = clampLat(latAt(yCenter + yHalf));
  const bottom = clampLat(latAt(yCenter - yHalf));

  return {
    region: {
      latitude: (top + bottom) / 2,
      longitude,
      latitudeDelta: top - bottom,
      longitudeDelta,
    },
    pxPerMeter,
  };
}

export function formatCoords(latitude: number, longitude: number): string {
  const ns = latitude >= 0 ? 'N' : 'S';
  const ew = longitude >= 0 ? 'E' : 'W';
  return `${Math.abs(latitude).toFixed(2)}°${ns}, ${Math.abs(longitude).toFixed(2)}°${ew}`;
}
