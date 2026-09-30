import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { WORLD_POPULATION, type PopulationImpact } from '../population/casualties';

const STORAGE_KEY = 'blast-radius:world';

export interface Strike {
  /** Survivors before this strike. */
  before: number;
  impact: PopulationImpact;
}

interface WorldState {
  /** People left unharmed after every strike so far. */
  survivors: number;
  strikes: number;
  /** The most recent strike, for the result screen. Not persisted. */
  lastStrike: Strike | null;
  recordStrike: (compute: (survivorsBefore: number) => PopulationImpact) => void;
  reset: () => void;
}

const WorldContext = createContext<WorldState | null>(null);

/**
 * A running "world population remaining" counter: every simulated strike removes
 * its casualties, so users can keep hitting the planet until they reset it.
 */
export function WorldProvider({ children }: { children: ReactNode }) {
  const [survivors, setSurvivors] = useState(WORLD_POPULATION);
  const [strikes, setStrikes] = useState(0);
  const [lastStrike, setLastStrike] = useState<Strike | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw) as { survivors?: number; strikes?: number };
        if (typeof saved.survivors === 'number' && saved.survivors >= 0) setSurvivors(saved.survivors);
        if (typeof saved.strikes === 'number') setStrikes(saved.strikes);
      })
      .catch(() => {});
  }, []);

  const persist = (s: number, n: number) =>
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ survivors: s, strikes: n })).catch(() => {});

  const recordStrike = useCallback<WorldState['recordStrike']>(
    (compute) => {
      const impact = compute(survivors);
      const next = Math.max(0, survivors - impact.totalDeaths);
      setLastStrike({ before: survivors, impact });
      setSurvivors(next);
      setStrikes(strikes + 1);
      persist(next, strikes + 1);
    },
    [survivors, strikes],
  );

  const reset = useCallback(() => {
    setSurvivors(WORLD_POPULATION);
    setStrikes(0);
    setLastStrike(null);
    persist(WORLD_POPULATION, 0);
  }, []);

  const value = useMemo(
    () => ({ survivors, strikes, lastStrike, recordStrike, reset }),
    [survivors, strikes, lastStrike, recordStrike, reset],
  );
  return <WorldContext.Provider value={value}>{children}</WorldContext.Provider>;
}

export function useWorld(): WorldState {
  const ctx = useContext(WorldContext);
  if (!ctx) throw new Error('useWorld must be used inside WorldProvider');
  return ctx;
}
