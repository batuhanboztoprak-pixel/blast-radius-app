import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { simulateImpact, type ImpactResult, type ImpactorParams } from '../physics/impact';
import type { Preset } from '../physics/presets';

export interface ImpactLocation {
  latitude: number;
  longitude: number;
  /** Human-readable place name, e.g. "Istanbul, Türkiye". */
  label: string;
}

export const DEFAULT_PARAMS: ImpactorParams = {
  diameterM: 450,
  velocityMs: 19_000,
  composition: 'rock',
  angleDeg: 45,
};

interface SimulationState {
  location: ImpactLocation | null;
  setLocation: (location: ImpactLocation) => void;
  params: ImpactorParams;
  /** Edit the asteroid by hand; clears any active preset and resets the angle to 45°. */
  updateParams: (patch: Partial<Omit<ImpactorParams, 'angleDeg'>>) => void;
  presetId: Preset['id'] | null;
  /** Load a historical asteroid; keeps the user's chosen location. */
  applyPreset: (preset: Preset) => void;
  result: ImpactResult | null;
}

const SimulationContext = createContext<SimulationState | null>(null);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<ImpactLocation | null>(null);
  const [params, setParams] = useState<ImpactorParams>(DEFAULT_PARAMS);
  const [presetId, setPresetId] = useState<Preset['id'] | null>(null);

  const result = useMemo(() => (location ? simulateImpact(params) : null), [location, params]);

  const value = useMemo<SimulationState>(
    () => ({
      location,
      setLocation,
      params,
      updateParams: (patch) => {
        setPresetId(null);
        setParams((p) => ({ ...p, ...patch, angleDeg: DEFAULT_PARAMS.angleDeg }));
      },
      presetId,
      applyPreset: (preset) => {
        setPresetId(preset.id);
        setParams(preset.params);
      },
      result,
    }),
    [location, params, presetId, result],
  );

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
}

export function useSimulation(): SimulationState {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error('useSimulation must be used inside SimulationProvider');
  return ctx;
}
