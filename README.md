# Blast Radius

Asteroid impact visualizer for iOS. Pick any spot on a real map, set an asteroid's
size, composition and speed, and see the crater, shockwave and thermal rings drawn on
the map with the key numbers — then share it as an image.

Built with Expo (SDK 57) + React Native. Maps are Apple MapKit via `react-native-maps`
(no API key). All physics runs on-device; there is no backend.

## Screens

| Route | File | What it does |
| --- | --- | --- |
| `/` | `src/app/index.tsx` | Step 1 — search (Apple geocoder), tap/long-press to drop a pin, or use current location |
| `/asteroid` | `src/app/asteroid.tsx` | Step 2 — diameter (log slider, 10 m–10 km), composition, entry speed (11–72 km/s), famous-impact presets |
| `/result` | `src/app/result.tsx` | Step 3 — map with rings, energy, crater width, quake magnitude, damage radii |
| `/share` | `src/app/share.tsx` | Share card: MapKit snapshot + SVG rings captured with `react-native-view-shot` |
| `/paywall` | `src/app/paywall.tsx` | Pro upsell (modal), restore purchase, ad privacy choices |

## Free vs Pro

| | Free | Pro ($3.99 one-time, `com.blastradius.app.pro`) |
| --- | --- | --- |
| Simulations | Unlimited | Unlimited |
| Composition | Rock | Rock, iron, comet |
| Rings | Crater, severe shockwave, window breakage | + 3rd-degree-burns thermal ring |
| Presets | — | Tunguska, Chelyabinsk, Chicxulub |
| Ads | Banner + interstitial every 3rd simulation (≥ 90 s apart) | None |

## Code map

```
src/
  app/            expo-router screens (every file is a route)
  physics/        impact.ts (EIEP equations), presets.ts, format.ts — pure TS, unit-tested
  state/          simulation.tsx (location + params + memoised result), premium.tsx (StoreKit via expo-iap)
  ads/            ads.tsx (UMP consent → ATT → AdMob init, interstitial pacing), AdBanner.tsx
  components/     ImpactMap, ShareCard, RingLegend, UI primitives, icons
  lib/geo.ts      map framing + Web-Mercator math for the share-card snapshot
docs/
  PHYSICS.md          equations, constants and known limitations
  LAUNCH_CHECKLIST.md AdMob / App Store Connect / privacy steps
```

## Develop

The app uses native modules (maps, ads, IAP, view-shot), so it needs a **development
build** — Expo Go won't work.

```bash
npm install
npx eas-cli@latest build --profile development --platform ios   # or: npx expo run:ios (needs Xcode)
npm start
```

In dev builds, ads use Google's test units automatically (`src/config.ts`). To test
the Pro purchase locally, add a StoreKit configuration file in Xcode or use a sandbox
tester (see the launch checklist).

## Checks

```bash
npm run typecheck
npm test          # physics, formatting and map-projection tests
npm run lint
```
