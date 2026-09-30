import { LAND } from '../data/land';
import type { Ring } from '../physics/impact';
import { geoCircle, geoGraticule, geoOrthographic, geoPath } from '../vendor/d3-geo';

const KM_PER_DEG = 111.195;

export interface GlobePaths {
  sphere: string;
  graticule: string;
  land: string;
  /** Largest first, same order as the input rings. */
  rings: { kind: Ring['kind']; d: string }[];
  /** Screen position of the impact, or null when it is on the far side. */
  impact: [number, number] | null;
}

const graticule = geoGraticule().step([30, 30])();

/**
 * SVG paths for an orthographic globe `size` px across, rotated so that
 * (`viewLat`, `viewLon`) faces the viewer. Rings are true geodesic circles
 * around the impact, clipped at the horizon, so they read correctly even when
 * they wrap most of the planet.
 */
export function globePaths(
  impactLat: number,
  impactLon: number,
  rings: Ring[],
  size: number,
  viewLat = impactLat,
  viewLon = impactLon,
): GlobePaths {
  const projection = geoOrthographic()
    .scale(size / 2 - 1)
    .translate([size / 2, size / 2])
    .rotate([-viewLon, -viewLat])
    .clipAngle(90)
    .precision(0.5);
  const path = geoPath(projection);
  const circle = geoCircle().center([impactLon, impactLat]).precision(2);

  return {
    sphere: path({ type: 'Sphere' }) ?? '',
    graticule: path(graticule) ?? '',
    land: path(LAND) ?? '',
    rings: rings.map((r) => ({
      kind: r.kind,
      // Keep tiny rings visible as a dot and huge ones just short of the antipode.
      d: path(circle.radius(Math.min(Math.max(r.radiusM / 1000 / KM_PER_DEG, 0.25), 179.5))()) ?? '',
    })),
    impact: projection([impactLon, impactLat]) && isFacing(impactLat, impactLon, viewLat, viewLon)
      ? projection([impactLon, impactLat])
      : null,
  };
}

function isFacing(lat: number, lon: number, viewLat: number, viewLon: number): boolean {
  const r = Math.PI / 180;
  const cosC =
    Math.sin(viewLat * r) * Math.sin(lat * r) +
    Math.cos(viewLat * r) * Math.cos(lat * r) * Math.cos((lon - viewLon) * r);
  return cosC > 0;
}

/** Rings this large are hard to read on a flat map; show the globe by default. */
export const GLOBE_DEFAULT_ABOVE_M = 2_000_000;
/** Offer the globe toggle from this ring size up. */
export const GLOBE_AVAILABLE_ABOVE_M = 500_000;
