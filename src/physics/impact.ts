/**
 * Impact physics based on the Earth Impact Effects Program:
 *
 *   Collins, G. S., Melosh, H. J., & Marcus, R. A. (2005).
 *   "Earth Impact Effects Program: A Web-based computer program for calculating
 *   the regional environmental consequences of a meteoroid impact on Earth."
 *   Meteoritics & Planetary Science 40(6), 817–840.
 *
 * Everything is SI (metres, kilograms, seconds, joules, pascals) unless a name
 * says otherwise. Equation numbers in comments refer to that paper.
 *
 * Simplifications for v1 (documented in docs/PHYSICS.md):
 *  - Target is always land (sedimentary rock, 2500 kg/m³); no water layer / tsunami.
 *  - Airbursts leave no crater and no seismic signal.
 *  - The flat-Earth air-blast fits are used out to their limit; rings are capped
 *    at MAX_RING_RADIUS_M, beyond which effects are effectively global.
 */

export type Composition = 'rock' | 'iron' | 'comet';

export interface ImpactorParams {
  /** Impactor diameter before atmospheric entry, metres. */
  diameterM: number;
  /** Speed at the top of the atmosphere, metres per second. */
  velocityMs: number;
  composition: Composition;
  /** Entry angle measured from the horizontal, degrees. 45° is the most probable. */
  angleDeg: number;
}

export interface Ring {
  kind: 'crater' | 'thermal' | 'severe' | 'windows';
  radiusM: number;
  /** True if the radius hit MAX_RING_RADIUS_M and was clamped. */
  capped: boolean;
}

export interface ImpactResult {
  params: ImpactorParams;
  densityKgM3: number;
  massKg: number;
  /** Kinetic energy before atmospheric entry. */
  entryEnergyJ: number;
  entryEnergyMt: number;
  /**
   * Energy that drives the damage: impact energy for a ground strike, or the
   * energy dumped into the atmosphere for an airburst.
   */
  effectiveEnergyJ: number;
  effectiveEnergyMt: number;
  hiroshimaMultiple: number;
  /** null when the body reaches the ground (intact or as a fragment cloud). */
  airburstAltitudeM: number | null;
  /** Altitude where aerodynamic stress first exceeds strength; null if it never breaks up. */
  breakupAltitudeM: number | null;
  /** Speed at the ground, or at burst altitude for an airburst. */
  finalVelocityMs: number;
  /** Final (rim-to-rim) crater diameter, null for airbursts. */
  craterDiameterM: number | null;
  craterDepthM: number | null;
  craterType: 'simple' | 'complex' | null;
  /** Richter/moment-magnitude equivalent of the seismic shaking, null for airbursts. */
  seismicMagnitude: number | null;
  /** Average years between impacts of at least this energy anywhere on Earth. */
  recurrenceYears: number;
  fireballRadiusM: number | null;
  /** Rings sorted largest → smallest. */
  rings: Ring[];
}

export const DENSITY: Record<Composition, number> = {
  rock: 3000,
  iron: 8000,
  comet: 1000,
};

export const J_PER_KT = 4.184e12;
export const J_PER_MT = 4.184e15;
export const HIROSHIMA_KT = 15;

export const EARTH_RADIUS_M = 6.371e6;
/** Rings larger than this (≈ a quarter of Earth's circumference) are clamped. */
export const MAX_RING_RADIUS_M = 10_000_000;

/** Overpressure thresholds used for the damage rings. */
export const OVERPRESSURE_SEVERE_PA = 34_500; // ~5 psi: most residential buildings collapse
export const OVERPRESSURE_WINDOWS_PA = 6_900; // ~1 psi: glass windows shatter

/** Third-degree burns at 1 Mt: ~8 cal/cm² (Glasstone & Dolan 1977). Scales as E^(1/6). */
const THERMAL_THIRD_DEGREE_1MT_JM2 = 3.35e5;

const G = 9.81;
const TARGET_DENSITY = 2500;
const SCALE_HEIGHT = 8000;
const SURFACE_AIR_DENSITY = 1;
const DRAG_COEFF = 2;
const PANCAKE_FACTOR = 7;
const LUMINOUS_EFFICIENCY = 3e-3;
/** Below this impact speed no vapour fireball forms (Collins et al. §Thermal radiation). */
const MIN_FIREBALL_VELOCITY = 15_000;
const SIMPLE_COMPLEX_TRANSITION_M = 3200;

export function simulateImpact(params: ImpactorParams): ImpactResult {
  const L0 = params.diameterM;
  const v0 = params.velocityMs;
  const rhoI = DENSITY[params.composition];
  const theta = (params.angleDeg * Math.PI) / 180;
  const sinT = Math.sin(theta);

  const mass = (rhoI * Math.PI * L0 ** 3) / 6;
  const entryEnergy = 0.5 * mass * v0 * v0;

  const entry = atmosphericEntry(L0, v0, rhoI, sinT);

  let effectiveEnergy: number;
  if (entry.airburstAltitude !== null) {
    // Energy deposited in the atmosphere drives the blast.
    effectiveEnergy = 0.5 * mass * (v0 * v0 - entry.finalVelocity ** 2);
  } else {
    effectiveEnergy = 0.5 * mass * entry.finalVelocity ** 2;
  }
  const effectiveMt = effectiveEnergy / J_PER_MT;

  // Crater (ground impacts only). Eq. 21, 22, 27.
  let craterDiameter: number | null = null;
  let craterDepth: number | null = null;
  let craterType: ImpactResult['craterType'] = null;
  if (entry.airburstAltitude === null) {
    const vi = entry.finalVelocity;
    const transient =
      1.161 *
      Math.cbrt(rhoI / TARGET_DENSITY) *
      L0 ** 0.78 *
      vi ** 0.44 *
      G ** -0.22 *
      Math.cbrt(sinT);
    if (transient * 1.25 < SIMPLE_COMPLEX_TRANSITION_M) {
      craterType = 'simple';
      craterDiameter = 1.25 * transient;
      // Simple craters are bowls ~1/5 as deep as they are wide.
      craterDepth = craterDiameter / 5;
    } else {
      craterType = 'complex';
      craterDiameter = (1.17 * transient ** 1.13) / SIMPLE_COMPLEX_TRANSITION_M ** 0.13;
      // Eq. 28, with diameters in km.
      craterDepth = 0.4 * (craterDiameter / 1000) ** 0.3 * 1000;
    }
  }

  // Seismic magnitude, eq. 40 (seismic efficiency 1e-4 folded in).
  const seismicMagnitude =
    entry.airburstAltitude === null && effectiveEnergy > 0
      ? 0.67 * Math.log10(effectiveEnergy) - 5.87
      : null;

  // Thermal radiation, eq. 32–35.
  let fireballRadius: number | null = null;
  let thermalRadius: number | null = null;
  if (entry.finalVelocity >= MIN_FIREBALL_VELOCITY || entry.airburstAltitude !== null) {
    fireballRadius = 0.002 * Math.cbrt(effectiveEnergy);
    thermalRadius = thermalRadiusFor(effectiveEnergy, fireballRadius, entry.airburstAltitude ?? 0);
  }

  const burstAlt = entry.airburstAltitude ?? 0;
  const severe = radiusForOverpressure(OVERPRESSURE_SEVERE_PA, effectiveEnergy, burstAlt);
  const windows = radiusForOverpressure(OVERPRESSURE_WINDOWS_PA, effectiveEnergy, burstAlt);

  const rings: Ring[] = [];
  const push = (kind: Ring['kind'], r: number | null) => {
    if (r === null || !(r > 0)) return;
    rings.push({ kind, radiusM: Math.min(r, MAX_RING_RADIUS_M), capped: r >= MAX_RING_RADIUS_M });
  };
  push('windows', windows);
  push('severe', severe);
  push('thermal', thermalRadius);
  push('crater', craterDiameter !== null ? craterDiameter / 2 : null);
  rings.sort((a, b) => b.radiusM - a.radiusM);

  return {
    params,
    densityKgM3: rhoI,
    massKg: mass,
    entryEnergyJ: entryEnergy,
    entryEnergyMt: entryEnergy / J_PER_MT,
    effectiveEnergyJ: effectiveEnergy,
    effectiveEnergyMt: effectiveMt,
    hiroshimaMultiple: effectiveEnergy / (HIROSHIMA_KT * J_PER_KT),
    airburstAltitudeM: entry.airburstAltitude,
    breakupAltitudeM: entry.breakupAltitude,
    finalVelocityMs: entry.finalVelocity,
    craterDiameterM: craterDiameter,
    craterDepthM: craterDepth,
    craterType,
    seismicMagnitude,
    // Eq. 3 uses energy at entry.
    recurrenceYears: 109 * (entryEnergy / J_PER_MT) ** 0.78,
    fireballRadiusM: fireballRadius,
    rings,
  };
}

interface EntryResult {
  breakupAltitude: number | null;
  airburstAltitude: number | null;
  finalVelocity: number;
}

/** Atmospheric entry with the "pancake" fragmentation model (eq. 8–19). */
export function atmosphericEntry(
  L0: number,
  v0: number,
  rhoI: number,
  sinT: number,
): EntryResult {
  const H = SCALE_HEIGHT;
  const rho0 = SURFACE_AIR_DENSITY;
  const Cd = DRAG_COEFF;

  // Yield strength, eq. 10.
  const Yi = 10 ** (2.107 + 0.0624 * Math.sqrt(rhoI));
  // Breakup parameter, eq. 12.
  const If = (4.07 * Cd * H * Yi) / (rhoI * L0 * v0 * v0 * sinT);

  const dragDecay = (airDensity: number) =>
    Math.exp((-3 * airDensity * Cd * H) / (4 * rhoI * L0 * sinT));

  if (If >= 1) {
    // Strong enough to reach the ground intact, eq. 8 at z = 0.
    return { breakupAltitude: null, airburstAltitude: null, finalVelocity: v0 * dragDecay(rho0) };
  }

  // Breakup altitude, eq. 11.
  const zStar =
    -H * (Math.log(Yi / (rho0 * v0 * v0)) + 1.308 - 0.314 * If - 1.303 * Math.sqrt(1 - If));
  if (zStar <= 0) {
    return { breakupAltitude: null, airburstAltitude: null, finalVelocity: v0 * dragDecay(rho0) };
  }

  const rhoStar = rho0 * Math.exp(-zStar / H);
  const vStar = v0 * dragDecay(rhoStar);
  // Dispersion length scale, eq. 16.
  const l = L0 * sinT * Math.sqrt(rhoI / (Cd * rhoStar));
  // Airburst altitude where the pancake reaches PANCAKE_FACTOR × L0, eq. 18.
  const zBurst =
    zStar -
    2 * H * Math.log(1 + (l / (2 * H)) * Math.sqrt(PANCAKE_FACTOR ** 2 - 1));

  const zEnd = Math.max(zBurst, 0);
  const finalVelocity = pancakeVelocity(zEnd, zStar, vStar, rhoStar, L0, l, rhoI, sinT);

  return {
    breakupAltitude: zStar,
    airburstAltitude: zBurst > 0 ? zBurst : null,
    finalVelocity,
  };
}

/** Velocity at altitude z after breakup at zStar, eq. 17 integrated numerically. */
function pancakeVelocity(
  z: number,
  zStar: number,
  vStar: number,
  rhoStar: number,
  L0: number,
  l: number,
  rhoI: number,
  sinT: number,
): number {
  const H = SCALE_HEIGHT;
  const spread = (zp: number) => {
    const e = Math.exp((zStar - zp) / (2 * H)) - 1;
    return L0 * Math.sqrt(1 + ((2 * H) / l) ** 2 * e * e);
  };
  const integrand = (zp: number) => Math.exp((zStar - zp) / H) * spread(zp) ** 2;

  // Composite Simpson's rule.
  const n = 400;
  const h = (zStar - z) / n;
  let sum = integrand(z) + integrand(zStar);
  for (let i = 1; i < n; i++) sum += integrand(z + i * h) * (i % 2 === 0 ? 2 : 4);
  const integral = (sum * h) / 3;

  const exponent = (-0.75 * DRAG_COEFF * rhoStar * integral) / (rhoI * L0 ** 3 * sinT);
  return vStar * Math.exp(exponent);
}

/**
 * Peak overpressure (Pa) at ground range r (m) for a burst of energy E (J) at
 * altitude zb (m). Eq. 54–57, scaled from a 1 kt reference explosion.
 */
export function overpressureAt(r: number, energyJ: number, zb: number): number {
  const kt13 = Math.cbrt(energyJ / J_PER_KT);
  const surface = (scaledRange: number) => {
    const r1 = Math.max(scaledRange, 1e-3);
    const px = 75_000;
    const rx = 290;
    return ((px * rx) / (4 * r1)) * (1 + 3 * (rx / r1) ** 1.3);
  };
  const r1 = r / kt13;
  if (zb <= 0) return surface(r1);

  const zb1 = zb / kt13;
  // Regular-reflection fit for an airburst (eq. 55–56). It falls off too fast
  // for very high bursts, so never report less than a surface burst would
  // give at the same slant distance. Taking the max keeps p(r) monotonic.
  const p0 = 3.14e11 * zb1 ** -2.6;
  const beta = 34.87 * zb1 ** -1.73;
  return Math.max(p0 * Math.exp(-beta * r1), surface(Math.hypot(r1, zb1)));
}

/** Largest ground range at which overpressure still reaches `pressurePa`. */
export function radiusForOverpressure(pressurePa: number, energyJ: number, zb: number): number | null {
  if (energyJ <= 0) return null;
  // Overpressure is (piecewise) decreasing with range; scan outward on a log grid
  // for the last point above threshold, then bisect.
  let lo = 0;
  let hi = 0;
  let found = false;
  for (let r = 1; r <= MAX_RING_RADIUS_M * 4; r *= 1.1) {
    if (overpressureAt(r, energyJ, zb) >= pressurePa) {
      lo = r;
      found = true;
    } else if (found) {
      hi = r;
      break;
    }
  }
  if (!found) return null;
  if (hi === 0) return MAX_RING_RADIUS_M * 4;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (overpressureAt(mid, energyJ, zb) >= pressurePa) lo = mid;
    else hi = mid;
  }
  return lo;
}

/**
 * Thermal exposure (J/m²) at ground range r, eq. 32–35. For an airburst the
 * fireball sits at altitude zb and is fully visible, so only slant distance matters.
 */
export function thermalExposureAt(
  r: number,
  energyJ: number,
  fireballRadius: number,
  zb: number,
): number {
  let visibleFraction = 1;
  let distance = r;
  if (zb > 0) {
    distance = Math.hypot(r, zb);
  } else {
    // Fraction of the fireball above the horizon, eq. 33–34.
    const delta = r / EARTH_RADIUS_M;
    const h = (1 - Math.cos(delta)) * EARTH_RADIUS_M;
    if (h >= fireballRadius) return 0;
    const d = Math.acos(h / fireballRadius);
    visibleFraction = (2 / Math.PI) * (d - (h / fireballRadius) * Math.sin(d));
  }
  return (visibleFraction * LUMINOUS_EFFICIENCY * energyJ) / (2 * Math.PI * distance * distance);
}

function thermalRadiusFor(energyJ: number, fireballRadius: number, zb: number): number | null {
  const threshold = THERMAL_THIRD_DEGREE_1MT_JM2 * (energyJ / J_PER_MT) ** (1 / 6);
  const exposed = (r: number) => thermalExposureAt(r, energyJ, fireballRadius, zb) >= threshold;
  if (!exposed(1)) return null;
  let lo = 1;
  let hi = 1;
  while (exposed(hi)) {
    lo = hi;
    hi *= 2;
    if (hi > MAX_RING_RADIUS_M * 4) return MAX_RING_RADIUS_M * 4;
  }
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (exposed(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}
