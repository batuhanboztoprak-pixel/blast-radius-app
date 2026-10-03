# Submitting Blast Radius to the App Store

Work through these in order. Everything that lives in code is already done;
these are the steps in Apple's, Google's and your domain's dashboards.

---

## 0. Must be finished before you press "Submit"

- [ ] **Paid Apps agreement = Active** (App Store Connect → Business). Add the bank
      account and the tax form (as an individual in Türkiye: the W-8BEN). Until it's
      active, the Pro purchase can't load, not even for Apple's reviewer. The paywall
      would just say "Connecting to the App Store…", and the app gets rejected for a
      broken purchase.
- [x] Digital Services Act trader status: done.

## 1. Website and email (blastradius.curfewapp.co)

The pages are already written and pushed to the `gh-pages` branch:
`index.html` (support) and `privacy.html` (privacy policy). Their source is in `site/`.

1. **Turn on GitHub Pages:** github.com/batuhanboztoprak-pixel/blast-radius-app →
   Settings → Pages → *Deploy from a branch* → branch **gh-pages**, folder **/ (root)** → Save.
   Custom domain: `blastradius.curfewapp.co` (already in the CNAME file) → tick **Enforce HTTPS**
   once it lets you (this can take up to an hour).
2. **DNS** (wherever curfewapp.co's DNS is managed): add a record
   `CNAME  blastradius  →  batuhanboztoprak-pixel.github.io`.
   Don't touch the records your other app uses.
3. **Email:** create `blastradius@curfewapp.co` as a forwarding address to your inbox,
   using your DNS provider's email forwarding (Cloudflare Email Routing, Namecheap,
   etc. are free). If curfewapp.co already has a mailbox, an alias works too.
4. Check that https://blastradius.curfewapp.co and
   https://blastradius.curfewapp.co/privacy.html both open on your phone.

## 2. AdMob (for ads in the free version)

The release build only shows ads once real IDs are in. **With the placeholder IDs,
the release build runs completely ad-free.** In that case it shows no consent form
and no tracking prompt, and the paywall doesn't list "No ads". So you can choose:

- **With ads (recommended):** AdMob → Apps → Add app → iOS, "not yet published".
  Create 3 ad units: **Banner**, **Interstitial**, **Rewarded**. Send me the
  App ID (`ca-app-pub-…~…`) and the three unit IDs (`ca-app-pub-…/…`), and I'll put them
  in `app.json` and `src/config.ts`. In AdMob → Privacy & messaging, create the **GDPR**
  message, and an **IDFA explainer** if you want one.
- **Ad-free first version:** do nothing now and add ads in an update.
  Then the App Privacy answer in step 6 becomes "Data not collected".

Once the app is live, link it in AdMob, and add the `app-ads.txt` line that AdMob gives you.
I'll put it on the website.

## 3. App Store Connect: create the app

My Apps → **+** → New App:

| Field | Value |
| --- | --- |
| Platform | iOS |
| Name | Blast Radius: Asteroid Impact |
| Primary language | English (U.S.) |
| Bundle ID | com.blastradius.app |
| SKU | blastradius-ios-001 |
| User access | Full access |

### App Information
- **Subtitle:** from `store/listing.json` (per language).
- **Category:** Primary **Entertainment**, Secondary **Education**.
  Games → Simulation is meant for games, so it doesn't fit here.
- **Content rights:** "Yes, it contains third-party content and I have the rights".
  The maps come from Apple, and the land/population data from Natural Earth and NASA, which are public domain.
- **Age rating** questionnaire: answer **None** to everything except
  *Realistic violence → Infrequent/Mild*, because it shows casualty estimates (with no gore or imagery of people).
  Say No to unrestricted web access, gambling, contests and user-generated content.
  If the questionnaire asks about advertising, answer Yes when you ship with ads.
- **Privacy Policy URL:** `https://blastradius.curfewapp.co/privacy.html`

### Pricing and Availability
- Price: **Free**, available in all countries.

## 4. In-App Purchase: Blast Radius Pro

Monetization → In-App Purchases → **+** → **Non-Consumable**

| Field | Value |
| --- | --- |
| Reference name | Blast Radius Pro |
| Product ID | `com.blastradius.app.pro` (must match exactly) |
| Price | **$4.99**, with a launch price: Price Schedule → add a **$2.99** price starting on release day and ending 14 days later, then $4.99 |
| Family Sharing | Off (your choice) |
| Review screenshot | A screenshot of the upgrade screen (open "★ Blast Radius Pro" on the home screen) |
| Review notes | "One-time unlock of all Pro features and removal of ads. Opens from '★ Blast Radius Pro' on the first screen or any locked item." |

Localizations: display name max 30 characters, description max 45.

| Language | Display name | Description |
| --- | --- | --- |
| English (U.S.) | Blast Radius Pro | Unlock everything forever and remove ads |
| Turkish | Blast Radius Pro | Her şeyin kilidini aç, reklamları kaldır |
| Spanish (Spain/Mexico) | Blast Radius Pro | Desbloquea todo para siempre sin anuncios |
| Portuguese (Brazil) | Blast Radius Pro | Libere tudo para sempre e sem anúncios |
| German | Blast Radius Pro | Alles für immer freischalten, ohne Werbung |
| French | Blast Radius Pro | Tout débloquer pour toujours, sans pub |
| Japanese | Blast Radius Pro | すべてを永久に解放し、広告を削除 |

If you ship ad-free, drop the "remove ads" part from the descriptions.

The first IAP is reviewed together with the app. Attach it on the version page (step 7).

## 5. Sandbox tester (to test the purchase yourself)

Users and Access → Sandbox → Testers → **+**. Use an email that isn't an Apple ID yet.
On the iPhone: Settings → App Store → scroll to **Sandbox Account** → sign in.
In a TestFlight build, buy Pro (it's free in sandbox), delete the app, reinstall, and use **Restore purchase**.

## 6. App Privacy (the "nutrition label")

**With ads.** All of this comes from Google's ads SDK; the app itself collects nothing:

| Data type | Used for | Linked to the user | Used for tracking |
| --- | --- | --- | --- |
| Identifiers → Device ID | Third-party advertising, Analytics | No | **Yes** |
| Usage Data → Advertising Data | Third-party advertising, Analytics | No | **Yes** |
| Usage Data → Product Interaction | Analytics | No | No |
| Location → Coarse Location | Third-party advertising, Analytics | No | **Yes** |
| Diagnostics → Crash Data, Performance Data, Other Diagnostic Data | Analytics | No | No |

**Ad-free version:** "No, we do not collect data from this app".

## 7. Version 1.0 page

- **Screenshots:** iPhone **6.9"** (1290×2796 or 1320×2868), 3 to 10 of them. Apple scales
  them down for smaller iPhones. Send me 5 plain screenshots from your iPhone and I'll make
  captioned store images in English and Turkish, using the captions from `store/listing.json`.
  - Suggested screens: the strike with the cinematic HUD, the rings on a city, the globe,
    an aftermath stage, and the casualties/world counter.
- **Promotional text, description, keywords, What's New:** from `store/listing.json`
  (run `node scripts/check-store-listing.js` after any edit).
- **Support URL:** `https://blastradius.curfewapp.co`
- **Marketing URL:** (optional) the same.
- **Copyright:** `2026 Batuhan Boztoprak`
- **Build:** choose the build uploaded in step 8.
- **In-App Purchases and Subscriptions:** **+** → select *Blast Radius Pro*.
- **App Review Information:** sign-in not required. Fill in your contact details. Notes:

  > Blast Radius is an asteroid-impact simulator. No account or sign-in is needed.
  > To test: tap anywhere on the map (or search a city) → Continue → choose size,
  > material and speed → Simulate impact. Results appear on the map; scroll for
  > details, and "What happens next" shows the aftermath stages.
  > In-app purchase: "Blast Radius Pro" (com.blastradius.app.pro) is a one-time
  > non-consumable. Open it from "★ Blast Radius Pro" under the Continue button, or by
  > tapping any locked item (Iron, Comet, Cinematic, famous impacts). "Restore
  > purchase" is on the same screen.
  > The free version shows Google AdMob ads; the tracking prompt appears once before
  > ads load, and Pro removes ads. Location is optional (locate button) and never
  > leaves the device. The "Today's real asteroid" card downloads NASA/JPL's public
  > close-approach list (no personal data sent); the full list of upcoming asteroids is Pro.
  > Physics: Earth Impact Effects Program equations (Collins, Melosh & Marcus 2005);
  > population: NASA SEDAC GPWv4. Casualty figures are estimates for education.

- **Version release:** "Manually release this version". That way you choose launch day
  and can line up the $2.99 launch price with it.

## 8. Build and upload

On the Mac, in the project folder:

```bash
git add -A && git commit -m "Local dependency updates"   # keep your installed packages
git pull                                                 # get the latest code
npx expo install --check                                 # fix any version mismatches
npm run typecheck && npm run lint && npm test
npx expo-doctor
npx eas-cli@latest build --profile production --platform ios
npx eas-cli@latest submit --platform ios --latest
```

- EAS increases the build number automatically.
- `submit` asks you to sign in with your Apple ID once, then uploads the build to App Store Connect.
- Processing takes 10 to 30 minutes. The build then appears in **TestFlight**. Install it from the TestFlight
  app and test: purchase with the sandbox account, restore, ads, tracking prompt, location, share.
- Then select the build on the version page (step 7) and **Add for Review → Submit**.

## 9. After you submit

- Review usually takes 1 to 3 days. If it's rejected, paste the message to me.
- Once approved, start the $2.99 price schedule, then press **Release**.
- After launch: link the app in AdMob, add `app-ads.txt`, and keep an eye on the reviews.
