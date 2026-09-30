/**
 * Translation core. Pure TypeScript (no React Native imports) so physics
 * formatting and unit tests can use it. The app sets the language once at
 * startup from the device settings (see ./detect.ts); iOS restarts the app when
 * the user changes its language, so there is no runtime switching to handle.
 */
import { de } from './locales/de';
import { en, type Messages, type MessageKey } from './locales/en';
import { es } from './locales/es';
import { fr } from './locales/fr';
import { ja } from './locales/ja';
import { pt } from './locales/pt';
import { tr } from './locales/tr';

export type Language = 'en' | 'tr' | 'es' | 'pt' | 'de' | 'fr' | 'ja';
export type { MessageKey };

export const CATALOGS: Record<Language, Messages> = { en, tr, es, pt, de, fr, ja };
export const LANGUAGES = Object.keys(CATALOGS) as Language[];

let language: Language = 'en';
/** BCP-47 tag used for number formatting, e.g. "tr-TR" or "en-US". */
let numberLocale = 'en-US';

export function setLanguage(lang: Language, locale?: string) {
  language = lang;
  numberLocale = locale ?? lang;
}

export function getLanguage(): Language {
  return language;
}

export function getNumberLocale(): string {
  return numberLocale;
}

/** Best supported language for a BCP-47 tag like "pt-BR" or "zh-Hans-CN". */
export function matchLanguage(tag: string | undefined | null): Language {
  const base = (tag ?? '').toLowerCase().split(/[-_]/)[0];
  return (LANGUAGES as string[]).includes(base) ? (base as Language) : 'en';
}

type Params = Record<string, string | number>;

/** Looks up `key` in the current language, falling back to English, and fills in `{name}` params. */
export function t(key: MessageKey, params?: Params): string {
  const template = CATALOGS[language][key] ?? en[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (m, name: string) =>
    name in params ? String(params[name]) : m,
  );
}

/**
 * Plural-aware lookup: uses `<key>_one` for the singular form where the
 * language has one, else `<key>_other`. Covers the languages we ship (Turkish
 * and Japanese don't inflect for number; French treats 0 as singular).
 */
export function tPlural(base: 'plural.strikes', count: number, params?: Params): string {
  const one =
    language === 'tr' || language === 'ja'
      ? false
      : language === 'fr'
        ? count === 0 || count === 1
        : count === 1;
  return t(`${base}_${one ? 'one' : 'other'}` as MessageKey, { count, ...params });
}

/** Locale-aware upper-casing (Turkish dotted İ). */
export function upper(s: string): string {
  try {
    return s.toLocaleUpperCase(numberLocale);
  } catch {
    return s.toUpperCase();
  }
}
