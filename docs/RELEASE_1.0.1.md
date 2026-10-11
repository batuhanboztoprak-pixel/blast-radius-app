# Releasing 1.0.1 (ad-free)

1.0.1 removes all ads and tracking and adds the satellite cinematic, the bigger
fireball, the true-to-scale crater, deselecting the daily asteroid and the
Standard-style fix for Pro. Do these in order once 1.0 is live.

## 1. On the Mac: remove the ad packages, check, build

```bash
git pull
npm uninstall react-native-google-mobile-ads expo-tracking-transparency
npm run typecheck && npm run lint && npm test
npx expo-doctor
git add -A && git commit -m "Remove ad packages" && git push
npx eas-cli@latest build --profile production --platform ios
npx eas-cli@latest submit --platform ios --latest
```

`npm uninstall` updates package.json and the lockfile together (the code no
longer imports either package). Version is already 1.0.1 in app.json.

## 2. Test from TestFlight (this same build is the one you submit)

- No banner, no full-screen ads, and no "Allow tracking" prompt on a fresh install.
- Paywall from a locked Iron chip: "Try it once free" → the next strike is iron;
  the option is gone afterwards. Same for comet, burns ring and aftermath.
- Satellite cinematic (450 m rock, Chicxulub, Chelyabinsk), the crater on the
  map, Standard as Pro, deselecting the daily asteroid, sandbox purchase + restore.

## 3. App Store Connect

- **+ Version** → 1.0.1 → select the new build.
- **What's New** and **Description**: from `store/listing.json` (each language).
- **App Privacy** → Edit → "No, we do not collect data from this app" → Publish.
  (The NASA asteroid list request sends no personal data; Apple Maps and
  purchases are Apple's own and aren't declared.)
- **Age rating**: edit and answer "No" to advertising.
- **In-App Purchase → Blast Radius Pro → Localization**: change the description
  (max 45 characters), it no longer removes ads:

  | Language | Description |
  | --- | --- |
  | English | Unlock every Pro feature, forever |
  | Turkish | Tüm Pro özelliklerini sonsuza dek aç |
  | Spanish | Desbloquea todo Pro para siempre |
  | Portuguese | Libere todos os recursos Pro |
  | German | Alle Pro-Funktionen für immer |
  | French | Toutes les fonctions Pro, à vie |
  | Japanese | すべてのPro機能を永久に解放 |

- **App Review notes**: drop the "ADS AND PRIVACY" paragraph; add
  "The app has no ads. Free users can try iron, comet, the burns ring and the
  full aftermath once each from the upgrade screen."
- Submit for review.

## 4. When 1.0.1 is live

- Publish the ad-free privacy policy: copy `site/privacy-adfree.html` over
  `site/privacy.html` (fill in the effective date) and deploy to gh-pages.
- AdMob: remove the app (or just leave it; nothing will request ads), and no
  app-ads.txt is needed.
