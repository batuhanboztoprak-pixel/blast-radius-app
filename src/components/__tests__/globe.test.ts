import { simulateImpact } from '../../physics/impact';
import { globePaths } from '../globe';

const rings = simulateImpact({ diameterM: 5000, velocityMs: 20_000, composition: 'rock', angleDeg: 45 }).rings;

describe('globePaths', () => {
  it('centres the impact and draws land, sphere and every ring', () => {
    const g = globePaths(41, 29, rings, 300);
    expect(g.impact![0]).toBeCloseTo(150, 5);
    expect(g.impact![1]).toBeCloseTo(150, 5);
    expect(g.sphere.startsWith('M')).toBe(true);
    expect(g.land.length).toBeGreaterThan(1000);
    expect(g.rings.map((r) => r.kind)).toEqual(rings.map((r) => r.kind));
    for (const r of g.rings) expect(r.d.startsWith('M')).toBe(true);
  });

  it('hides the impact marker when the globe is turned to the far side', () => {
    expect(globePaths(41, 29, rings, 300, -41, -151).impact).toBeNull();
  });
});
