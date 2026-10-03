/**
 * What the map shows for each aftermath stage. Pure, so it's easy to reason
 * about: the result screen passes the circles to ImpactMap and paints the tint
 * over the map.
 */
import type { Stage } from '../physics/aftermath';
import type { ImpactResult } from '../physics/impact';

export type StageTint = 'none' | 'fire' | 'dark' | 'frost';

/** A filled circle around the impact point, drawn on the map for a stage. */
export interface StageCircle {
  key: string;
  radiusM: number;
  fill: string;
  stroke: string;
}

/**
 * Animated particles drawn over the map for a stage. `radiusM` null means the
 * whole map (global effects); `innerM` concentrates part of them near the centre.
 */
export interface StageEffect {
  kind: 'fireball' | 'shock' | 'debris' | 'embers' | 'dust' | 'snow';
  radiusM: number | null;
  innerM?: number;
}

export interface StageLayers {
  effect?: StageEffect;
  circles: StageCircle[];
  /** Hide the normal damage rings so the stage's own layers read clearly. */
  hideRings: boolean;
  tint: StageTint;
  /** Radius to frame on the map for this stage, or null to keep the usual framing. */
  extentM: number | null;
}

const NONE: StageLayers = { circles: [], hideRings: false, tint: 'none', extentM: null };

export const TINT_COLOR: Record<Exclude<StageTint, 'none'>, { color: string; opacity: number }> = {
  fire: { color: '#B8360F', opacity: 0.28 },
  dark: { color: '#05070C', opacity: 0.55 },
  frost: { color: '#CFE6FF', opacity: 0.32 },
};

const factDist = (s: Stage, key: string) => s.facts.find((f) => f.key === key)?.dist;

/** The largest damage ring (window breakage), the zone the later stages are drawn in. */
const outerRing = (r: ImpactResult, crater: number) =>
  r.rings.find((x) => x.kind === 'windows')?.radiusM ?? r.rings[0]?.radiusM ?? Math.max(crater * 20, 5000);

export function stageLayers(stage: Stage | undefined, r: ImpactResult): StageLayers {
  if (!stage) return NONE;
  const crater = r.craterDiameterM ? r.craterDiameterM / 2 : 0;
  const craterCircle: StageCircle[] = crater
    ? [{ key: 'crater', radiusM: crater, fill: 'rgba(255,107,74,0.55)', stroke: 'rgba(255,107,74,1)' }]
    : [];

  switch (stage.id) {
    case 'impact': {
      const fireball = r.fireballRadiusM ?? 0;
      const circles: StageCircle[] = fireball
        ? [{ key: 'fireball', radiusM: fireball, fill: 'rgba(255,209,102,0.55)', stroke: 'rgba(255,240,200,0.95)' }]
        : [];
      return {
        circles: [...circles, ...craterCircle],
        hideRings: true,
        tint: 'none',
        extentM: Math.max(fireball, crater, 2000) * 1.6,
        effect: { kind: 'fireball', radiusM: Math.max(fireball, crater, 500) },
      };
    }
    case 'blast': {
      const windows = r.rings.find((x) => x.kind === 'windows')?.radiusM;
      return windows ? { ...NONE, effect: { kind: 'shock', radiusM: windows } } : NONE;
    }
    case 'ejecta': {
      const deep = factDist(stage, 'af.ejecta.deep');
      const dust = factDist(stage, 'af.ejecta.dust');
      const circles: StageCircle[] = [];
      if (dust) circles.push({ key: 'dust', radiusM: dust, fill: 'rgba(170,128,86,0.22)', stroke: 'rgba(201,162,122,0.8)' });
      if (deep) circles.push({ key: 'deep', radiusM: deep, fill: 'rgba(120,82,50,0.6)', stroke: 'rgba(201,162,122,1)' });
      return {
        circles: [...circles, ...craterCircle],
        hideRings: true,
        tint: 'none',
        extentM: dust ?? deep ?? null,
        effect: { kind: 'debris', radiusM: dust ?? deep ?? crater, innerM: deep },
      };
    }
    // Every later stage stays inside its own ring on the map, even when the
    // real effect goes worldwide (the caption and the banner say so).
    case 'fires': {
      const burns = r.rings.find((x) => x.kind === 'thermal')?.radiusM;
      if (!burns) return NONE;
      return {
        circles: [{ key: 'fires', radiusM: burns, fill: 'rgba(255,90,40,0.42)', stroke: 'rgba(255,140,60,0.95)' }],
        hideRings: true,
        tint: 'none',
        extentM: burns,
        effect: { kind: 'embers', radiusM: burns },
      };
    }
    case 'sky': {
      const radiusM = outerRing(r, crater);
      return {
        circles: [{ key: 'dustcloud', radiusM, fill: 'rgba(40,40,46,0.6)', stroke: 'rgba(120,120,130,0.7)' }],
        hideRings: true,
        tint: 'none',
        extentM: radiusM * 1.08,
        effect: { kind: 'dust', radiusM },
      };
    }
    case 'climate': {
      const radiusM = outerRing(r, crater);
      return {
        circles: [{ key: 'frost', radiusM, fill: 'rgba(207,230,255,0.32)', stroke: 'rgba(207,230,255,0.85)' }],
        hideRings: true,
        tint: 'none',
        extentM: radiusM * 1.08,
        effect: { kind: 'snow', radiusM },
      };
    }
    default:
      return NONE;
  }
}
