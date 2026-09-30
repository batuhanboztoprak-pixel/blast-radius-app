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
| `/asteroid` | `src/app/asteroid.tsx` | Step 2 — diameter (log slider, 10 m–20 km), composition, entry speed (11–72 km/s, with km/h), famous-impact presets |
| `/result` | `src/app/result.tsx` | Step 3 — animated strike on the map (replayable), tap-a-ring zoom, globe view for continent-scale impacts, energy, crater, quake, damage radii, people inside each ring, casualties and the running world-population counter |
| `/share` | `src/app/share.tsx` | Share card: MapKit snapshot + SVG rings captured with `react-native-view-shot` |
| `/paywall` | `src/app/paywall.tsx` | Pro upsell (modal) focused on a `feature` param, Free vs Pro table, rewarded "try once", restore purchase, ad privacy choices |
| `/upgrade-stats` | `src/app/upgrade-stats.tsx` | Dev builds only: upgrade-source counters (long-press the paywall title) |

## Free vs Pro

| | Free | Pro ($3.99 one-time, `com.blastradius.app.pro`) |
| --- | --- | --- |
| Simulations | Unlimited | Unlimited |
| Composition | Rock | Rock, iron, comet |
| Rings | Crater, severe shockwave, window breakage | + 3rd-degree-burns thermal ring |
| Presets | One free strike with each | Tunguska, Chelyabinsk, Chicxulub, any time |
| Ads | Banner + interstitial every 3rd simulation (≥ 90 s apart) | None |

## Code map

```
src/
  app/            expo-router screens (every file is a route)
  physics/        impact.ts (EIEP equations), presets.ts, format.ts — pure TS, unit-tested
  population/     grid.ts (offline GPWv4 population lookups), casualties.ts (NASA PAIR + global effects) — unit-tested
  data/           generated: populationGrid.ts (scripts/build-population.py), land.ts (Natural Earth 110m)
  vendor/         d3-geo (+3 d3-array helpers), vendored for the globe — see vendor/README.md
  i18n/           core.ts (t(), language), detect.ts (device language/region), locales/*.ts — see docs/LOCALIZATION.md
  state/          simulation.tsx (location + params + memoised result), premium.tsx (StoreKit via expo-iap), world.tsx (world-population counter), units.tsx (km/miles)
  ads/            ads.tsx (UMP consent → ATT → AdMob init, interstitial pacing, rewarded ads, post-ad nudge), AdBanner.tsx
  upsell/         entitlements.ts (free tries, rewarded unlocks, upgrade-source counters — pure, unit-tested), upsell.tsx (state + AsyncStorage)
  components/     ImpactMap, StrikeAnimation, GlobeView (+ globe.ts), PopulationCard, ShareCard, RingLegend, UI primitives, icons
  lib/geo.ts      map framing + Web-Mercator math for the share-card snapshot
docs/
  PHYSICS.md          equations, constants and known limitations
  LOCALIZATION.md     languages, translation files, App Store listings (store/listing.json)
  LAUNCH_CHECKLIST.md AdMob / App Store Connect / privacy steps
```

## Upgrade prompts

Everything free stays free: any size, speed and place, rock, the crater, shockwave and
window rings, and population numbers. A paywall never stands between a free user and
those. Pro items are visible, so people can see what they would get:

| Prompt | Where | What it does |
| --- | --- | --- |
| Locked burns ring | Result map, legend, "3RD-DEGREE BURNS" card | Free users see the burns ring faint and dashed with a "Pro" tag (after the strike animation, never in it), plus a card with the value masked. Any of these opens the paywall on the burns feature. The share card never shows it. |
| Free try per preset | Asteroid screen, result screen | The first strike with each of Tunguska, Chelyabinsk and Chicxulub is free ("Try once free" chip). Afterwards the result shows "That was your free Chicxulub…" with Unlock Pro. Later taps open the paywall. Stored in AsyncStorage. |
| Watch an ad to try once | Paywall opened from any lock | An AdMob rewarded ad unlocks that one item (iron, comet, a preset or the burns ring) for the next strike only. It's granted only when the reward event fires. The option is hidden when ads are off or no ad has loaded. A burns unlock applies to the result on screen. |
| Remove-ads nudge | Bottom of the result screen | After the every-3rd-simulation interstitial closes: "Remove ads for good · {store price}". Dismissable, at most once a session, never for Pro. |
| Focused paywall | `/paywall?feature=burns\|compositions\|presets\|ads` | Leads with an SVG illustration of that feature, then the perks and a Free vs Pro table. |

When a strike has spent a free try or an ad unlock, going back to the asteroid screen
switches a still-selected locked item back to rock / no preset, so Simulate never lands
on a paywall for something the user didn't just choose.

Upgrade sources are counted on the device only (no analytics SDK): which prompt opened
the paywall, which one was open when a purchase completed, and how many tries were
unlocked by rewarded ads. In a dev build, long-press the paywall title to see them.

No countdowns, "today only" prices, fake reviews or user counts. The price shown is
always the store's `displayPrice`. A launch discount belongs in App Store Connect.

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
