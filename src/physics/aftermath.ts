/**
 * What happens after the impact, stage by stage. Pure TypeScript: it returns
 * facts as message keys plus raw numbers, and the UI formats them in the user's
 * language and units.
 *
 * Sources:
 *  - Blast and seismic arrival, ejecta thickness: Collins, Melosh & Marcus (2005),
 *    Earth Impact Effects Program. Air blast travels at roughly the speed of sound
 *    far from the impact; seismic waves at ~5 km/s; ejecta blanket thickness
 *    t = D_tc⁴ / (112 r³) (their eq. 47).
 *  - Global effects threshold: Chapman & Morrison (1994), ~2.5×10⁵ Mt.
 *  - Chicxulub-scale climate: Brugger, Feulner & Petri (2017, Geophys. Res. Lett.):
 *    at least 26 °C of global cooling, ~3 years below freezing, ~30 years to recover.
 * Timings and thresholds are order-of-magnitude, like the rest of the model.
 */
import type { ImpactResult } from './impact';

export type StageId = 'impact' | 'blast' | 'ejecta' | 'fires' | 'sky' | 'climate';

export interface Fact {
  /** Message key under "af." in the catalogues. */
  key: string;
  /** Distance in metres. */
  dist?: number;
  /** Time in seconds. */
  time?: number;
  /** Area in square metres. */
  area?: number;
  /** Temperature drop in °C. */
  drop?: number;
  /** Quake magnitude. */
  m?: number;
}

export interface Stage {
  id: StageId;
  /** Free users see the first stages; the rest are Pro. */
  pro: boolean;
  facts: Fact[];
}

const SOUND_SPEED = 340; // m/s, far-field air blast
const SEISMIC_SPEED = 5000; // m/s
/** Global effects start here (Chapman & Morrison 1994). */
export const GLOBAL_EFFECTS_MT = 2.5e5;
/** Chicxulub-class energy: impact winter per Brugger et al. (2017). */
export const IMPACT_WINTER_MT = 1e8;

const ring = (r: ImpactResult, kind: string) => r.rings.find((x) => x.kind === kind);

/** Distance at which the ejecta blanket is `t` metres thick (Collins et al. eq. 47). */
export function ejectaRadiusForThickness(transientDiameterM: number, t: number): number {
  return Math.cbrt(transientDiameterM ** 4 / (112 * t));
}

export function aftermath(r: ImpactResult): Stage[] {
  const E = r.effectiveEnergyMt;
  const airburst = r.airburstAltitudeM !== null;
  const global = !airburst && E >= GLOBAL_EFFECTS_MT;
  const stages: Stage[] = [];

  // 0 s — the impact itself.
  const impact: Fact[] = [];
  if (airburst) impact.push({ key: 'af.impact.airburst', dist: r.airburstAltitudeM! });
  else impact.push({ key: 'af.impact.ground', dist: r.craterDiameterM! });
  if (r.fireballRadiusM) impact.push({ key: 'af.impact.fireball', dist: r.fireballRadiusM * 2 });
  stages.push({ id: 'impact', pro: false, facts: impact });

  // Seconds to minutes — shock wave and ground shaking.
  const blast: Fact[] = [];
  const severe = ring(r, 'severe');
  const windows = ring(r, 'windows');
  if (severe) blast.push({ key: 'af.blast.severe', dist: severe.radiusM, time: severe.radiusM / SOUND_SPEED });
  if (windows) blast.push({ key: 'af.blast.windows', dist: windows.radiusM, time: windows.radiusM / SOUND_SPEED });
  if (r.seismicMagnitude !== null && severe) {
    blast.push({ key: 'af.blast.quake', m: r.seismicMagnitude, time: severe.radiusM / SEISMIC_SPEED });
  }
  if (!blast.length) blast.push({ key: 'af.blast.none' });

  // Minutes — ejecta falls back (ground impacts only).
  const ejecta: Fact[] = [];
  if (!airburst && r.transientCraterDiameterM) {
    const rim = (r.craterDiameterM ?? 0) / 2;
    const r1m = ejectaRadiusForThickness(r.transientCraterDiameterM, 1);
    const r1cm = ejectaRadiusForThickness(r.transientCraterDiameterM, 0.01);
    if (r1m > rim) ejecta.push({ key: 'af.ejecta.deep', dist: r1m });
    if (r1cm > rim) ejecta.push({ key: 'af.ejecta.dust', dist: r1cm });
    if (global) ejecta.push({ key: 'af.ejecta.global' });
  }

  // Hours — fires.
  const fires: Fact[] = [];
  const thermal = ring(r, 'thermal');
  if (thermal) fires.push({ key: 'af.fires.local', area: Math.PI * thermal.radiusM ** 2 });
  if (global) fires.push({ key: 'af.fires.global' });

  // Days to months — the sky.
  const sky: Fact[] = [];
  if (global) sky.push({ key: 'af.sky.global' });
  else if ((r.craterDiameterM ?? 0) >= 1000 || E >= 100) sky.push({ key: 'af.sky.regional' });

  // Years — climate.
  const climate: Fact[] = [];
  if (!airburst && E >= IMPACT_WINTER_MT) climate.push({ key: 'af.climate.winter', drop: 26 });
  else if (global) climate.push({ key: 'af.climate.cooling' });

  const later: Stage[] = [
    { id: 'ejecta', pro: true, facts: ejecta },
    { id: 'fires', pro: true, facts: fires },
    { id: 'sky', pro: true, facts: sky },
    { id: 'climate', pro: true, facts: climate },
  ].filter((s) => s.facts.length > 0) as Stage[];

  // Small impacts are over within minutes; say so rather than inventing stages.
  if (!later.length) blast.push({ key: 'af.blast.over' });
  stages.push({ id: 'blast', pro: false, facts: blast }, ...later);
  return stages;
}
