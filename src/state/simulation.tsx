import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { simulateImpact, type ImpactResult, type ImpactorParams } from '../physics/impact';
import type { RealAsteroid } from '../physics/neo';
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
  /** Leave the preset and go back to the custom asteroid the user had before it. */
  clearPreset: () => void;
  /** A real NASA asteroid loaded into the simulator, until the user edits it. */
  realAsteroid: RealAsteroid | null;
  /** Load a real asteroid's size and impact speed (rock, 45°). */
  applyRealAsteroid: (asteroid: RealAsteroid) => void;
  /** Deselect the real asteroid and go back to the custom asteroid the user had before it. */
  clearRealAsteroid: () => void;
  /** Bumps whenever a preset or real asteroid is applied, so sliders can jump to its values. */
  presetEpoch: number;
  result: ImpactResult | null;
}

const SimulationContext = createContext<SimulationState | null>(null);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<ImpactLocation | null>(null);
  const [params, setParams] = useState<ImpactorParams>(DEFAULT_PARAMS);
  const [presetId, setPresetId] = useState<Preset['id'] | null>(null);
  const [presetEpoch, setPresetEpoch] = useState(0);
  const [realAsteroid, setRealAsteroid] = useState<RealAsteroid | null>(null);
  /** The user's own asteroid, kept while a preset is active so it can be restored. */
  const [customParams, setCustomParams] = useState<ImpactorParams>(DEFAULT_PARAMS);

  const result = useMemo(() => (location ? simulateImpact(params) : null), [location, params]);

  const value = useMemo<SimulationState>(
    () => ({
      location,
      setLocation,
      params,
      updateParams: (patch) => {
        setPresetId(null);
        setRealAsteroid(null);
        setParams((p) => ({ ...p, ...patch, angleDeg: DEFAULT_PARAMS.angleDeg }));
      },
      presetId,
      applyPreset: (preset) => {
        if (!presetId && !realAsteroid) setCustomParams(params);
        setRealAsteroid(null);
        setPresetId(preset.id);
        setParams(preset.params);
        setPresetEpoch((n) => n + 1);
      },
      clearPreset: () => {
        if (!presetId) return;
        setPresetId(null);
        setParams({ ...customParams, angleDeg: DEFAULT_PARAMS.angleDeg });
        setPresetEpoch((n) => n + 1);
      },
      realAsteroid,
      applyRealAsteroid: (a) => {
        if (!presetId && !realAsteroid) setCustomParams(params);
        setPresetId(null);
        setRealAsteroid(a);
        setParams({ diameterM: a.diameterM, velocityMs: a.impactVelocityMs, composition: 'rock', angleDeg: DEFAULT_PARAMS.angleDeg });
        setPresetEpoch((n) => n + 1);
      },
      clearRealAsteroid: () => {
        if (!realAsteroid) return;
        setRealAsteroid(null);
        setParams({ ...customParams, angleDeg: DEFAULT_PARAMS.angleDeg });
        setPresetEpoch((n) => n + 1);
      },
      presetEpoch,
      result,
    }),
    [location, params, presetId, presetEpoch, customParams, realAsteroid, result],
  );

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
}

export function useSimulation(): SimulationState {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error('useSimulation must be used inside SimulationProvider');
  return ctx;
}
