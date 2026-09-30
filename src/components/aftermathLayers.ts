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

export interface StageLayers {
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

export function stageLayers(stage: Stage | undefined, r: ImpactResult): StageLayers {
  if (!stage) return NONE;
  const crater = r.craterDiameterM ? r.craterDiameterM / 2 : 0;
  const craterCircle: StageCircle[] = crater
    ? [{ key: 'crater', radiusM: crater, fill: 'rgba(255,107,74,0.55)', stroke: 'rgba(255,107,74,1)' }]
    : [];
  const global = stage.facts.some((f) => f.key.endsWith('.global'));

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
      };
    }
    case 'blast':
      return NONE;
    case 'ejecta': {
      const deep = factDist(stage, 'af.ejecta.deep');
      const dust = factDist(stage, 'af.ejecta.dust');
      const circles: StageCircle[] = [];
      if (dust) circles.push({ key: 'dust', radiusM: dust, fill: 'rgba(170,128,86,0.22)', stroke: 'rgba(201,162,122,0.8)' });
      if (deep) circles.push({ key: 'deep', radiusM: deep, fill: 'rgba(120,82,50,0.6)', stroke: 'rgba(201,162,122,1)' });
      return { circles: [...circles, ...craterCircle], hideRings: true, tint: global ? 'fire' : 'none', extentM: dust ?? deep ?? null };
    }
    case 'fires': {
      const burns = r.rings.find((x) => x.kind === 'thermal')?.radiusM;
      const circles: StageCircle[] = burns
        ? [{ key: 'fires', radiusM: burns, fill: 'rgba(255,90,40,0.42)', stroke: 'rgba(255,140,60,0.95)' }]
        : [];
      return { circles, hideRings: true, tint: global ? 'fire' : 'none', extentM: burns ?? null };
    }
    case 'sky': {
      if (global) return { circles: [], hideRings: true, tint: 'dark', extentM: null };
      const windows = r.rings.find((x) => x.kind === 'windows')?.radiusM ?? crater * 20;
      return {
        circles: [{ key: 'dustcloud', radiusM: windows * 1.2, fill: 'rgba(40,40,46,0.55)', stroke: 'rgba(120,120,130,0.6)' }],
        hideRings: true,
        tint: 'none',
        extentM: windows * 1.3,
      };
    }
    case 'climate':
      return { circles: [], hideRings: true, tint: 'frost', extentM: null };
    default:
      return NONE;
  }
}
