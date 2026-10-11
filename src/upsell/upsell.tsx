import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { WELCOME_KEY } from '../config';
import { usePremium } from '../state/premium';
import {
  EMPTY_STATE,
  EMPTY_STATS,
  accessFor,
  cinematicAccess,
  canTryFree,
  countStat,
  hasTicket,
  parseState,
  parseStats,
  planCinematic,
  spendTicket,
  takeFreeTry,
  type Access,
  type CinematicAccess,
  type Feature,
  type LockedItem,
  type PresetId,
  type SimulationPlan,
  type UpgradeSource,
  type UpgradeStats,
  type UpsellState,
} from './entitlements';

const STATE_KEY = 'blast-radius:upsell';
const STATS_KEY = 'blast-radius:upgrade-stats';

/** What the strike on the result screen was allowed to show. */
export interface Run {
  id: number;
  /** This strike used a preset's free try. */
  freeTry: PresetId | null;
  /** The burns ring is unlocked for this strike (Pro or a free try). */
  burns: boolean;
  /** This strike plays the cinematic sequence (Pro, first-strike taste or ticket). */
  cinematic: boolean;
  /** The whole aftermath timeline is unlocked for this strike (Pro or a free try). */
  aftermath: boolean;
}

/** Items a ticket can unlock for the strike already on screen. */
export type RunItem = 'burns' | 'cinematic' | 'aftermath';

interface UpsellContext {
  state: UpsellState;
  access: (item: LockedItem) => Access;
  /** Commit a plan from planSimulation() when the user taps Simulate. */
  beginRun: (plan: Extract<SimulationPlan, { ok: true }>, wantCinematic: boolean) => void;
  cinematic: CinematicAccess;
  run: Run | null;
  /** Spend a ticket on the strike being shown, if there is one. */
  unlockForRun: (item: RunItem) => void;
  /** Whether "Try it once free" is still available for this item. */
  canTryFree: (item: LockedItem) => boolean;
  /** Use the item's one free try: unlocks it for one strike. */
  tryFree: (item: LockedItem) => void;
  openPaywall: (feature: Feature, source: UpgradeSource, item?: LockedItem) => void;
  stats: UpgradeStats;
  resetStats: () => void;
  /** Dev builds: forget free tries, the cinematic taste and tickets. */
  resetForTesting: () => void;
}

const Ctx = createContext<UpsellContext | null>(null);

export function UpsellProvider({ children }: { children: ReactNode }) {
  const { isPro, purchasedAt } = usePremium();
  const [state, setState] = useState<UpsellState>(EMPTY_STATE);
  const [stats, setStats] = useState<UpgradeStats>(EMPTY_STATS);
  const [run, setRun] = useState<Run | null>(null);
  const runId = useRef(0);
  /** The prompt that opened the paywall most recently this session. */
  const lastSource = useRef<UpgradeSource | null>(null);

  useEffect(() => {
    AsyncStorage.multiGet([STATE_KEY, STATS_KEY])
      .then(([[, s], [, st]]) => {
        // Merge with anything earned before storage finished loading.
        setState((cur) => {
          const saved = parseState(s);
          const tried = [...new Set([...(saved.freeTried ?? []), ...(cur.freeTried ?? [])])];
          return {
            freeTriesUsed: [...new Set([...saved.freeTriesUsed, ...cur.freeTriesUsed])],
            tickets: [...new Set([...saved.tickets, ...cur.tickets])],
            ...(saved.cinematicTasted || cur.cinematicTasted ? { cinematicTasted: true } : {}),
            ...(tried.length ? { freeTried: tried } : {}),
          };
        });
        setStats(parseStats(st));
      })
      .catch(() => {});
  }, []);

  const update = useCallback((f: (s: UpsellState) => UpsellState) => {
    setState((cur) => {
      const next = f(cur);
      if (next !== cur) AsyncStorage.setItem(STATE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const bump = useCallback(
    <K extends keyof UpgradeStats>(bucket: K, key: keyof UpgradeStats[K] & string) => {
      setStats((cur) => {
        const next = countStat(cur, bucket, key);
        AsyncStorage.setItem(STATS_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [],
  );

  // Credit a purchase to the prompt that opened the paywall.
  useEffect(() => {
    if (purchasedAt === null) return;
    bump('purchased', lastSource.current ?? 'other');
    lastSource.current = null;
  }, [purchasedAt, bump]);

  const beginRun = useCallback<UpsellContext['beginRun']>(
    (plan, wantCinematic) => {
      const cine = planCinematic(plan.next, isPro, wantCinematic);
      update(() => cine.next);
      runId.current += 1;
      setRun({
        id: runId.current,
        freeTry: plan.freeTry,
        burns: isPro,
        cinematic: cine.cinematic,
        aftermath: isPro,
      });
    },
    [update, isPro],
  );

  const unlockForRun = useCallback(
    (item: RunItem) => {
      if (!run || run[item] || !hasTicket(state, item)) return;
      update((s) => spendTicket(s, item));
      setRun({ ...run, [item]: true });
    },
    [run, state, update],
  );

  const tryFree = useCallback(
    (item: LockedItem) => {
      update((s) => takeFreeTry(s, item));
      bump('rewarded', item);
    },
    [update, bump],
  );

  const openPaywall = useCallback<UpsellContext['openPaywall']>(
    (feature, source, item) => {
      lastSource.current = source;
      bump('opened', source);
      router.push({ pathname: '/paywall', params: item ? { feature, source, item } : { feature, source } });
    },
    [bump],
  );

  const resetStats = useCallback(() => {
    setStats(EMPTY_STATS);
    AsyncStorage.removeItem(STATS_KEY).catch(() => {});
  }, []);

  const resetForTesting = useCallback(() => {
    if (!__DEV__) return;
    update(() => EMPTY_STATE);
    // Show the welcome cards again on the next launch.
    AsyncStorage.removeItem(WELCOME_KEY).catch(() => {});
  }, [update]);

  const value = useMemo<UpsellContext>(
    () => ({
      state,
      access: (item) => accessFor(state, item, isPro),
      cinematic: cinematicAccess(state, isPro),
      beginRun,
      run,
      unlockForRun,
      canTryFree: (item) => canTryFree(state, item, isPro),
      tryFree,
      openPaywall,
      stats,
      resetStats,
      resetForTesting,
    }),
    [state, isPro, beginRun, run, unlockForRun, tryFree, openPaywall, stats, resetStats, resetForTesting],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUpsell(): UpsellContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useUpsell must be used inside UpsellProvider');
  return ctx;
}
