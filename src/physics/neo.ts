/**
 * Real near-Earth asteroids from NASA/JPL's public Close-Approach Data API
 * (https://ssd-api.jpl.nasa.gov/doc/cad.html), turned into something the
 * simulator can strike with. Pure functions, unit-tested.
 */

export interface RealAsteroid {
  /** JPL designation, e.g. "2026 TA" or "99942". */
  id: string;
  /** Display name, e.g. "2026 TA" or "99942 Apophis". */
  name: string;
  /** Close approach time, ISO 8601 (UTC). */
  approachAt: string;
  /** Closest distance from Earth's centre, in Moon distances. */
  distanceLd: number;
  /** Estimated diameter in metres (clamped to the simulator's range). */
  diameterM: number;
  /** True when the size comes from brightness (H) rather than a measurement. */
  sizeEstimated: boolean;
  /** Speed it would hit Earth at: its approach speed plus Earth's pull (m/s). */
  impactVelocityMs: number;
}

const AU_KM = 149_597_870.7;
const LD_KM = 384_400;
/** Earth's escape velocity, km/s: what an asteroid gains falling in from far away. */
const V_ESC = 11.19;
/** Typical albedo for converting brightness to size (NASA's usual assumption). */
const DEFAULT_ALBEDO = 0.14;
const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

/** Diameter (m) from absolute magnitude H: D = 1329 km / √p × 10^(−H/5). */
export function diameterFromH(h: number, albedo = DEFAULT_ALBEDO): number {
  return (1329 / Math.sqrt(albedo)) * Math.pow(10, -h / 5) * 1000;
}

/** Impact speed (m/s) from the hyperbolic excess speed v∞ (km/s): √(v∞² + v_esc²). */
export function impactSpeedMs(vInfKms: number): number {
  return Math.sqrt(vInfKms * vInfKms + V_ESC * V_ESC) * 1000;
}

/** "2026-Oct-03 12:01" (JPL, TDB ≈ UTC) → ISO string. */
export function parseCadDate(cd: string): string | null {
  const m = /^(\d{4})-([A-Z][a-z]{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(cd.trim());
  if (!m || !(m[2] in MONTHS)) return null;
  return new Date(Date.UTC(+m[1], MONTHS[m[2]], +m[3], +m[4], +m[5])).toISOString();
}

const clamp = (x: number, lo: number, hi: number) => Math.min(Math.max(x, lo), hi);

interface CadResponse {
  fields?: string[];
  data?: (string | null)[][];
}

/** Parses a CAD API response (requested with fullname=true&diameter=true). */
export function parseCad(json: unknown): RealAsteroid[] {
  const r = json as CadResponse;
  if (!r || !Array.isArray(r.fields) || !Array.isArray(r.data)) return [];
  const f = (name: string) => r.fields!.indexOf(name);
  const iDes = f('des');
  const iCd = f('cd');
  const iDist = f('dist');
  const iVrel = f('v_rel');
  const iVinf = f('v_inf');
  const iH = f('h');
  const iDiam = f('diameter');
  const iName = f('fullname');
  if (iDes < 0 || iCd < 0 || iDist < 0) return [];
  const out: RealAsteroid[] = [];
  for (const row of r.data) {
    const des = row[iDes];
    const cd = row[iCd];
    const dist = Number(row[iDist]);
    const approachAt = cd ? parseCadDate(cd) : null;
    if (!des || !approachAt || !(dist > 0)) continue;
    const measured = iDiam >= 0 && row[iDiam] != null ? Number(row[iDiam]) * 1000 : NaN;
    const h = iH >= 0 && row[iH] != null ? Number(row[iH]) : NaN;
    const diameter = Number.isFinite(measured) && measured > 0 ? measured : Number.isFinite(h) ? diameterFromH(h) : NaN;
    if (!Number.isFinite(diameter)) continue;
    const vInf = iVinf >= 0 && row[iVinf] != null ? Number(row[iVinf]) : NaN;
    const vRel = iVrel >= 0 && row[iVrel] != null ? Number(row[iVrel]) : NaN;
    const v = Number.isFinite(vInf) ? vInf : vRel;
    if (!Number.isFinite(v)) continue;
    const fullname = (iName >= 0 && row[iName]) || des;
    out.push({
      id: des,
      name: fullname.trim().replace(/^\((.*)\)$/, '$1'),
      approachAt,
      distanceLd: (dist * AU_KM) / LD_KM,
      // The simulator covers 10 m to 20 km and 11 to 72 km/s.
      diameterM: clamp(Math.round(diameter), 10, 20_000),
      sizeEstimated: !(Number.isFinite(measured) && measured > 0),
      impactVelocityMs: clamp(Math.round(impactSpeedMs(v)), 11_000, 72_000),
    });
  }
  return out.sort((a, b) => a.approachAt.localeCompare(b.approachAt));
}

/** Upcoming approaches (from 12 h ago on), in date order. */
export function upcoming(list: RealAsteroid[], now: Date): RealAsteroid[] {
  const from = now.getTime() - 12 * 3600_000;
  return list.filter((a) => Date.parse(a.approachAt) >= from);
}

/**
 * "Today's real asteroid": the biggest one passing within the next week (the
 * most dramatic to simulate), or else the next one to pass.
 */
export function pickToday(list: RealAsteroid[], now: Date): RealAsteroid | null {
  const next = upcoming(list, now);
  if (!next.length) return null;
  const weekEnd = now.getTime() + 7 * 86400_000;
  const week = next.filter((a) => Date.parse(a.approachAt) <= weekEnd);
  const pool = week.length ? week : next.slice(0, 1);
  return pool.reduce((best, a) => (a.diameterM > best.diameterM ? a : best));
}

/**
 * Famous real asteroids to fall back on offline. Sizes and speeds from NASA/JPL;
 * impact speeds include Earth's pull.
 */
export const FAMOUS_ASTEROIDS: RealAsteroid[] = [
  {
    id: '99942',
    name: '99942 Apophis',
    // Passes about 32,000 km above Earth on 13 April 2029, closer than geostationary satellites.
    approachAt: '2029-04-13T21:46:00.000Z',
    distanceLd: 0.1,
    diameterM: 340,
    sizeEstimated: false,
    impactVelocityMs: 12_600,
  },
  {
    id: '101955',
    name: '101955 Bennu',
    approachAt: '2135-09-25T00:00:00.000Z',
    distanceLd: 0.53,
    diameterM: 490,
    sizeEstimated: false,
    impactVelocityMs: 12_900,
  },
];
