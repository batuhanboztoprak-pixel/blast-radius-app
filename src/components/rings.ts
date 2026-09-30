import type { Ring } from '../physics/impact';
import { colors } from '../theme';

export const RING_STYLE: Record<Ring['kind'], { label: string; color: string; fill: string; stroke: string }> = {
  crater: {
    label: 'Crater',
    color: colors.accent,
    fill: 'rgba(255,107,74,0.55)',
    stroke: 'rgba(255,107,74,1)',
  },
  thermal: {
    label: '3rd-degree burns',
    color: colors.magenta,
    fill: 'rgba(224,92,255,0.10)',
    stroke: 'rgba(224,92,255,0.8)',
  },
  severe: {
    label: 'Severe shockwave',
    color: colors.yellow,
    fill: 'rgba(255,196,74,0.12)',
    stroke: 'rgba(255,196,74,0.8)',
  },
  windows: {
    label: 'Window breakage',
    color: colors.blue,
    fill: 'rgba(74,158,255,0.08)',
    stroke: 'rgba(74,158,255,0.7)',
  },
};

/** Rings the user is allowed to see: thermal is a Pro feature. */
export function visibleRings(rings: Ring[], isPro: boolean): Ring[] {
  return rings.filter((r) => isPro || r.kind !== 'thermal');
}

/** Radius to frame on a map when an impact produces no rings (e.g. a high airburst). */
export const FALLBACK_FRAME_RADIUS_M = 20_000;
