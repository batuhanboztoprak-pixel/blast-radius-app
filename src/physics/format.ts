/**
 * Number and unit formatting in the user's language and preferred units.
 * Language and number locale come from ../i18n/core (set once at startup);
 * units are passed in because the user can switch them in the app.
 */
import { getLanguage, getNumberLocale, t } from '../i18n/core';
import type { Composition } from './impact';

export type Units = 'metric' | 'imperial';

const M_PER_MI = 1609.344;
const M_PER_FT = 0.3048;

const formatters = new Map<string, Intl.NumberFormat>();
function nf(digits: number): Intl.NumberFormat {
  const key = `${getNumberLocale()}|${digits}`;
  let f = formatters.get(key);
  if (!f) {
    try {
      f = new Intl.NumberFormat(getNumberLocale(), { maximumFractionDigits: digits, minimumFractionDigits: 0 });
    } catch {
      f = new Intl.NumberFormat('en-US', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
    }
    formatters.set(key, f);
  }
  return f;
}

/** 3 significant figures, grouped for the locale: 12,400 / 3.72 / 0.0451 (en) · 12.400 / 3,72 (de) */
export function sig3(n: number): string {
  if (!isFinite(n)) return '—';
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 1000) return nf(0).format(Number(n.toPrecision(3)));
  const digits = Math.max(0, 2 - Math.floor(Math.log10(abs)));
  return nf(digits).format(Number(n.toPrecision(3)));
}

/** Fixed decimals with the locale's separator: 7.2 → "7,2" in German. */
export function dec(n: number, digits: number): string {
  try {
    return new Intl.NumberFormat(getNumberLocale(), {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(n);
  } catch {
    return n.toFixed(digits);
  }
}

/** Whole number with locale grouping. */
export function int(n: number): string {
  return nf(0).format(Math.round(n));
}

/**
 * Large numbers in words, 3 significant figures: "3.46 million", "8.3 billion"
 * (or 346万 / 83億 in Japanese). Below a million it's just a grouped number.
 */
export function formatLarge(n: number): string {
  if (!isFinite(n)) return '—';
  if (getLanguage() === 'ja') {
    if (n >= 1e8) return `${sig3(n / 1e8)}億`;
    if (n >= 1e4) return `${sig3(n / 1e4)}万`;
    return sig3(n);
  }
  if (n >= 1e9) return t('num.billion', { n: sig3(n / 1e9) });
  if (n >= 1e6) return t('num.million', { n: sig3(n / 1e6) });
  return sig3(n);
}

export function formatDistance(m: number, units: Units = 'metric'): string {
  if (units === 'imperial') {
    const mi = m / M_PER_MI;
    if (mi < 0.1) return `${sig3(m / M_PER_FT)} ft`;
    return `${sig3(mi)} mi`;
  }
  if (m < 1000) return `${sig3(m)} m`;
  return `${sig3(m / 1000)} km`;
}

export function formatDiameter(m: number, units: Units = 'metric'): string {
  if (units === 'imperial') {
    if (m < M_PER_MI) return `${int(m / M_PER_FT)} ft`;
    return `${sig3(m / M_PER_MI)} mi`;
  }
  if (m < 1000) return `${int(m)} m`;
  return `${sig3(m / 1000)} km`;
}

/** 20 km/s · 12.4 mi/s */
export function formatSpeed(ms: number, units: Units = 'metric'): string {
  if (units === 'imperial') return `${sig3(ms / M_PER_MI)} mi/s`;
  return `${Math.round(ms / 1000)} km/s`;
}

/** 20 km/s → "72,000 km/h" · "44,700 mph" */
export function formatSpeedPerHour(ms: number, units: Units = 'metric'): string {
  if (units === 'imperial') return `${int(Math.round((ms * 3600) / M_PER_MI / 100) * 100)} mph`;
  return `${int(Math.round((ms * 3.6) / 1000) * 1000)} km/h`;
}

/** Energy with a readable unit: kilotons below 1 Mt, "million megatons" from 1e6 Mt. */
export function formatEnergyMt(mt: number): { value: string; unit: string } {
  if (mt < 1) return { value: sig3(mt * 1000), unit: t('energy.kilotons') };
  if (mt >= 1e6) {
    if (getLanguage() === 'ja') {
      // 7.5×10⁷ Mt → 7500万メガトン
      const [div, word] = mt >= 1e8 ? [1e8, '億'] : [1e4, '万'];
      return { value: sig3(mt / div), unit: `${word}${t('energy.megatons')}` };
    }
    return { value: sig3(mt / 1e6), unit: t('energy.millionMegatons') };
  }
  return { value: sig3(mt), unit: t('energy.megatons') };
}

/**
 * How many Hiroshima bombs, as a number without the "×": "411,000", "5 million".
 * Below one bomb, use hiroshimaPercent instead.
 */
export function formatMultiple(x: number): string {
  return x >= 1e6 ? formatLarge(x) : sig3(x);
}

export function hiroshimaPercent(x: number): string {
  return sig3(x * 100);
}

/** 0 / 842 / 12,300 / 3.46 million / 8.3 billion */
export function formatPeople(n: number): string {
  if (!isFinite(n) || n < 0.5) return '0';
  if (n < 1e6 && getLanguage() !== 'ja') {
    const r = Math.round(n);
    return int(Number(r.toPrecision(Math.min(3, String(r).length))));
  }
  if (getLanguage() === 'ja' && n < 1e4) return int(Number(Math.round(n).toPrecision(3)));
  return formatLarge(n);
}

export function formatYears(y: number): string {
  if (y < 1) return t('years.severalPerYear');
  return t('years.every', { n: formatLarge(y) });
}

/** 44 s · 4 min · 6 h */
export function formatDuration(seconds: number): string {
  if (seconds < 90) return t('time.s', { n: int(Math.max(1, seconds)) });
  if (seconds < 90 * 60) return t('time.min', { n: int(seconds / 60) });
  return t('time.h', { n: sig3(seconds / 3600) });
}

/** 22,800 km² · 8,800 mi² */
export function formatArea(m2: number, units: Units = 'metric'): string {
  if (units === 'imperial') return `${sig3(m2 / (M_PER_MI * M_PER_MI))} mi²`;
  if (m2 < 1e6) return `${sig3(m2)} m²`;
  return `${sig3(m2 / 1e6)} km²`;
}

/** A temperature *difference*: 26 °C · 47 °F */
export function formatTempDrop(celsius: number, units: Units = 'metric'): string {
  return units === 'imperial' ? `${int(celsius * 1.8)} °F` : `${int(celsius)} °C`;
}

export function compositionLabel(c: Composition): string {
  return t(`composition.${c}`);
}

/** ISO date → "6 Oct" (adds the year when it isn't this year), in the user's locale. */
export function formatShortDate(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  if (d.getUTCFullYear() !== now.getUTCFullYear()) opts.year = 'numeric';
  try {
    return new Intl.DateTimeFormat(getNumberLocale(), { ...opts, timeZone: 'UTC' }).format(d);
  } catch {
    return iso.slice(0, 10);
  }
}

/** Distance in Moon distances: "0.12" below 1, "4.1" above. */
export function formatLd(ld: number): string {
  return ld < 1 ? dec(ld, 2) : dec(ld, 1);
}
