import {
  REWARDED_PER_DAY,
  dayKey,
  planCinematic,
  recordReward,
  rewardsLeft,
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

describe('cinematic strike', () => {
  it('gives free users one cinematic strike, then only with a ticket', () => {
    const first = planCinematic(EMPTY_STATE, false);
    expect(first.cinematic).toBe(true);
    expect(first.next.cinematicTasted).toBe(true);
    expect(planCinematic(first.next, false).cinematic).toBe(false);
    const withTicket = grantTicket(first.next, 'cinematic');
    const plan = planCinematic(withTicket, false);
    expect(plan.cinematic).toBe(true);
    expect(plan.next.tickets).toEqual([]);
  });

  it('is always on for Pro and never spends anything', () => {
    const s = { ...EMPTY_STATE, cinematicTasted: true };
    expect(planCinematic(s, true)).toEqual({ cinematic: true, next: s });
  });
});

describe('daily rewarded limit', () => {
  it('allows REWARDED_PER_DAY a day and resets the next day', () => {
    let s = EMPTY_STATE;
    for (let i = 0; i < REWARDED_PER_DAY; i++) s = recordReward(s, '2026-09-30');
    expect(rewardsLeft(s, '2026-09-30')).toBe(0);
    expect(rewardsLeft(s, '2026-10-01')).toBe(REWARDED_PER_DAY);
    expect(recordReward(s, '2026-10-01').rewards).toEqual({ day: '2026-10-01', count: 1 });
  });

  it('uses the local calendar day', () => {
    expect(dayKey(new Date(2026, 8, 30, 23, 59))).toBe('2026-09-30');
  });

  it('persists the new fields and drops bad ones', () => {
    expect(parseState('{"freeTriesUsed":[],"tickets":["cinematic"],"cinematicTasted":true,"rewards":{"day":"2026-09-30","count":2}}')).toEqual({
      freeTriesUsed: [],
      tickets: ['cinematic'],
      cinematicTasted: true,
      rewards: { day: '2026-09-30', count: 2 },
    });
    expect(parseState('{"freeTriesUsed":[],"tickets":[],"rewards":{"day":5}}')).toEqual(EMPTY_STATE);
  });
});
