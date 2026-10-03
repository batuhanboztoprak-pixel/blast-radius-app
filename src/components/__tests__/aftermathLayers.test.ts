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

  it('keeps every stage inside its own ring, even for global effects', () => {
    const windows = chx.rings.find((x) => x.kind === 'windows')!.radiusM;
    const burns = chx.rings.find((x) => x.kind === 'thermal')!.radiusM;
    expect(layers('ejecta').effect).toMatchObject({ kind: 'debris' });
    expect(layers('ejecta').effect!.innerM).toBeLessThan(layers('ejecta').effect!.radiusM!);
    expect(layers('fires').effect).toEqual({ kind: 'embers', radiusM: burns });
    expect(layers('sky').effect).toEqual({ kind: 'dust', radiusM: windows });
    expect(layers('climate').effect).toEqual({ kind: 'snow', radiusM: windows });
    for (const id of ['impact', 'blast', 'ejecta', 'fires', 'sky', 'climate']) {
      expect(layers(id).effect?.radiusM).not.toBeNull();
    }
  });

  it('draws the fireball, ejecta zones and fires as circles', () => {
    expect(layers('impact').circles.map((c) => c.key)).toEqual(['fireball', 'crater']);
    expect(layers('ejecta').circles.map((c) => c.key)).toEqual(['dust', 'deep', 'crater']);
    expect(layers('fires').circles[0].key).toBe('fires');
  });

  it('never tints the whole map: the dark sky and the winter are circles at the outer ring', () => {
    for (const id of ['ejecta', 'fires', 'sky', 'climate']) expect(layers(id).tint).toBe('none');
    expect(layers('sky').circles.map((c) => c.key)).toEqual(['dustcloud']);
    expect(layers('climate').circles.map((c) => c.key)).toEqual(['frost']);
  });

  it('shows nothing extra for a missing stage', () => {
    expect(stageLayers(undefined, chx).circles).toEqual([]);
  });
});
