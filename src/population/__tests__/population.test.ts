import { simulateImpact } from '../../physics/impact';
import { PRESETS } from '../../physics/presets';
import { globalDeathFraction, populationImpact, WORLD_POPULATION } from '../casualties';
import { GRID_TOTAL_2015, peopleWithin2015 } from '../grid';

const NYC = { lat: 40.7128, lon: -74.006 };
const ISTANBUL = { lat: 41.0082, lon: 28.9784 };

describe('population grid', () => {
  it('holds the 2015 UN-adjusted world total (~7.3 billion)', () => {
    expect(GRID_TOTAL_2015).toBeGreaterThan(7.2e9);
    expect(GRID_TOTAL_2015).toBeLessThan(7.45e9);
    expect(peopleWithin2015(0, 0, 21_000_000)).toBeCloseTo(GRID_TOTAL_2015, -7);
  });

  it('puts ~15–25 million people within 50 km of New York and ~14 million within 40 km of Istanbul', () => {
    const ny = peopleWithin2015(NYC.lat, NYC.lon, 50_000);
    expect(ny).toBeGreaterThan(12e6);
    expect(ny).toBeLessThan(25e6);
    const ist = peopleWithin2015(ISTANBUL.lat, ISTANBUL.lon, 40_000);
    expect(ist).toBeGreaterThan(10e6);
    expect(ist).toBeLessThan(18e6);
  });

  it('finds almost nobody at Tunguska or the North Pole', () => {
    expect(peopleWithin2015(60.9, 101.9, 15_000)).toBeLessThan(5_000);
    expect(peopleWithin2015(89.5, 0, 200_000)).toBeLessThan(1_000);
  });

  it('grows with radius and is continuous where it switches grids at 300 km', () => {
    const radii = [500, 2_000, 10_000, 50_000, 299_000, 301_000, 1_000_000];
    const counts = radii.map((r) => peopleWithin2015(NYC.lat, NYC.lon, r));
    for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1] * 0.97);
    expect(Math.abs(counts[5] / counts[4] - 1)).toBeLessThan(0.08);
  });

  it('handles circles across the date line', () => {
    expect(peopleWithin2015(-17.7, 179.9, 300_000)).toBeGreaterThan(100_000); // Fiji
  });
});

describe('casualties', () => {
  it('has no global effects below ~1 km and a quarter of humanity at the Chapman–Morrison threshold', () => {
    expect(globalDeathFraction(1e4)).toBe(0);
    expect(globalDeathFraction(2.5e5)).toBeCloseTo(0.25, 5);
    expect(globalDeathFraction(1e9)).toBeCloseTo(0.95, 5);
  });

  it('counts people inside the 4 psi / burns radius for a city strike', () => {
    const r = simulateImpact({ diameterM: 150, velocityMs: 19_000, composition: 'rock', angleDeg: 45 });
    const p = populationImpact(r, NYC.lat, NYC.lon);
    expect(p.localCasualties).toBeGreaterThan(1e6);
    expect(p.globalDeaths).toBe(0);
    expect(p.totalDeaths).toBeCloseTo(p.localCasualties, 0);
    expect(p.inRing.windows!).toBeGreaterThanOrEqual(p.inRing.severe!);
  });

  it('kills most of humanity for Chicxulub, never more than are alive', () => {
    const r = simulateImpact(PRESETS.find((x) => x.id === 'chicxulub')!.params);
    const p = populationImpact(r, ISTANBUL.lat, ISTANBUL.lon);
    expect(p.totalDeaths / WORLD_POPULATION).toBeGreaterThan(0.9);
    expect(p.totalDeaths).toBeLessThanOrEqual(WORLD_POPULATION);
    const again = populationImpact(r, ISTANBUL.lat, ISTANBUL.lon, WORLD_POPULATION - p.totalDeaths);
    expect(again.totalDeaths).toBeLessThanOrEqual(WORLD_POPULATION - p.totalDeaths);
  });

  it('reports no casualties for the Chelyabinsk preset (model limitation, noted in-app)', () => {
    const r = simulateImpact(PRESETS.find((x) => x.id === 'chelyabinsk')!.params);
    expect(populationImpact(r, 55.15, 61.4).localCasualties).toBe(0);
  });
});
