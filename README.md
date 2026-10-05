# Blast Radius

Asteroid impact visualizer for iOS. Pick any spot on a real map, set an asteroid's
size, composition and speed, and see the crater, shockwave and thermal rings drawn on
the map with the key numbers — then share it as an image.

Built with Expo (SDK 57) + React Native. Maps are Apple MapKit via `react-native-maps`
(no API key). All physics runs on-device; there is no backend. The only network data is NASA/JPL's
public close-approach list for real asteroids (`src/state/realAsteroids.tsx`, cached 12 h, with a built-in offline fallback).

## Screens

| Route | File | What it does |
| --- | --- | --- |
| `/` | `src/app/index.tsx` | Step 1 — search (Apple geocoder), tap/long-press to drop a pin, or use current location |
| `/asteroids` | `src/app/asteroids.tsx` | Pro: every upcoming real asteroid fly-by (NASA/JPL); tap one to load its size and speed. Free users see today's and the rest locked |
| `/asteroid` | `src/app/asteroid.tsx` | Step 2 — diameter (log slider, 10 m–20 km), composition, entry speed (11–72 km/s, with km/h), famous-impact presets |
| `/result` | `src/app/result.tsx` | Step 3 — animated strike on the map (replayable), tap-a-ring zoom, globe view for continent-scale impacts, energy, crater, quake, damage radii, people inside each ring, casualties and the running world-population counter |
| `/share` | `src/app/share.tsx` | Share card: MapKit snapshot + SVG rings captured with `react-native-view-shot` |
| `/paywall` | `src/app/paywall.tsx` | Pro upsell (modal) focused on a `feature` param, Free vs Pro table, rewarded "try once", restore purchase, ad privacy choices |
| `/upgrade-stats` | `src/app/upgrade-stats.tsx` | Dev builds only: upgrade-source counters (long-press the paywall title) |

## Free vs Pro

| | Free | Pro ($4.99 one-time, `com.blastradius.app.pro`) |
| --- | --- | --- |
| Simulations | Unlimited | Unlimited |
| Composition | Rock | Rock, iron, comet |
| Rings | Crater, severe shockwave, window breakage | + 3rd-degree-burns thermal ring |
| Presets | One free strike with each | Tunguska, Chelyabinsk, Chicxulub, any time |
| Real asteroids | Today's real asteroid (one tap) | Every upcoming close approach |
| Ads | Banner + interstitial every 3rd simulation (≥ 90 s apart) | None |

## Code map

```
src/
  app/            expo-router screens (every file is a route)
  physics/        impact.ts (EIEP equations), presets.ts, format.ts, neo.ts (NASA/JPL close-approach parsing, size from H) — pure TS, unit-tested
  population/     grid.ts (offline GPWv4 population lookups), casualties.ts (NASA PAIR + global effects) — unit-tested
  data/           generated: populationGrid.ts (scripts/build-population.py), land.ts (Natural Earth 110m)
  vendor/         d3-geo (+3 d3-array helpers), vendored for the globe — see vendor/README.md
  i18n/           core.ts (t(), language), detect.ts (device language/region), locales/*.ts — see docs/LOCALIZATION.md
  state/          simulation.tsx (location + params + memoised result), premium.tsx (StoreKit via expo-iap), world.tsx (world-population counter), units.tsx (km/miles), realAsteroids.tsx (NASA/JPL fetch + cache)
  ads/            ads.tsx (UMP consent → ATT → AdMob init, interstitial pacing, rewarded ads, post-ad nudge), AdBanner.tsx
  upsell/         entitlements.ts (free tries, rewarded unlocks, upgrade-source counters — pure, unit-tested), upsell.tsx (state + AsyncStorage)
  components/     IntroSplash (launch intro), Welcome (3 first-launch cards), RealAsteroidCard (home screen), ImpactMap, StrikeAnimation (per-composition looks in CompositionIcon), StageEffects, GlobeView (Skia + Reanimated, maths in globeProjection.ts; globe.ts draws the still SVG globe), PopulationCard, ShareCard, RingLegend, UI primitives, icons
  lib/geo.ts      map framing + Web-Mercator math for the share-card snapshot
docs/
  PHYSICS.md          equations, constants and known limitations
  LOCALIZATION.md     languages, translation files, App Store listings (store/listing.json)
  LAUNCH_CHECKLIST.md AdMob / App Store Connect / privacy steps
  APP_STORE_SUBMISSION.md step-by-step submission guide
site/             the support + privacy website (published from the gh-pages branch to blastradius.curfewapp.co)
```

## Upgrade prompts

Everything free stays free: any size, speed and place, rock, the crater, shockwave and
window rings, and population numbers. A paywall never stands between a free user and
those. Pro items are visible, so people can see what they would get:

| Prompt | Where | What it does |
| --- | --- | --- |
| Locked burns ring | Result map, legend, "3RD-DEGREE BURNS" card | Free users see the burns ring faint and dashed with a "Pro" tag (after the strike animation, never in it), plus a card with the value masked. Any of these opens the paywall on the burns feature. The share card never shows it. |
| Free try per preset | Asteroid screen, result screen | The first strike with each of Tunguska, Chelyabinsk and Chicxulub is free ("Try once free" chip). Afterwards the result shows "That was your free Chicxulub…" with Unlock Pro. Later taps open the paywall. Stored in AsyncStorage. |
| Cinematic strike | Asteroid screen, "Strike style: Standard / 🎬 Cinematic" | A full-screen opening shot from space (`EntrySequence`: the Earth's limb, ignition, plasma, streaks, entry sound), then a tilted 3D camera dive with clouds rushing past for ground impacts (`CloudPass`), a bigger flash and fireball, the real map rings growing from the impact while the camera pulls back and circles, then it settles top-down. Pro always; free users get it once ("Free once") and then via a rewarded ad ("1 try"); otherwise the chip is locked and opens the paywall. Chosen before the strike, spent at Simulate. |
| Aftermath timeline | Result screen, "What happens next" | Stages from second 0 to years later (`src/physics/aftermath.ts`). Each stage is drawn on the map (`src/components/aftermathLayers.ts`: fireball, ejecta zones, burning area, dust or darkened sky, frost) with animated particles (`StageEffects.tsx`) and a caption over the map and has an illustration; the impact winter adds a temperature chart. ▶ Play steps through. Free users read the impact and the shock wave; the rest are Pro. |
| Locked burns zone | Result map and card | Free users see a "🔥 Burns zone · Pro" tag above the pin and a masked card; the ring itself isn't drawn, so its size stays a Pro reveal. |
| Watch an ad to try once | Paywall opened from any lock | An AdMob rewarded ad unlocks that one item (iron, comet, a preset, the burns ring, the cinematic strike or the full timeline) for the next strike only. At most 3 a day (`REWARDED_PER_DAY`), so ads let people sample Pro rather than replace it. It's granted only when the reward event fires. The option is hidden when ads are off or no ad has loaded. A burns unlock applies to the result on screen. |
| Remove-ads nudge | Bottom of the result screen | After the every-3rd-simulation interstitial closes: "Remove ads for good · {store price}". Dismissable, at most once a session, never for Pro. |
| Welcome cards | First launch, after the intro | Three cards: how it works, real NASA asteroids, the cinematic strike; the last has "See what Pro unlocks". Shown once (`WELCOME_KEY`); the dev reset on `/upgrade-stats` shows them again. |
| Real asteroid list | Home screen card, "All N upcoming asteroids 🔒" | Today's asteroid is free; the full list opens the paywall on the asteroids feature. |
| Focused paywall | `/paywall?feature=burns\|compositions\|presets\|cinematic\|aftermath\|asteroids\|ads` | Leads with an SVG illustration of that feature, then the perks and a Free vs Pro table. |

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
