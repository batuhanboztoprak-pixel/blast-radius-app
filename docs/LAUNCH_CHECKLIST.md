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
- [ ] Create two ad units and paste their IDs into `PROD_AD_UNITS` in `src/config.ts`:
  - Banner (adaptive)
  - Interstitial
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
- [ ] Screenshots: the 4 screens (pick location, set asteroid, result, share card) at 6.9" and 6.5".
- [ ] Age rating questionnaire: answer "None" throughout. The app simulates impacts without depicting people.
- [ ] Review notes: "Pro unlock is a non-consumable IAP; use the sandbox account to test. Physics are the published Earth Impact Effects Program equations."

## 6. Before release: test on device

- [ ] Search, tap-to-drop, and "use my location" all place the pin.
- [ ] Rings render for a small airburst (e.g. 40 m), a mid-size impact (450 m), and Chicxulub.
- [ ] Share card: the map snapshot appears behind the rings, and the share sheet can save the image to Photos.
- [ ] Banner appears for free users. An interstitial appears on the 3rd simulation and never more often than every 90 s.
- [ ] Buying Pro removes ads immediately and unlocks iron/comet, the thermal ring and presets.
- [ ] Deleting and reinstalling, then tapping **Restore purchase**, brings Pro back.
- [ ] With ATT denied, ads still load (non-personalized).
