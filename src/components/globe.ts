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
 * A lighter coastline for while the globe is moving: small islands dropped and
 * points closer than 2.5° to the previous kept one skipped (about a quarter of
 * the points and a third of the polygons, ~4× faster to project). Built once.
 */
const LAND_FAST = (() => {
  const MIN_STEP = 2.5;
  const MIN_EXTENT = 4;
  const extent = (ring: number[][]) => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [x, y] of ring) {
      x0 = Math.min(x0, x); x1 = Math.max(x1, x);
      y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    return Math.max(x1 - x0, y1 - y0);
  };
  return {
    type: LAND.type,
    coordinates: LAND.coordinates
      .filter((poly) => extent(poly[0]) >= MIN_EXTENT)
      .map((poly) =>
        poly.map((ring) => {
          if (ring.length <= 8) return ring;
          const out: number[][] = [ring[0]];
          for (let i = 1; i < ring.length - 1; i++) {
            const [x, y] = out[out.length - 1];
            if (Math.abs(ring[i][0] - x) + Math.abs(ring[i][1] - y) >= MIN_STEP) out.push(ring[i]);
          }
          out.push(ring[ring.length - 1]);
          return out.length >= 4 ? out : ring;
        }),
      ),
  };
})();

/** Ring polygons depend only on the impact, not on the view: build them once per strike. */
type RingPolys = { kind: Ring['kind']; poly: ReturnType<ReturnType<typeof geoCircle>> }[];
const circleCache = new WeakMap<Ring[], Map<string, RingPolys>>();
function ringPolygons(impactLat: number, impactLon: number, rings: Ring[], fast: boolean): RingPolys {
  const key = `${impactLat},${impactLon},${fast}`;
  let byKey = circleCache.get(rings);
  if (!byKey) circleCache.set(rings, (byKey = new Map()));
  const hit = byKey.get(key);
  if (hit) return hit;
  const circle = geoCircle().center([impactLon, impactLat]).precision(fast ? 5 : 2);
  const polys = rings.map((r) => ({
    kind: r.kind,
    // Keep tiny rings visible as a dot and huge ones just short of the antipode.
    poly: circle.radius(Math.min(Math.max(r.radiusM / 1000 / KM_PER_DEG, 0.25), 179.5))(),
  }));
  byKey.set(key, polys);
  return polys;
}

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
  /** 'fast' while dragging: lighter coastline, no curve resampling. */
  quality: 'full' | 'fast' = 'full',
): GlobePaths {
  const fast = quality === 'fast';
  const projection = geoOrthographic()
    .scale(size / 2 - 1)
    .translate([size / 2, size / 2])
    .rotate([-viewLon, -viewLat])
    .clipAngle(90)
    .precision(fast ? 0 : 0.5);
  // One decimal is plenty on screen and keeps the SVG strings short to parse.
  const path = geoPath(projection).digits(1);

  return {
    sphere: path({ type: 'Sphere' }) ?? '',
    graticule: path(graticule) ?? '',
    land: path(fast ? LAND_FAST : LAND) ?? '',
    rings: ringPolygons(impactLat, impactLon, rings, fast).map((r) => ({ kind: r.kind, d: path(r.poly) ?? '' })),
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
