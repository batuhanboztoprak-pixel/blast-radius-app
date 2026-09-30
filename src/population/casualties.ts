/**
 * Who is hit by an impact.
 *
 * Local casualties follow NASA's Probabilistic Asteroid Impact Risk model
 * (Mathias, Wheeler & Dotson 2017, Acta Astronautica 134:334–346): everyone
 * inside the larger of the 4 psi (~28 kPa) blast radius and the third-degree-burn
 * radius counts as a casualty (killed or seriously injured).
 *
 * Global effects for very large impacts follow Chapman & Morrison (1994, Nature
 * 367:33–40): above a threshold of roughly 1.5 km (~2.5×10⁵ Mt) an impact causes
 * a global catastrophe killing at least a quarter of humanity, rising towards
 * extinction for the largest impacts. Their curve is a deliberately rough
 * estimate; the in-between values here are a log-linear interpolation of it.
 */
import { radiusForOverpressure, type ImpactResult } from '../physics/impact';
import { GRID_TOTAL_2015, peopleWithin2015 } from './grid';

/** World population in 2026 (UN World Population Prospects 2024 projection). */
export const WORLD_POPULATION = 8_300_000_000;
/** Scales the 2015 grid to today's population (uniformly: a simplification). */
export const POPULATION_SCALE = WORLD_POPULATION / GRID_TOTAL_2015;

export const OVERPRESSURE_CASUALTY_PA = 27_579; // 4 psi, NASA PAIR

/** Global-catastrophe curve: [energy in Mt, fraction of humanity killed]. */
const GLOBAL_CURVE: [number, number][] = [
  [1e5, 0],
  [2.5e5, 0.25], // Chapman & Morrison's nominal threshold (~1.5 km asteroid)
  [1e8, 0.95], // Chicxulub-scale: mass extinction
];

export function globalDeathFraction(energyMt: number): number {
  if (energyMt <= GLOBAL_CURVE[0][0]) return 0;
  const last = GLOBAL_CURVE[GLOBAL_CURVE.length - 1];
  if (energyMt >= last[0]) return last[1];
  for (let i = 1; i < GLOBAL_CURVE.length; i++) {
    const [e1, f1] = GLOBAL_CURVE[i];
    if (energyMt <= e1) {
      const [e0, f0] = GLOBAL_CURVE[i - 1];
      const t = Math.log(energyMt / e0) / Math.log(e1 / e0);
      return f0 + t * (f1 - f0);
    }
  }
  return last[1];
}

export interface PopulationImpact {
  /** People living inside each ring today, keyed by ring kind. */
  inRing: Partial<Record<ImpactResult['rings'][number]['kind'], number>>;
  /** Radius used for local casualties (4 psi or burns, whichever is larger). */
  casualtyRadiusM: number;
  localCasualties: number;
  /** Fraction of the rest of humanity killed by global effects. */
  globalFraction: number;
  globalDeaths: number;
  totalDeaths: number;
}

/**
 * @param survivorsBefore World population before this strike; local counts are
 *   scaled down by the share of humanity already lost to earlier strikes.
 */
export function populationImpact(
  result: ImpactResult,
  latitude: number,
  longitude: number,
  survivorsBefore: number = WORLD_POPULATION,
): PopulationImpact {
  const alive = Math.max(0, Math.min(1, survivorsBefore / WORLD_POPULATION));
  const people = (r: number) =>
    Math.min(peopleWithin2015(latitude, longitude, r) * POPULATION_SCALE * alive, survivorsBefore);

  const inRing: PopulationImpact['inRing'] = {};
  for (const ring of result.rings) inRing[ring.kind] = people(ring.radiusM);

  const blast =
    radiusForOverpressure(OVERPRESSURE_CASUALTY_PA, result.effectiveEnergyJ, result.airburstAltitudeM ?? 0) ?? 0;
  const burns = result.rings.find((r) => r.kind === 'thermal')?.radiusM ?? 0;
  const crater = (result.craterDiameterM ?? 0) / 2;
  const casualtyRadiusM = Math.max(blast, burns, crater);
  const localCasualties = casualtyRadiusM > 0 ? people(casualtyRadiusM) : 0;

  // Airbursts never reach global-catastrophe energies; use the ground-impact energy.
  const globalFraction = result.airburstAltitudeM === null ? globalDeathFraction(result.effectiveEnergyMt) : 0;
  const globalDeaths = Math.max(0, survivorsBefore - localCasualties) * globalFraction;

  return {
    inRing,
    casualtyRadiusM,
    localCasualties,
    globalFraction,
    globalDeaths,
    totalDeaths: Math.min(survivorsBefore, localCasualties + globalDeaths),
  };
}
