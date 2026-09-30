# Localization

Blast Radius ships in English, Turkish, Spanish, Portuguese, German, French and Japanese.

## How the app picks a language

- `src/i18n/detect.ts` reads the iPhone's settings once at launch: the preferred language
  (which includes a per-app language picked in **Settings → Blast Radius → Language**) and
  the region. iOS relaunches the app when either changes.
- Languages we don't ship fall back to English. Numbers use the device's language and region
  (`3,46 milyon` in Turkey, `12.400` in Germany, `346万` in Japan).
- Distances default to **miles** in the US, UK, Liberia and Myanmar and to **km** elsewhere.
  The user can switch on the asteroid screen; the choice is remembered.

## Where the text lives

| What | File |
| --- | --- |
| All in-app text | `src/i18n/locales/<lang>.ts` (`en.ts` is the source) |
| App name and permission prompts (location, tracking) | `languages/<lang>.json`, wired up in `app.json` → `locales` |
| App Store listing | `store/listing.json` |

Rules for translators:

- Keep every `{placeholder}` exactly as it is; the app fills them in.
- `plural.strikes_one` / `_other` are the singular and plural forms.
- Keep "Blast Radius" and "Pro" untranslated.
- `src/i18n/__tests__/i18n.test.ts` fails if a language is missing a key or a placeholder.

## Adding a language

1. Copy `src/i18n/locales/en.ts` to `<lang>.ts`, translate, and add it to `CATALOGS` in `src/i18n/core.ts`.
2. Add `languages/<lang>.json` and list it under `locales` and `ios.infoPlist.CFBundleLocalizations` in `app.json`.
3. Add the listing to `store/listing.json` and run `node scripts/check-store-listing.js`.
4. Needs a new build (the native strings are baked in).

## App Store listing

`store/listing.json` holds the name, subtitle, keywords, promotional text, description,
"What's New" and screenshot captions for en-US, tr, es-ES, es-MX, pt-BR, de-DE, fr-FR and ja.
`node scripts/check-store-listing.js` checks Apple's length limits and flags keywords that
waste space by repeating words from the name or subtitle.

In App Store Connect: **App Information → Localizable Information** (name, subtitle) and the
version page (description, keywords, promotional text, What's New, screenshots) → add each
language from the language menu at the top right and paste its fields. Listing text changes
need a version submission, except promotional text, which can change any time.

Screenshots: reuse the same five images with the captions translated. At minimum do English
and Turkish; the rest can use English screenshots at first (Apple falls back to the primary
language's screenshots).

Notes:

- Keywords were chosen by hand, not with an ASO tool. After a few weeks, check App Store
  Connect → Analytics → Sources for which searches bring installs and swap out dead keywords.
- The keywords include "nuke"/"nuclear bomb" equivalents because results compare energy with
  the Hiroshima bomb. If App Review objects, remove them.
- A common ASO tip says the US storefront also indexes the Spanish (Mexico) listing's keywords.
  Unverified; the es-MX listing here is genuinely Spanish for Mexican users.
- None of the translations have been reviewed by a native speaker yet. Review Turkish
  yourself and ask a native speaker to skim the others before release.
