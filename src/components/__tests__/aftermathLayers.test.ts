import { aftermath } from '../../physics/aftermath';
import { simulateImpact } from '../../physics/impact';
import { PRESETS } from '../../physics/presets';
import { stageLayers } from '../aftermathLayers';

const chx = simulateImpact(PRESETS.find((p) => p.id === 'chicxulub')!.params);
const stages = aftermath(chx);
const layers = (id: string) => stageLayers(stages.find((s) => s.id === id), chx);

describe('aftermath map layers', () => {
  it('keeps the normal rings for the shock wave, with pulses running out to the window ring', () => {
    const l = layers('blast');
    expect([l.circles, l.hideRings, l.tint, l.extentM]).toEqual([[], false, 'none', null]);
    expect(l.effect?.kind).toBe('shock');
  });

  it('animates each stage: debris inside the ejecta zone, embers and dust worldwide, snow for the winter', () => {
    expect(layers('ejecta').effect).toMatchObject({ kind: 'debris' });
    expect(layers('ejecta').effect!.innerM).toBeLessThan(layers('ejecta').effect!.radiusM!);
    expect(layers('fires').effect).toEqual({ kind: 'embers', radiusM: null });
    expect(layers('sky').effect).toEqual({ kind: 'dust', radiusM: null });
    expect(layers('climate').effect).toEqual({ kind: 'snow', radiusM: null });
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
