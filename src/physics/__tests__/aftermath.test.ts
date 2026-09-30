import { aftermath, ejectaRadiusForThickness } from '../aftermath';
import { simulateImpact } from '../impact';
import { PRESETS } from '../presets';

const ids = (r: ReturnType<typeof aftermath>) => r.map((s) => s.id);
const keys = (r: ReturnType<typeof aftermath>) => r.flatMap((s) => s.facts.map((f) => f.key));

describe('aftermath timeline', () => {
  it('starts free and puts everything after the first minutes behind Pro', () => {
    const stages = aftermath(simulateImpact({ diameterM: 450, velocityMs: 19_000, composition: 'rock', angleDeg: 45 }));
    expect(stages.slice(0, 2).map((s) => [s.id, s.pro])).toEqual([
      ['impact', false],
      ['blast', false],
    ]);
    expect(stages.slice(2).every((s) => s.pro)).toBe(true);
    expect(ids(stages)).toEqual(['impact', 'blast', 'ejecta', 'fires', 'sky']);
  });

  it('gives Tunguska an airburst and no crater stages', () => {
    const stages = aftermath(simulateImpact(PRESETS.find((p) => p.id === 'tunguska')!.params));
    expect(keys(stages)).toContain('af.impact.airburst');
    expect(ids(stages)).not.toContain('ejecta');
    expect(ids(stages)).not.toContain('climate');
  });

  it('gives Chicxulub global fires, dark skies and an impact winter', () => {
    const stages = aftermath(simulateImpact(PRESETS.find((p) => p.id === 'chicxulub')!.params));
    expect(keys(stages)).toEqual(expect.arrayContaining(['af.ejecta.global', 'af.fires.global', 'af.sky.global', 'af.climate.winter']));
  });

  it('ends a small strike after the blast', () => {
    const stages = aftermath(simulateImpact({ diameterM: 25, velocityMs: 17_000, composition: 'rock', angleDeg: 45 }));
    expect(stages.every((s) => !s.pro)).toBe(true);
    expect(keys(stages)).toContain('af.blast.over');
  });

  it('thins ejecta with the cube of distance', () => {
    const r1 = ejectaRadiusForThickness(10_000, 1);
    expect(ejectaRadiusForThickness(10_000, 1 / 8)).toBeCloseTo(r1 * 2, 6);
  });

  it('times the blast at roughly the speed of sound', () => {
    const r = simulateImpact({ diameterM: 450, velocityMs: 19_000, composition: 'rock', angleDeg: 45 });
    const severe = aftermath(r).find((s) => s.id === 'blast')!.facts.find((f) => f.key === 'af.blast.severe')!;
    expect(severe.time! * 340).toBeCloseTo(severe.dist!, 0);
  });
});
