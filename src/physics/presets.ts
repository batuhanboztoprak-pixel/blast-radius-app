import { t } from '../i18n/core';
import type { ImpactorParams } from './impact';

export interface Preset {
  id: 'tunguska' | 'chelyabinsk' | 'chicxulub';
  params: ImpactorParams;
}

/** Name, year and one honest line about the real event, in the user's language. */
export function presetText(id: Preset['id']): { name: string; year: string; note: string } {
  return {
    name: t(`preset.${id}.name`),
    year: t(`preset.${id}.year`),
    note: t(`preset.${id}.note`),
  };
}

export const PRESETS: Preset[] = [
  {
    id: 'tunguska',
    params: { diameterM: 60, velocityMs: 20_000, composition: 'rock', angleDeg: 45 },
  },
  {
    id: 'chelyabinsk',
    params: { diameterM: 20, velocityMs: 19_000, composition: 'rock', angleDeg: 18 },
  },
  {
    id: 'chicxulub',
    // ~15 km at 20 km/s and 60° reproduces the ~180 km crater. Collins et al. (2020,
    // Nat. Commun. 11:1480) found the impact came in at 45–60°; estimates of the
    // impactor's size run from ~10 to 17 km depending on the speed assumed.
    params: { diameterM: 15_000, velocityMs: 20_000, composition: 'rock', angleDeg: 60 },
  },
];
