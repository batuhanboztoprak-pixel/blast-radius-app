# Launch checklist

These steps happen outside the codebase. Placeholders in code are marked in
`src/config.ts` and `app.json`.

## 1. Apple Developer / App Store Connect

- [ ] Register the bundle ID `com.blastradius.app` (or change `ios.bundleIdentifier` in `app.json`).
- [ ] Create the app record in App Store Connect.
- [ ] Sign the **Paid Apps** agreement and add banking/tax info. IAP won't load products without it.
- [ ] Create an **In-App Purchase → Non-Consumable**:
  - Product ID: `com.blastradius.app.pro` (must match `PRO_PRODUCT_ID` in `src/config.ts`)
  - Price: $3.99 tier
  - Display name "Blast Radius Pro", a description, and a review screenshot of the paywall
- [ ] Attach the IAP to the first app version you submit. The first IAP has to be reviewed with a binary.
- [ ] Create a Sandbox tester (Users and Access → Sandbox) to test purchase and restore on device.
- [ ] Add a Privacy Policy URL. It's required, and it has to mention AdMob and ATT.

## 2. AdMob

- [ ] Create an AdMob account and **add the iOS app**. Link it to the App Store listing once it's live.
- [ ] Copy the **App ID** (`ca-app-pub-…~…`) into `app.json` → `plugins` → `react-native-google-mobile-ads.iosAppId`.
      The committed value is Google's public **test** App ID.
- [ ] Create three ad units and paste their IDs into `PROD_AD_UNITS` in `src/config.ts`:
  - Banner (adaptive)
  - Interstitial
  - **Rewarded** (for "Watch a short ad to try it once"). Reward amount and item don't matter; the app
    grants one strike with the chosen Pro item whenever the reward event fires. Leave
    server-side verification (SSV) off; there's no backend to receive it.
- [ ] **Privacy & messaging** → create a **GDPR consent message** for EEA/UK users. The app shows it through UMP (`AdsConsent.gatherConsent`).
      Optionally add an **IDFA explainer** message, which UMP shows before the ATT prompt.
- [ ] Check the `skAdNetworkItems` list in `app.json` against Google's current list
      (developers.google.com/admob/ios/privacy/skadnetwork) and add any new IDs.
- [ ] Add `app-ads.txt` to your developer website once AdMob gives you the line.

## 3. App Tracking Transparency

Already implemented in `src/ads/ads.tsx`. The order is UMP consent, then the ATT prompt, then `mobileAds().initialize()`.
If tracking is denied, ads are requested as non-personalized. Pro users never see the prompt.
The prompt text is in `app.json` (`expo-tracking-transparency.userTrackingPermission`). Edit it there.

## 4. App Store privacy "nutrition label"

The app doesn't collect data itself. There's no backend or analytics, geocoding goes straight to Apple, and location never leaves the device.
Everything you need to declare comes from the **Google Mobile Ads SDK**. Check this against Google's current
"Prepare for Apple's App Store data disclosure requirements" page before submitting:

| Data type | Used for | Linked to user | Used for tracking |
| --- | --- | --- | --- |
| Identifiers → Device ID (IDFA) | Third-party advertising, Analytics | No | **Yes** |
| Usage Data → Advertising Data | Third-party advertising, Analytics | No | **Yes** |
| Usage Data → Product Interaction | Analytics | No | No |
| Location → Coarse Location (from IP) | Third-party advertising, Analytics | No | **Yes** |
| Diagnostics → Crash Data, Performance Data, Other Diagnostic Data | Analytics | No | No |

Because "Used for tracking" is Yes, the ATT prompt is required, and it's in place.

`app.json` also ships an app-level privacy manifest (`ios.privacyManifests`) listing the required-reason
APIs used by React Native and AsyncStorage. The AdMob SDK brings its own manifest.

## 5. Build and submit

```bash
npx eas-cli@latest build --profile production --platform ios
npx eas-cli@latest submit --platform ios
```

- [ ] Replace `assets/icon.png` and `assets/splash-icon.png`. They're still the Expo template art.
- [ ] Screenshots: five images at 6.9" and 6.5" with the captions from `store/listing.json` (English and Turkish at least; see docs/LOCALIZATION.md). Paste each language's name, subtitle, keywords and description from the same file.
- [ ] Age rating questionnaire: the app now shows estimated casualty numbers (no imagery of people). "None" still fits most questions, but read the violence items carefully; if in doubt, "Infrequent/Mild Realistic Violence" is the safe answer.
- [ ] Review notes: "Pro unlock is a non-consumable IAP; use the sandbox account to test. Physics are the published Earth Impact Effects Program equations."

## 6. Before release: test on device

Testing tip (dev builds only): long-press the "Set the asteroid" title to open the test
tools. **Act as Pro** unlocks everything and hides ads without a purchase; **Reset**
brings back the free tries, the cinematic taste and today's ad unlocks. Neither exists in
release builds.

- [ ] Cinematic strike (fresh install = first strike is cinematic): the camera starts high, dives in tilted as the meteor falls, the rings grow on the map from the impact, the camera pulls back and circles, then it settles top-down with the legend working. Check a 20 m airburst, a 450 m impact and Chicxulub. On the second strike a free user gets the normal animation and a "🎬 Cinematic · Pro" chip; watching an ad from it replays the strike cinematically.
- [ ] Cinematic extras: during the ~3 s fall a panel shows altitude, speed and a real countdown to impact ("AIRBURST IN" for Chelyabinsk/Tunguska); a whoosh builds up; impact = blinding flash, boom, a fireball plume rising, half a second of slow motion, the phone keeps rumbling; energy and deaths roll up in the panel, which fades when the camera settles. With the silent switch on there is no sound; music from other apps keeps playing.
- [ ] Reduce Motion on: no camera moves, rings appear directly.
- [ ] Aftermath timeline: tap each stage. Free users can read the first two; the others show the lock and open the paywall on the timeline. A small impact (25 m) shows only two stages ending with "no lasting effects". Chicxulub shows the impact winter with the Brugger et al. source line. Imperial units show °F and mi².
- [ ] Aftermath on the map: tapping a stage scrolls up to the map and shows that stage's text in a caption on the map (‹ › to step, ✕ to close), so there is no need to scroll back down. Each stage animates on the map, lined up with the impact: fireball pulse, shock pulses, debris raining into the ejecta zone, embers in the burning area, drifting dust, snow for the impact winter. The particles hide while the map moves and come back when it stops. Check all six stages on Chicxulub (continent-sized zones) and on a 450 m impact: every stage must show its own particles inside the visible map, and the general red haze disappears while a stage is open.
- [ ] Share card: nothing is cut off at the bottom (try a long place name, German, and the largest iOS text size); the wordmark is at the top.
- [ ] Chicxulub shows "🦖 Dinosaur killer" under its chip and on the result card.
- [ ] Famous strikes: tapping the selected preset again deselects it and restores the asteroid you had before.
- [ ] Rock, iron and comet each have their own icon and description on the asteroid screen and their own meteor in the strike (orange rock, thin white-hot iron with sparks, long blue comet with two tails).
- [ ] New app icon on the home screen (also check Settings → Home Screen → Dark and Tinted). Native splash (expo-splash-screen plugin) is the wordmark on deep violet, and the intro picks up from it without a jump.
- [ ] Launch intro: the wordmark moves down as the Earth rises in; the meteor streaks in from the top right, growing as it comes closer, and stops just above the ground; the rings light up with a flash, then the tagline. No shaking. Tap skips. Check on a small phone (SE) and a Pro Max.
- [ ] Rewarded ads: after 3 ad unlocks in a day the paywall hides "Watch a short ad" and says to come back tomorrow; the count resets the next day.

- [ ] Search, tap-to-drop, and "use my location" all place the pin.
- [ ] Rings render for a small airburst (e.g. 40 m), a mid-size impact (450 m), and Chicxulub.
- [ ] Strike animation: the meteor lands exactly on the pin, the expanding rings end at the same size as the map rings (no jump when they swap), the phone buzzes on impact, and **Replay** works after zooming to a ring.
- [ ] With Settings → Accessibility → Motion → Reduce Motion on, the rings appear without the animation.
- [ ] Tapping each legend row zooms to that ring; tapping it again frames them all.
- [ ] A 5 km+ impact switches to the globe after the animation. The globe fills the screen with "Scroll down for details" peeking below; dragging spins it smoothly (Skia, drawn on the UI thread), a flick keeps it coasting, two fingers zoom in up to 6× and the rings stay attached to the ground. Scrolling the page still works from the strip below the globe.
- [ ] Map ↔ Globe toggle doesn't replay the animation.
- [ ] Casualties and "world population left" look sensible (e.g. 150 m over New York → a few million), the counter drops with each strike and survives an app restart, and **Reset Earth** restores 8.3 billion.
- [ ] Languages: switch the iPhone (or Settings → Blast Radius → Language) to Turkish, Japanese and German. Every screen is translated, nothing is cut off (German is longest), Japanese text renders (it falls back to the system font), the location and tracking prompts are translated, and numbers use local separators.
- [ ] With the region set to United States the app starts in miles; the km/miles switch on the asteroid screen changes every screen and the share card, and survives a restart.
- [ ] First simulation after launch doesn't hitch noticeably (it decodes the 1.8 MB population grid once).
- [ ] Share card: the map snapshot appears behind the rings, and the share sheet can save the image to Photos.
- [ ] Banner appears for free users. An interstitial appears on the 3rd simulation and never more often than every 90 s.
- [ ] Buying Pro removes ads immediately and unlocks iron/comet, the thermal ring and presets.
- [ ] Deleting and reinstalling, then tapping **Restore purchase**, brings Pro back.
- [ ] With ATT denied, ads still load (non-personalized).

Upgrade prompts (free user unless noted):

- [ ] **Locked burns ring:** after a 450 m impact, the burns ring appears faint and dashed with a "Pro" tag *after* the strike animation, not during it. The "3RD-DEGREE BURNS" card shows a masked value with a lock. Tapping the tag, the card, or the legend's locked row each opens the paywall with the glowing-ring art at the top. The share card has no burns ring. With Pro, the ring is solid and the card shows the value.
- [ ] **Free tries:** fresh install → all three presets say "Try once free". Striking Chicxulub works and the result shows "That was your free Chicxulub…" with Unlock Pro. Back on the asteroid screen, Chicxulub is deselected and locked, and tapping it opens the paywall on famous impacts. The other two presets still say "Try once free". This survives an app restart.
- [ ] **Rewarded try:** tap locked Iron → paywall → "Watch a short ad to try it once" → watch to the end → back on the asteroid screen Iron is selected with "1 try unlocked". Simulate uses iron; returning switches back to Rock and Iron is locked again. Closing the ad early unlocks nothing and shows a note. Repeat for Comet, a used preset, and the burns ring from the result screen (the ring appears on that result).
- [ ] With airplane mode on (no ad loaded) or as Pro, the "Watch a short ad" button isn't shown.
- [ ] **Remove-ads nudge:** on the 3rd simulation, after closing the interstitial, the result screen slides up "Remove ads for good · $3.99" (your store price). ✕ dismisses it; it doesn't return this session even after the next interstitial; tapping it opens the paywall on "No more ads". Never shown to Pro users. With Reduce Motion on it appears without sliding.
- [ ] **Paywall:** each entry point opens with its own art (burns ring, Chicxulub globe, iron vs comet, crossed-out ad). The Free vs Pro table fits without clipping in German. Restore purchase and Ad privacy choices still work. With Reduce Motion on, the burns glow doesn't pulse.
- [ ] Every free feature still works with no purchase and no ads watched: any size, speed, place, rock, the three main rings, population numbers.
- [ ] Dev build: long-press the paywall title → the upgrade-stats screen counts each prompt you opened and credits a sandbox purchase to the prompt that led to it. In a release build, long-press does nothing.
- [ ] Translations of the new text (lock badges, free-try card, nudge, paywall art titles, comparison table) look right in Turkish, German and Japanese.
