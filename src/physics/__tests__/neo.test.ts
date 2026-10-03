import { FAMOUS_ASTEROIDS, diameterFromH, impactSpeedMs, parseCad, parseCadDate, pickToday, upcoming } from '../neo';

// Shape of a real NASA/JPL CAD API response (fullname=true&diameter=true).
const SAMPLE = {
  signature: { version: '1.5', source: 'NASA/JPL SBDB Close Approach Data API' },
  count: 4,
  fields: ['des', 'orbit_id', 'jd', 'cd', 'dist', 'dist_min', 'dist_max', 'v_rel', 'v_inf', 't_sigma_f', 'h', 'diameter', 'diameter_sigma', 'fullname'],
  data: [
    ['2026 RP39', '7', '2461317.0', '2026-Oct-03 12:01', '0.0156281030385127', '0.0155', '0.0156', '6.13912174263024', '6.11128710939161', '< 00:01', '26.208', null, null, '       (2026 RP39)'],
    ['2026 TA', '3', '2461317.3', '2026-Oct-03 19:33', '0.00579578852858922', '0.0057', '0.0058', '19.0196494117811', '18.9954628829794', '< 00:01', '26.361', null, null, '       (2026 TA)'],
    ['433', '1', '2461320.0', '2026-Oct-06 04:00', '0.09', '0.09', '0.09', '5.9', '5.8', '< 00:01', '10.4', '16.84', null, '   433 Eros (A898 PA)'],
    ['bad', '1', '0', 'not a date', '0.01', '0', '0', '5', '5', '', '25', null, null, 'bad'],
  ],
};

describe('real asteroids (NASA/JPL close approaches)', () => {
  it('converts brightness to size like NASA does', () => {
    // H = 22 at albedo 0.14 is the classic ~140 m threshold.
    expect(diameterFromH(22)).toBeGreaterThan(130);
    expect(diameterFromH(22)).toBeLessThan(150);
  });

  it('adds Earth’s pull to the approach speed', () => {
    expect(impactSpeedMs(0)).toBeCloseTo(11_190, -1);
    expect(impactSpeedMs(19)).toBeCloseTo(Math.hypot(19, 11.19) * 1000, 0);
  });

  it('parses JPL dates', () => {
    expect(parseCadDate('2026-Oct-03 12:01')).toBe('2026-10-03T12:01:00.000Z');
    expect(parseCadDate('garbage')).toBeNull();
  });

  it('parses a response, skipping bad rows, and keeps values in the simulator’s range', () => {
    const list = parseCad(SAMPLE);
    expect(list.map((a) => a.id)).toEqual(['2026 RP39', '2026 TA', '433']);
    const ta = list[1];
    expect(ta.name).toBe('2026 TA');
    expect(ta.sizeEstimated).toBe(true);
    expect(ta.diameterM).toBeGreaterThan(10);
    expect(ta.distanceLd).toBeCloseTo((0.00579578852858922 * 149_597_870.7) / 384_400, 3);
    expect(ta.impactVelocityMs).toBeGreaterThan(19_000);
    const eros = list[2];
    expect(eros.name).toBe('433 Eros (A898 PA)');
    expect(eros.sizeEstimated).toBe(false);
    expect(eros.diameterM).toBe(16_840);
    for (const a of list) {
      expect(a.diameterM).toBeGreaterThanOrEqual(10);
      expect(a.diameterM).toBeLessThanOrEqual(20_000);
      expect(a.impactVelocityMs).toBeGreaterThanOrEqual(11_000);
      expect(a.impactVelocityMs).toBeLessThanOrEqual(72_000);
    }
  });

  it('returns nothing for a malformed response', () => {
    expect(parseCad(null)).toEqual([]);
    expect(parseCad({ fields: ['x'], data: [] })).toEqual([]);
  });

  it('picks the biggest asteroid passing this week', () => {
    const list = parseCad(SAMPLE);
    expect(pickToday(list, new Date('2026-10-03T00:00:00Z'))?.id).toBe('433');
    // After they have all passed there is nothing upcoming.
    expect(pickToday(list, new Date('2026-12-01T00:00:00Z'))).toBeNull();
    expect(upcoming(list, new Date('2026-10-05T00:00:00Z')).map((a) => a.id)).toEqual(['433']);
  });

  it('has famous asteroids to fall back on offline', () => {
    expect(FAMOUS_ASTEROIDS[0].name).toContain('Apophis');
    expect(pickToday(FAMOUS_ASTEROIDS, new Date('2026-10-03T00:00:00Z'))?.id).toBe('99942');
  });
});
