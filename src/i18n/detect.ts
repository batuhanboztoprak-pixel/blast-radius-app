/**
 * Reads the device's language and region. iOS keeps them in user defaults:
 * `AppleLanguages` lists the preferred languages (the first entry already
 * reflects a per-app language chosen in Settings → Blast Radius → Language) and
 * `AppleLocale` holds the region format, e.g. "en_TR". Falls back to the JS
 * engine's Intl locale elsewhere.
 */
import { Platform, Settings } from 'react-native';

import type { Units } from '../physics/format';
import { matchLanguage, setLanguage } from './core';

export interface DeviceLocale {
  /** Preferred language tag, e.g. "pt-BR". */
  languageTag: string;
  /** Region code, e.g. "TR", or null if unknown. */
  region: string | null;
  /** Tag for number formatting (language + region), e.g. "en-TR". */
  numberLocale: string;
}

function intlLocale(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';
  } catch {
    return 'en-US';
  }
}

export function deviceLocale(): DeviceLocale {
  let languageTag = intlLocale();
  let regionTag: string | null = null;
  if (Platform.OS === 'ios') {
    try {
      const langs = Settings.get('AppleLanguages') as string[] | undefined;
      if (Array.isArray(langs) && langs[0]) languageTag = langs[0];
      const appleLocale = Settings.get('AppleLocale') as string | undefined;
      // "en_US", "tr_TR", "en_TR@rg=trzzzz"
      if (appleLocale) regionTag = appleLocale.split('@')[0].split('_')[1] ?? null;
    } catch {
      // Keep the Intl fallback.
    }
  }
  const parts = languageTag.replace('_', '-').split('-');
  const region = regionTag ?? parts.find((p, i) => i > 0 && /^[A-Z]{2}$/.test(p)) ?? null;
  const lang = parts[0].toLowerCase();
  return { languageTag, region, numberLocale: region ? `${lang}-${region}` : lang };
}

/** Countries that measure road distance in miles. */
const IMPERIAL_REGIONS = new Set(['US', 'GB', 'LR', 'MM']);

export function defaultUnits(region: string | null): Units {
  return region && IMPERIAL_REGIONS.has(region) ? 'imperial' : 'metric';
}

let initialised: DeviceLocale | null = null;

/** Call once, before the first render. */
export function initI18n(): DeviceLocale {
  if (initialised) return initialised;
  const device = deviceLocale();
  setLanguage(matchLanguage(device.languageTag), device.numberLocale);
  initialised = device;
  return device;
}
