import { aftermath } from '../../physics/aftermath';
import { simulateImpact } from '../../physics/impact';
import { PRESETS } from '../../physics/presets';
import { stageLayers } from '../aftermathLayers';

const chx = simulateImpact(PRESETS.find((p) => p.id === 'chicxulub')!.params);
const stages = aftermath(chx);
const layers = (id: string) => stageLayers(stages.find((s) => s.id === id), chx);

describe('aftermath map layers', () => {
  it('keeps the normal rings for the shock wave', () => {
    expect(layers('blast')).toEqual({ circles: [], hideRings: false, tint: 'none', extentM: null });
  });

  it('draws the fireball, ejecta zones and fires as circles', () => {
    expect(layers('impact').circles.map((c) => c.key)).toEqual(['fireball', 'crater']);
    expect(layers('ejecta').circles.map((c) => c.key)).toEqual(['dust', 'deep', 'crater']);
    expect(layers('fires').circles[0].key).toBe('fires');
  });

  it('tints the whole map for global stages', () => {
    expect(layers('fires').tint).toBe('fire');
    expect(layers('sky').tint).toBe('dark');
    expect(layers('climate').tint).toBe('frost');
  });

  it('shows nothing extra for a missing stage', () => {
    expect(stageLayers(undefined, chx).circles).toEqual([]);
  });
});
