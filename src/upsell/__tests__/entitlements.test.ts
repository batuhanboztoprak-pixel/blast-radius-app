import {
  EMPTY_STATE,
  EMPTY_STATS,
  accessFor,
  countStat,
  freeFallback,
  grantTicket,
  parseState,
  parseStats,
  planSimulation,
  spendTicket,
  type UpsellState,
} from '../entitlements';

const rock = { composition: 'rock' as const, presetId: null };
const chicxulub = { composition: 'rock' as const, presetId: 'chicxulub' as const };
const iron = { composition: 'iron' as const, presetId: null };

describe('free tries', () => {
  it('lets each preset be struck once for free, then locks it', () => {
    const first = planSimulation(EMPTY_STATE, chicxulub, false);
    expect(first).toMatchObject({ ok: true, freeTry: 'chicxulub', spent: [] });
    if (!first.ok) throw new Error();
    expect(first.next.freeTriesUsed).toEqual(['chicxulub']);

    const second = planSimulation(first.next, chicxulub, false);
    expect(second).toEqual({ ok: false, item: 'chicxulub', feature: 'presets' });
  });

  it('tracks presets independently', () => {
    const s: UpsellState = { freeTriesUsed: ['chicxulub'], tickets: [] };
    expect(accessFor(s, 'tunguska', false)).toBe('freeTry');
    expect(accessFor(s, 'chicxulub', false)).toBe('locked');
  });

  it('spends a ticket before the free try', () => {
    const s = grantTicket(EMPTY_STATE, 'tunguska');
    const plan = planSimulation(s, { composition: 'rock', presetId: 'tunguska' }, false);
    expect(plan).toMatchObject({ ok: true, freeTry: null, spent: ['tunguska'] });
    if (!plan.ok) throw new Error();
    expect(plan.next).toEqual({ freeTriesUsed: [], tickets: [] });
  });
});

describe('rewarded unlocks', () => {
  it('unlocks a composition for exactly one simulation', () => {
    expect(planSimulation(EMPTY_STATE, iron, false)).toEqual({
      ok: false,
      item: 'iron',
      feature: 'compositions',
    });
    const s = grantTicket(EMPTY_STATE, 'iron');
    const plan = planSimulation(s, iron, false);
    expect(plan).toMatchObject({ ok: true, spent: ['iron'] });
    if (!plan.ok) throw new Error();
    expect(planSimulation(plan.next, iron, false).ok).toBe(false);
  });

  it('does not stack tickets for the same item', () => {
    const s = grantTicket(grantTicket(EMPTY_STATE, 'comet'), 'comet');
    expect(s.tickets).toEqual(['comet']);
  });

  it('keeps tickets that the strike does not use', () => {
    const s = grantTicket(grantTicket(EMPTY_STATE, 'comet'), 'burns');
    const plan = planSimulation(s, rock, false);
    expect(plan).toMatchObject({ ok: true, spent: [] });
    if (!plan.ok) throw new Error();
    expect(plan.next.tickets).toEqual(['comet', 'burns']);
    expect(spendTicket(plan.next, 'burns').tickets).toEqual(['comet']);
  });

  it('requires every locked part of the selection', () => {
    const s = grantTicket(EMPTY_STATE, 'comet');
    const plan = planSimulation({ ...s, freeTriesUsed: ['tunguska'] }, { composition: 'comet', presetId: 'tunguska' }, false);
    expect(plan).toEqual({ ok: false, item: 'tunguska', feature: 'presets' });
  });
});

describe('Pro and free features', () => {
  it('never charges Pro users or free features', () => {
    expect(planSimulation(EMPTY_STATE, { composition: 'comet', presetId: 'chicxulub' }, true)).toEqual({
      ok: true,
      next: EMPTY_STATE,
      freeTry: null,
      spent: [],
    });
    expect(planSimulation(EMPTY_STATE, rock, false)).toEqual({ ok: true, next: EMPTY_STATE, freeTry: null, spent: [] });
  });

  it('falls back to free choices once an unlock is spent', () => {
    const used: UpsellState = { freeTriesUsed: ['chicxulub'], tickets: [] };
    expect(freeFallback(used, { composition: 'iron', presetId: 'chicxulub' }, false)).toEqual({
      composition: 'rock',
      clearPreset: true,
    });
    expect(freeFallback(grantTicket(used, 'iron'), iron, false)).toBeNull();
    expect(freeFallback(EMPTY_STATE, chicxulub, false)).toBeNull();
    expect(freeFallback(used, iron, true)).toBeNull();
  });
});

describe('persistence', () => {
  it('drops junk and duplicates', () => {
    expect(parseState('{"freeTriesUsed":["chicxulub","x","chicxulub"],"tickets":["iron",3,"burns"]}')).toEqual({
      freeTriesUsed: ['chicxulub'],
      tickets: ['iron', 'burns'],
    });
    expect(parseState('not json')).toEqual(EMPTY_STATE);
    expect(parseState(null)).toEqual(EMPTY_STATE);
  });

  it('counts upgrade sources', () => {
    let s = countStat(EMPTY_STATS, 'opened', 'burns-card');
    s = countStat(s, 'opened', 'burns-card');
    s = countStat(s, 'purchased', 'burns-card');
    s = countStat(s, 'rewarded', 'iron');
    expect(parseStats(JSON.stringify(s))).toEqual({
      opened: { 'burns-card': 2 },
      purchased: { 'burns-card': 1 },
      rewarded: { iron: 1 },
    });
  });
});
