import type { ImpactorParams } from './impact';

export interface Preset {
  id: 'tunguska' | 'chelyabinsk' | 'chicxulub';
  name: string;
  year: string;
  params: ImpactorParams;
  /** One honest line about the real event, shown on the result screen. */
  note: string;
}

export const PRESETS: Preset[] = [
  {
    id: 'tunguska',
    name: 'Tunguska',
    year: '1908',
    params: { diameterM: 60, velocityMs: 20_000, composition: 'rock', angleDeg: 45 },
    note: 'Exploded a few km above the Siberian taiga and flattened ~80 million trees over 2,150 km².',
  },
  {
    id: 'chelyabinsk',
    name: 'Chelyabinsk',
    year: '2013',
    params: { diameterM: 20, velocityMs: 19_000, composition: 'rock', angleDeg: 18 },
    note: 'Burst ~30 km up on a shallow path. Its shockwave broke windows across the region and injured ~1,500 people — more than this simplified model predicts for such a high, grazing airburst.',
  },
  {
    id: 'chicxulub',
    name: 'Chicxulub',
    year: '66 Mya',
    // ~15 km at 20 km/s and 60° reproduces the ~180 km crater. Collins et al. (2020,
    // Nat. Commun. 11:1480) found the impact came in at 45–60°; estimates of the
    // impactor's size run from ~10 to 17 km depending on the speed assumed.
    params: { diameterM: 15_000, velocityMs: 20_000, composition: 'rock', angleDeg: 60 },
    note: 'The dinosaur killer. Left a ~180 km crater and triggered a mass extinction. Ring sizes at this scale are rough — the effects were global.',
  },
];
