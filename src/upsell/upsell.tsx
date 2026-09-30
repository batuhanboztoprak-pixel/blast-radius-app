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

import { usePremium } from '../state/premium';
import {
  EMPTY_STATE,
  EMPTY_STATS,
  accessFor,
  countStat,
  grantTicket,
  hasTicket,
  parseState,
  parseStats,
  spendTicket,
  type Access,
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
  /** The burns ring is unlocked for this strike (rewarded ad). */
  burns: boolean;
}

interface UpsellContext {
  state: UpsellState;
  access: (item: LockedItem) => Access;
  /** Commit a plan from planSimulation() when the user taps Simulate. */
  beginRun: (plan: Extract<SimulationPlan, { ok: true }>) => void;
  run: Run | null;
  /** Spend a burns ticket on the strike being shown, if there is one. */
  unlockBurnsForRun: () => void;
  /** Call only from the rewarded ad's reward event. */
  grant: (item: LockedItem) => void;
  openPaywall: (feature: Feature, source: UpgradeSource, item?: LockedItem) => void;
  stats: UpgradeStats;
  resetStats: () => void;
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
          return {
            freeTriesUsed: [...new Set([...saved.freeTriesUsed, ...cur.freeTriesUsed])],
            tickets: [...new Set([...saved.tickets, ...cur.tickets])],
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
    (plan) => {
      update(() => plan.next);
      runId.current += 1;
      setRun({ id: runId.current, freeTry: plan.freeTry, burns: false });
    },
    [update],
  );

  const unlockBurnsForRun = useCallback(() => {
    if (!run || run.burns || !hasTicket(state, 'burns')) return;
    update((s) => spendTicket(s, 'burns'));
    setRun({ ...run, burns: true });
  }, [run, state, update]);

  const grant = useCallback(
    (item: LockedItem) => {
      update((s) => grantTicket(s, item));
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

  const value = useMemo<UpsellContext>(
    () => ({
      state,
      access: (item) => accessFor(state, item, isPro),
      beginRun,
      run,
      unlockBurnsForRun,
      grant,
      openPaywall,
      stats,
      resetStats,
    }),
    [state, isPro, beginRun, run, unlockBurnsForRun, grant, openPaywall, stats, resetStats],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUpsell(): UpsellContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useUpsell must be used inside UpsellProvider');
  return ctx;
}
