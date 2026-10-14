# Resubmitting 1.0 ad-free (replacing build 4 in review)

Build 4 (with ads) is withdrawn and replaced by an ad-free build of 1.0 with the
satellite cinematic, the bigger fireball, the true-to-scale crater, deselecting
the daily asteroid and the Standard-style fix for Pro. Version stays 1.0.0 so it
matches the 1.0 page in App Store Connect.

## 1. On the Mac: remove the ad packages, check, build, upload

```bash
git pull
npm uninstall react-native-google-mobile-ads expo-tracking-transparency
npm run typecheck && npm run lint && npm test
npx expo-doctor
git add -A && git commit -m "Remove ad packages" && git push
npx eas-cli@latest build --profile production --platform ios
npx eas-cli@latest submit --platform ios --latest
```

`npm uninstall` updates package.json and the lockfile together. If submit says
something went wrong, check TestFlight first: last time the build arrived anyway.

## 2. Test from TestFlight before touching the review

Delete the app, install the new build (1.0.0, build 7 or higher) and check:
- No banner, no full-screen ads and no "Allow tracking" prompt.
- Welcome cards, today's real asteroid card (tap twice to deselect).
- First strike: satellite cinematic with the fireball, clouds, flash, crater on
  the map. Try Chicxulub (from the free try) and a 450 m rock.
- Paywall from a locked Iron chip: price shows, "Try it once free" works once.
- Sandbox purchase, then Restore after reinstalling.

Only continue if all of that works. If something is wrong, tell Claude.

## 3. App Store Connect: swap the build and resubmit

1. Version 1.0 page → at the top, **Remove from Review** (cancels build 4's submission).
2. **Build** section → remove build 4 → add the new build.
3. **App Privacy** → Edit → "No, we do not collect data from this app" → Publish.
4. **App Information → Age Rating** → Edit → advertising: **No**.
5. **In-App Purchase → Blast Radius Pro → Localization** → description
   (max 45 characters), since Pro no longer removes ads:

   | Language | Description |
   | --- | --- |
   | English | Unlock every Pro feature, forever |
   | Turkish | Tüm Pro özelliklerini sonsuza dek aç |
   | Spanish | Desbloquea todo Pro para siempre |
   | Portuguese | Libere todos os recursos Pro |
   | German | Alle Pro-Funktionen für immer |
   | French | Toutes les fonctions Pro, à vie |
   | Japanese | すべてのPro機能を永久に解放 |

6. **Description** (each language): paste from `store/listing.json` (it now has
   "No ads, no tracking" and no "removes ads").
7. **App Review notes**: replace the "ADS AND PRIVACY" paragraph with
   "NO ADS: The app has no ads and no tracking. Free users can try iron, comet,
   the burns ring and the full aftermath once each from the upgrade screen.
   Location is optional (locate button) and never leaves the device." and the
   cinematic line with "The first strike plays in cinematic mode (a free
   one-time preview of Pro) on satellite imagery."
8. **Add for Review → Submit**.

## 4. Privacy policy

The ad-free policy (`site/privacy-adfree.html`) is published to the website at
the same time as resubmitting, so the reviewer sees a policy that matches.
