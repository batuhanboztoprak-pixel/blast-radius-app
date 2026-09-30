import {
  J_PER_MT,
  overpressureAt,
  radiusForOverpressure,
  simulateImpact,
  type ImpactorParams,
} from '../impact';
import { PRESETS } from '../presets';

const rock = (diameterM: number, velocityMs = 20_000): ImpactorParams => ({
  diameterM,
  velocityMs,
  composition: 'rock',
  angleDeg: 45,
});

const ring = (r: ReturnType<typeof simulateImpact>, kind: string) =>
  r.rings.find((x) => x.kind === kind)?.radiusM;

describe('simulateImpact', () => {
  it('computes kinetic energy from mass and speed', () => {
    const r = simulateImpact(rock(1000, 20_000));
    const mass = (3000 * Math.PI * 1000 ** 3) / 6;
    expect(r.massKg).toBeCloseTo(mass, -6);
    expect(r.entryEnergyJ).toBeCloseTo(0.5 * mass * 20_000 ** 2, -12);
  });

  it('reproduces Meteor Crater (~1.2 km) for a 50 m iron impactor', () => {
    const r = simulateImpact({ diameterM: 50, velocityMs: 12_800, composition: 'iron', angleDeg: 45 });
    expect(r.airburstAltitudeM).toBeNull();
    expect(r.craterType).toBe('simple');
    expect(r.craterDiameterM!).toBeGreaterThan(900);
    expect(r.craterDiameterM!).toBeLessThan(1800);
  });

  it('makes Tunguska an airburst of roughly 5–20 Mt a few km up', () => {
    const tunguska = PRESETS.find((p) => p.id === 'tunguska')!;
    const r = simulateImpact(tunguska.params);
    expect(r.airburstAltitudeM).not.toBeNull();
    expect(r.airburstAltitudeM!).toBeGreaterThan(2_000);
    expect(r.airburstAltitudeM!).toBeLessThan(15_000);
    expect(r.effectiveEnergyMt).toBeGreaterThan(5);
    expect(r.effectiveEnergyMt).toBeLessThan(20);
    expect(r.craterDiameterM).toBeNull();
    expect(r.seismicMagnitude).toBeNull();
    // Severe damage over roughly the flattened-forest area (~26 km radius).
    expect(ring(r, 'severe')!).toBeGreaterThan(5_000);
    expect(ring(r, 'severe')!).toBeLessThan(40_000);
  });

  it('bursts Chelyabinsk high in the atmosphere', () => {
    const r = simulateImpact(PRESETS.find((p) => p.id === 'chelyabinsk')!.params);
    expect(r.airburstAltitudeM!).toBeGreaterThan(20_000);
    expect(r.airburstAltitudeM!).toBeLessThan(45_000);
    expect(r.entryEnergyMt).toBeGreaterThan(0.3);
    expect(r.entryEnergyMt).toBeLessThan(0.8);
  });

  it('makes Chicxulub a ~100+ km complex crater and a magnitude ~10 quake', () => {
    const r = simulateImpact(PRESETS.find((p) => p.id === 'chicxulub')!.params);
    expect(r.craterType).toBe('complex');
    expect(r.craterDiameterM!).toBeGreaterThan(100_000);
    expect(r.craterDiameterM!).toBeLessThan(250_000);
    expect(r.seismicMagnitude!).toBeGreaterThan(9);
    expect(r.seismicMagnitude!).toBeLessThan(11);
    expect(r.entryEnergyJ / J_PER_MT).toBeGreaterThan(1e7);
  });

  it('sorts rings largest first and orders them physically', () => {
    const r = simulateImpact(rock(450, 19_000));
    const radii = r.rings.map((x) => x.radiusM);
    expect([...radii].sort((a, b) => b - a)).toEqual(radii);
    expect(ring(r, 'windows')!).toBeGreaterThan(ring(r, 'severe')!);
    expect(ring(r, 'severe')!).toBeGreaterThan(ring(r, 'crater')!);
  });

  it('grows every effect with size', () => {
    const small = simulateImpact(rock(300));
    const big = simulateImpact(rock(3000));
    for (const kind of ['crater', 'severe', 'windows', 'thermal']) {
      expect(ring(big, kind)!).toBeGreaterThan(ring(small, kind)!);
    }
    expect(big.seismicMagnitude!).toBeGreaterThan(small.seismicMagnitude!);
  });

  it('lets iron penetrate where a comet of the same size bursts', () => {
    const comet = simulateImpact({ diameterM: 40, velocityMs: 20_000, composition: 'comet', angleDeg: 45 });
    const iron = simulateImpact({ diameterM: 40, velocityMs: 20_000, composition: 'iron', angleDeg: 45 });
    expect(comet.airburstAltitudeM).not.toBeNull();
    expect(iron.airburstAltitudeM).toBeNull();
    expect(iron.craterDiameterM).not.toBeNull();
  });

  it('caps planet-scale rings instead of returning absurd radii', () => {
    const r = simulateImpact(rock(10_000, 72_000));
    for (const x of r.rings) expect(x.radiusM).toBeLessThanOrEqual(10_000_000);
    expect(r.rings.some((x) => x.capped)).toBe(true);
  });

  it('returns finite numbers across the whole slider range', () => {
    for (const d of [10, 30, 100, 300, 1000, 3000, 10_000]) {
      for (const v of [11_000, 20_000, 40_000, 72_000]) {
        for (const composition of ['rock', 'iron', 'comet'] as const) {
          const r = simulateImpact({ diameterM: d, velocityMs: v, composition, angleDeg: 45 });
          expect(Number.isFinite(r.effectiveEnergyJ)).toBe(true);
          expect(r.effectiveEnergyJ).toBeGreaterThan(0);
          expect(r.finalVelocityMs).toBeGreaterThan(0);
          expect(r.finalVelocityMs).toBeLessThanOrEqual(v);
          for (const x of r.rings) expect(Number.isFinite(x.radiusM)).toBe(true);
        }
      }
    }
  });
});

describe('air blast', () => {
  it('matches the 1 kt reference point (75 kPa at 290 m, surface burst)', () => {
    expect(overpressureAt(290, 4.184e12, 0)).toBeCloseTo(75_000, -2);
  });

  it('falls monotonically with distance, for surface and air bursts', () => {
    for (const zb of [0, 2_000, 8_000, 30_000]) {
      let prev = Infinity;
      for (let r = 100; r < 500_000; r *= 1.3) {
        const p = overpressureAt(r, 1e17, zb);
        expect(p).toBeLessThanOrEqual(prev);
        prev = p;
      }
    }
  });

  it('inverts overpressure back to a radius', () => {
    const E = 4.184e15; // 1 Mt
    const r = radiusForOverpressure(34_500, E, 0)!;
    expect(overpressureAt(r, E, 0)).toBeCloseTo(34_500, -1);
    // 1 Mt surface burst: 5 psi at ~4.5 km (Glasstone & Dolan).
    expect(r).toBeGreaterThan(3_500);
    expect(r).toBeLessThan(5_500);
  });
});
