import { dec, formatDistance, formatEnergyMt, formatPeople, formatSpeed, formatSpeedPerHour, formatYears, sig3 } from '../../physics/format';
import { CATALOGS, LANGUAGES, matchLanguage, setLanguage, t, tPlural, upper } from '../core';
import { en } from '../locales/en';

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

afterEach(() => setLanguage('en', 'en-US'));

describe('catalogues', () => {
  it.each(LANGUAGES)('%s has every English key, no extras, and the same {placeholders}', (lang) => {
    const cat = CATALOGS[lang];
    expect(Object.keys(cat).sort()).toEqual(Object.keys(en).sort());
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(cat[key].trim().length).toBeGreaterThan(0);
      expect({ key, p: placeholders(cat[key]) }).toEqual({ key, p: placeholders(en[key]) });
    }
  });
});

describe('language matching', () => {
  it('maps device tags to shipped languages and falls back to English', () => {
    expect(matchLanguage('pt-BR')).toBe('pt');
    expect(matchLanguage('tr_TR')).toBe('tr');
    expect(matchLanguage('ja-JP')).toBe('ja');
    expect(matchLanguage('zh-Hans-CN')).toBe('en');
    expect(matchLanguage(undefined)).toBe('en');
  });
});

describe('formatting per language', () => {
  it('uses the locale separators', () => {
    setLanguage('de', 'de-DE');
    expect(sig3(12_437)).toBe('12.400');
    expect(sig3(3.7249)).toBe('3,72');
    expect(dec(7.25, 1)).toBe('7,3');
    setLanguage('tr', 'tr-TR');
    expect(formatPeople(3_456_000)).toBe('3,46 milyon');
  });

  it('counts in 万 and 億 in Japanese', () => {
    setLanguage('ja', 'ja-JP');
    expect(formatPeople(3_456_000)).toBe('346万');
    expect(formatPeople(8.3e9)).toBe('83億');
    expect(formatEnergyMt(7.5e7)).toEqual({ value: '7,500', unit: '万メガトン' });
    expect(formatYears(98_700)).toBe('約9.87万年に1回');
  });

  it('fills placeholders and picks plural forms', () => {
    expect(t('asteroid.target', { place: 'Oslo' })).toBe('Target: Oslo');
    expect(tPlural('plural.strikes', 1, { pct: '99.9' })).toBe('99.9% of humanity after 1 strike.');
    expect(tPlural('plural.strikes', 2, { pct: '99.9' })).toBe('99.9% of humanity after 2 strikes.');
    setLanguage('fr', 'fr-FR');
    expect(tPlural('plural.strikes', 0, { pct: '100' })).toContain('0 impact.');
  });

  it('upper-cases Turkish with a dotted İ', () => {
    setLanguage('tr', 'tr-TR');
    expect(upper('istanbul')).toBe('İSTANBUL');
  });
});

describe('imperial units', () => {
  it('shows feet and miles', () => {
    expect(formatDistance(30, 'imperial')).toBe('98.4 ft');
    expect(formatDistance(16_093.44, 'imperial')).toBe('10 mi');
    expect(formatSpeed(20_000, 'imperial')).toBe('12.4 mi/s');
    expect(formatSpeedPerHour(20_000, 'imperial')).toBe('44,700 mph');
    expect(formatSpeedPerHour(20_000)).toBe('72,000 km/h');
  });
});
