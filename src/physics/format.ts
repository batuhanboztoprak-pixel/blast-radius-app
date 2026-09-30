import type { Composition } from './impact';

const nf = (digits: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: digits, minimumFractionDigits: 0 });

/** 3 significant figures, grouped: 12,400 / 3.72 / 0.0451 */
export function sig3(n: number): string {
  if (!isFinite(n)) return '—';
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 1000) return nf(0).format(Number(n.toPrecision(3)));
  const digits = Math.max(0, 2 - Math.floor(Math.log10(abs)));
  return nf(digits).format(Number(n.toPrecision(3)));
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${sig3(m)} m`;
  return `${sig3(m / 1000)} km`;
}

export function formatDiameter(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${sig3(m / 1000)} km`;
}

export function formatSpeed(ms: number): string {
  return `${Math.round(ms / 1000)} km/s`;
}

/** Energy with a readable unit: kilotons below 1 Mt, million megatons from 1e6 Mt. */
export function formatEnergyMt(mt: number): { value: string; unit: string } {
  if (mt < 1) return { value: sig3(mt * 1000), unit: 'kilotons' };
  if (mt >= 1e6) return { value: sig3(mt / 1e6), unit: 'million megatons' };
  return { value: sig3(mt), unit: 'megatons' };
}

export function formatMultiple(x: number): string {
  if (x < 1) return `${sig3(x * 100)}% of`;
  if (x >= 1e9) return `${sig3(x / 1e9)} billion×`;
  if (x >= 1e6) return `${sig3(x / 1e6)} million×`;
  return `${sig3(x)}×`;
}

export function formatYears(y: number): string {
  if (y < 1) return 'several times a year';
  if (y < 1e6) return `every ~${sig3(y)} years`;
  if (y < 1e9) return `every ~${sig3(y / 1e6)} million years`;
  return `every ~${sig3(y / 1e9)} billion years`;
}

export const COMPOSITION_LABEL: Record<Composition, string> = {
  rock: 'Rock',
  iron: 'Iron',
  comet: 'Comet',
};
