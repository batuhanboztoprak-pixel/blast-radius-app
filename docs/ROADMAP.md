# Roadmap

## 1.1: first update, after 1–2 weeks of live data

Goal: more returning users and a higher free → Pro conversion. Build these once the
first real numbers (downloads, conversion at $2.99 vs $4.99, retention) are in.

1. **Daily "Today's asteroid" notification**
   - A local notification once a day, at a sensible hour in the user's time zone:
     "2023 VF1 passes Earth today. Drop it on your city?" Tapping it opens the home
     screen with that asteroid selected.
   - Uses the NASA/JPL list the app already caches; no server needed (expo-notifications,
     scheduled on device).
   - Ask for notification permission only after a first strike, with a short explanation,
     never on first launch. Add an off switch.
   - Why: turns a one-time curiosity app into a daily one; the aim is D30 retention from
     ~4% towards 7–8%.

2. **Real-asteroid share cards**
   - When the strike used a real asteroid, the share card says so:
     "NASA's asteroid 2023 VF1 on Istanbul · passes Earth Oct 8".
   - Why: this is the best-performing TikTok format ("this asteroid passes Earth today:
     here's what it would do to…"), built in so every share advertises it.

3. **Upgrade nudge after the first strike**
   - After a free user's first strike settles, a card on the result screen:
     "You've seen what happens. Now try iron, comet, the burns ring and the full
     aftermath." → paywall (new upgrade source `first-strike`).
   - Once per install; never for Pro; doesn't block anything.
   - Why: users understand Pro only after seeing it; expected to beat a generic "Go Pro".

### Measure before deciding anything else
- Pricing: compare conversion during the $2.99 launch fortnight with the weeks at $4.99.
  $4.99 only needs ~60% as many buyers to earn the same; keep whichever earns more.
- Which TikTok formats bring installs (not just views): what-if city, today's asteroid,
  city vs city, famous impacts, size escalation.

## Later ideas
- Share the cinematic strike as a video clip.
- More famous impacts.
- Android version, if iOS shows real demand.
