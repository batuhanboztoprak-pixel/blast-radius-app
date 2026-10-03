import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { FAMOUS_ASTEROIDS, parseCad, pickToday, upcoming, type RealAsteroid } from '../physics/neo';

/** Close approaches within 0.1 au (~39 Moon distances) over the next 60 days. */
const CAD_URL =
  'https://ssd-api.jpl.nasa.gov/cad.api?date-min=now&date-max=%2B60&dist-max=0.1&fullname=true&diameter=true';
const CACHE_KEY = 'blast-radius:neo';
const MAX_AGE_MS = 12 * 3600_000;

interface RealAsteroidsState {
  /** Today's highlighted asteroid (free for everyone). */
  today: RealAsteroid | null;
  /** Every upcoming approach, in date order (the full list is Pro). */
  list: RealAsteroid[];
  /** 'nasa' once live data has loaded; 'offline' while showing the built-in famous ones. */
  source: 'nasa' | 'offline';
}

const Ctx = createContext<RealAsteroidsState | null>(null);

/**
 * Loads upcoming real asteroid fly-bys from NASA/JPL once at launch (cached for
 * 12 hours), falling back to famous asteroids such as Apophis when offline.
 * No personal data is sent: it's a plain public request.
 */
export function RealAsteroidsProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<RealAsteroid[]>([]);
  const [source, setSource] = useState<'nasa' | 'offline'>('offline');
  const [now] = useState(() => new Date());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let cached: { at: number; list: RealAsteroid[] } | null = null;
      try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        cached = raw ? JSON.parse(raw) : null;
      } catch {
        cached = null;
      }
      if (cached?.list?.length && !cancelled) {
        setList(cached.list);
        setSource('nasa');
      }
      if (cached && Date.now() - cached.at < MAX_AGE_MS) return;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10_000);
        const res = await fetch(CAD_URL, { signal: controller.signal });
        clearTimeout(timer);
        if (!res.ok) return;
        const fresh = parseCad(await res.json());
        if (!fresh.length || cancelled) return;
        setList(fresh);
        setSource('nasa');
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), list: fresh })).catch(() => {});
      } catch {
        // Offline or NASA unavailable: keep the cache or the famous asteroids.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<RealAsteroidsState>(() => {
    const next = upcoming(list, now);
    if (!next.length) {
      return { today: pickToday(FAMOUS_ASTEROIDS, now), list: upcoming(FAMOUS_ASTEROIDS, now), source: 'offline' };
    }
    return { today: pickToday(next, now), list: next, source };
  }, [list, now, source]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRealAsteroids(): RealAsteroidsState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useRealAsteroids must be used inside RealAsteroidsProvider');
  return ctx;
}
