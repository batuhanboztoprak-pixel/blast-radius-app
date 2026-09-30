/**
 * Who may use which Pro feature on the next simulation. Pure TypeScript (no
 * React Native imports) so it can be unit-tested; src/upsell/upsell.tsx holds
 * the state and persists it.
 *
 * Free users get:
 *  - one free strike with each Pro preset ("free try"), remembered forever;
 *  - a one-strike "ticket" for any locked item after watching a rewarded ad.
 *    Tickets are granted only when the ad's reward event fires and are spent by
 *    the next simulation that uses the item.
 */
import type { Composition } from '../physics/impact';

export type PresetId = 'tunguska' | 'chelyabinsk' | 'chicxulub';
export const PRESET_IDS: PresetId[] = ['tunguska', 'chelyabinsk', 'chicxulub'];

/** Anything a free user can see but not use. */
export type LockedItem = 'iron' | 'comet' | 'burns' | PresetId;

/** Paywall topics; `ads` has no item to try. */
export type Feature = 'burns' | 'compositions' | 'presets' | 'ads';
export const FEATURES: Feature[] = ['burns', 'compositions', 'presets', 'ads'];

export interface UpsellState {
  /** Presets whose free strike has been used. */
  freeTriesUsed: PresetId[];
  /** Rewarded-ad unlocks waiting to be spent, one strike each. */
  tickets: LockedItem[];
}

export const EMPTY_STATE: UpsellState = { freeTriesUsed: [], tickets: [] };

export interface Selection {
  composition: Composition;
  presetId: PresetId | null;
}

export function isPresetId(x: unknown): x is PresetId {
  return typeof x === 'string' && (PRESET_IDS as string[]).includes(x);
}

export function isLockedItem(x: unknown): x is LockedItem {
  return x === 'iron' || x === 'comet' || x === 'burns' || isPresetId(x);
}

export function isFeature(x: unknown): x is Feature {
  return typeof x === 'string' && (FEATURES as string[]).includes(x);
}

export function featureFor(item: LockedItem): Feature {
  if (item === 'burns') return 'burns';
  if (item === 'iron' || item === 'comet') return 'compositions';
  return 'presets';
}

/** Pro items the selection needs (the burns ring is decided on the result screen). */
export function itemsNeeded(sel: Selection): LockedItem[] {
  const items: LockedItem[] = [];
  if (sel.composition !== 'rock') items.push(sel.composition);
  if (sel.presetId) items.push(sel.presetId);
  return items;
}

export const hasTicket = (s: UpsellState, item: LockedItem) => s.tickets.includes(item);

export const freeTryAvailable = (s: UpsellState, id: PresetId) => !s.freeTriesUsed.includes(id);

/** How a locked item can be used right now, if at all. */
export type Access = 'pro' | 'ticket' | 'freeTry' | 'locked';

export function accessFor(s: UpsellState, item: LockedItem, isPro: boolean): Access {
  if (isPro) return 'pro';
  if (hasTicket(s, item)) return 'ticket';
  if (isPresetId(item) && freeTryAvailable(s, item)) return 'freeTry';
  return 'locked';
}

export type SimulationPlan =
  | {
      ok: true;
      /** State after spending tickets and free tries. */
      next: UpsellState;
      /** Set when this strike uses up a preset's free try. */
      freeTry: PresetId | null;
      /** Tickets this strike spends. */
      spent: LockedItem[];
    }
  | { ok: false; item: LockedItem; feature: Feature };

/**
 * Decide whether a free user may simulate `sel`, and what it costs. A ticket is
 * spent before a free try, so watching an ad never wastes the free strike.
 */
export function planSimulation(s: UpsellState, sel: Selection, isPro: boolean): SimulationPlan {
  if (isPro) return { ok: true, next: s, freeTry: null, spent: [] };
  let next = s;
  let freeTry: PresetId | null = null;
  const spent: LockedItem[] = [];
  for (const item of itemsNeeded(sel)) {
    const access = accessFor(next, item, false);
    if (access === 'locked') return { ok: false, item, feature: featureFor(item) };
    if (access === 'ticket') {
      next = spendTicket(next, item);
      spent.push(item);
    } else if (access === 'freeTry' && isPresetId(item)) {
      next = { ...next, freeTriesUsed: [...next.freeTriesUsed, item] };
      freeTry = item;
    }
  }
  return { ok: true, next, freeTry, spent };
}

/** Grant a one-strike unlock. Call only after the rewarded ad's reward event. */
export function grantTicket(s: UpsellState, item: LockedItem): UpsellState {
  return hasTicket(s, item) ? s : { ...s, tickets: [...s.tickets, item] };
}

export function spendTicket(s: UpsellState, item: LockedItem): UpsellState {
  return hasTicket(s, item) ? { ...s, tickets: s.tickets.filter((t) => t !== item) } : s;
}

/**
 * After a strike has spent its unlocks, a still-selected locked item would make
 * the next Simulate hit the paywall. Returns the change that puts the selection
 * back on free ground (rock, no preset), or null if nothing is locked.
 */
export function freeFallback(
  s: UpsellState,
  sel: Selection,
  isPro: boolean,
): { composition?: 'rock'; clearPreset?: true } | null {
  if (isPro) return null;
  const patch: { composition?: 'rock'; clearPreset?: true } = {};
  if (sel.composition !== 'rock' && accessFor(s, sel.composition, false) === 'locked') {
    patch.composition = 'rock';
  }
  if (sel.presetId && accessFor(s, sel.presetId, false) === 'locked') patch.clearPreset = true;
  return Object.keys(patch).length ? patch : null;
}

/** Parse persisted state defensively; unknown entries are dropped. */
export function parseState(raw: string | null): UpsellState {
  if (!raw) return EMPTY_STATE;
  try {
    const v = JSON.parse(raw) as Partial<Record<keyof UpsellState, unknown>>;
    const list = <T>(x: unknown, ok: (y: unknown) => y is T): T[] =>
      Array.isArray(x) ? [...new Set(x.filter(ok))] : [];
    return { freeTriesUsed: list(v.freeTriesUsed, isPresetId), tickets: list(v.tickets, isLockedItem) };
  } catch {
    return EMPTY_STATE;
  }
}

// --- Upgrade-source counters ---------------------------------------------------

/** Every prompt that can open the paywall. */
export type UpgradeSource =
  | 'burns-card'
  | 'burns-tag'
  | 'burns-legend'
  | 'composition-chip'
  | 'preset-chip'
  | 'locked-simulate'
  | 'free-try-card'
  | 'ad-nudge'
  | 'other';

export const UPGRADE_SOURCES: UpgradeSource[] = [
  'burns-card',
  'burns-tag',
  'burns-legend',
  'composition-chip',
  'preset-chip',
  'locked-simulate',
  'free-try-card',
  'ad-nudge',
  'other',
];

export function isUpgradeSource(x: unknown): x is UpgradeSource {
  return typeof x === 'string' && (UPGRADE_SOURCES as string[]).includes(x);
}

export interface UpgradeStats {
  opened: Partial<Record<UpgradeSource, number>>;
  purchased: Partial<Record<UpgradeSource, number>>;
  /** Tries unlocked by watching a rewarded ad, per item. */
  rewarded: Partial<Record<LockedItem, number>>;
}

export const EMPTY_STATS: UpgradeStats = { opened: {}, purchased: {}, rewarded: {} };

export function countStat<K extends keyof UpgradeStats>(
  stats: UpgradeStats,
  bucket: K,
  key: keyof UpgradeStats[K] & string,
): UpgradeStats {
  const b = stats[bucket] as Record<string, number | undefined>;
  return { ...stats, [bucket]: { ...b, [key]: (b[key] ?? 0) + 1 } };
}

export function parseStats(raw: string | null): UpgradeStats {
  if (!raw) return EMPTY_STATS;
  try {
    const v = JSON.parse(raw) as Partial<UpgradeStats>;
    const obj = (x: unknown) => (x && typeof x === 'object' ? (x as Record<string, number>) : {});
    return { opened: obj(v.opened), purchased: obj(v.purchased), rewarded: obj(v.rewarded) };
  } catch {
    return EMPTY_STATS;
  }
}
