import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { defaultUnits, initI18n } from '../i18n/detect';
import type { Units } from '../physics/format';

const STORAGE_KEY = 'blast-radius:units';

interface UnitsState {
  units: Units;
  setUnits: (units: Units) => void;
}

const UnitsContext = createContext<UnitsState | null>(null);

/** Metric or imperial: defaults from the device region, remembered once the user picks. */
export function UnitsProvider({ children }: { children: ReactNode }) {
  const [units, setUnitsState] = useState<Units>(() => defaultUnits(initI18n().region));

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'metric' || saved === 'imperial') setUnitsState(saved);
      })
      .catch(() => {});
  }, []);

  const setUnits = useCallback((next: Units) => {
    setUnitsState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const value = useMemo(() => ({ units, setUnits }), [units, setUnits]);
  return <UnitsContext.Provider value={value}>{children}</UnitsContext.Provider>;
}

export function useUnits(): UnitsState {
  const ctx = useContext(UnitsContext);
  if (!ctx) throw new Error('useUnits must be used inside UnitsProvider');
  return ctx;
}
