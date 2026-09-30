import { formatDistance, formatEnergyMt, formatMultiple, formatYears, sig3 } from '../format';

describe('format', () => {
  it('rounds to 3 significant figures with grouping', () => {
    expect(sig3(12_437)).toBe('12,400');
    expect(sig3(3.7249)).toBe('3.72');
    expect(sig3(0.04512)).toBe('0.0451');
  });

  it('switches units sensibly', () => {
    expect(formatDistance(740)).toBe('740 m');
    expect(formatDistance(78_800)).toBe('78.8 km');
    expect(formatEnergyMt(0.5)).toEqual({ value: '500', unit: 'kilotons' });
    expect(formatEnergyMt(6170)).toEqual({ value: '6,170', unit: 'megatons' });
    expect(formatEnergyMt(7.5e7)).toEqual({ value: '75', unit: 'million megatons' });
    expect(formatMultiple(411_234)).toBe('411,000×');
    expect(formatMultiple(5e6)).toBe('5 million×');
    expect(formatYears(98_700)).toBe('every ~98,700 years');
  });
});
