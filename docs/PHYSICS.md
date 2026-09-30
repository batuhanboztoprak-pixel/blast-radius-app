# Impact physics

All calculations live in `src/physics/impact.ts` and follow

> Collins, G. S., Melosh, H. J. & Marcus, R. A. (2005). *Earth Impact Effects Program:
> A Web-based computer program for calculating the regional environmental consequences
> of a meteoroid impact on Earth.* Meteoritics & Planetary Science 40(6), 817–840.

Units are SI throughout. Equation numbers in code comments refer to that paper.

## Pipeline

1. **Mass & energy** — sphere of diameter *L* and density ρᵢ; E = ½ m v².
2. **Atmospheric entry** (eq. 8–19) — strength Yᵢ = 10^(2.107 + 0.0624 √ρᵢ); break-up
   parameter; break-up altitude; "pancake" spreading until the cloud is 7× its original
   width. If that happens above ground it's an **airburst**; otherwise the body (or its
   fragment cloud) hits the ground at the decelerated speed. Post-break-up drag is
   integrated numerically (Simpson's rule).
3. **Crater** (eq. 21–28) — Pi-group transient crater in sedimentary rock
   (2,500 kg/m³), then simple (×1.25) or complex collapse above 3.2 km.
4. **Seismic** (eq. 40) — M = 0.67 log₁₀E − 5.87.
5. **Air blast** (eq. 54–57) — 1 kt reference curve scaled by E^(1/3). For airbursts the
   regular-reflection fit is used, floored by a surface burst at the same slant range so
   pressure always falls with distance.
6. **Thermal** (eq. 32–35) — luminous efficiency 3×10⁻³, fireball fraction above the
   horizon; airbursts use slant distance. Only when impact speed ≥ 15 km/s or for
   airbursts.
7. **Recurrence** (eq. 3) — 109 × E_Mt^0.78 years.

## Rings and thresholds

| Ring | Threshold |
| --- | --- |
| Crater | Final rim-to-rim diameter / 2 |
| Severe shockwave | 34.5 kPa (~5 psi) — most residential buildings collapse |
| Window breakage | 6.9 kPa (~1 psi) — glass shatters |
| Thermal (Pro) | 3rd-degree burns: 335 kJ/m² at 1 Mt (~8 cal/cm², Glasstone & Dolan), scaled by E^(1/6) |

Rings are capped at 10,000 km; anything that large is effectively global and the flat-Earth
fits no longer apply. Capped values display with a ">".

## Constants

| | Value |
| --- | --- |
| Densities | rock 3,000 · iron 8,000 · comet (ice) 1,000 kg/m³ |
| Entry angle | 45° (most probable); presets use reconstructed angles |
| Diameter range | 10 m – 20 km (log slider) |
| Speed range | 11–72 km/s: Earth's escape speed to a comet meeting Earth head-on (solar escape speed at 1 AU, 42 km/s, plus Earth's orbital speed, 30 km/s). Typical asteroids arrive at 17–20 km/s. Nothing natural hits outside this range, so the slider doesn't go beyond it. |
| Scale height / sea-level air density | 8 km / 1 kg/m³ |
| Drag coefficient / pancake factor | 2 / 7 |
| TNT | 1 kt = 4.184×10¹² J; Hiroshima = 15 kt |

## Validation (see `src/physics/__tests__`)

| Case | Model | Reality |
| --- | --- | --- |
| Meteor Crater — 50 m iron, 12.8 km/s | 1.46 km crater | 1.2 km |
| Tunguska preset — 60 m rock, 20 km/s | ~15 Mt airburst at ~4.8 km, severe damage ~15 km | 10–15 Mt, 5–10 km up, 2,150 km² flattened |
| Chicxulub preset — 15 km rock, 20 km/s, 60° | ~184 km crater, M 10.2 | ~180 km crater |
| 1 Mt surface burst, 5 psi | ~4.4 km | ~4.6 km (Glasstone) |

### Chicxulub preset

The crater equations were fine; the old preset (10 km) sat at the low end of impactor
estimates. Collins et al. (2020, *Nature Communications* 11:1480, "A steeply-inclined
trajectory for the Chicxulub impact") found a 45–60° trajectory and used a 17 km body at
12 km/s for their 60° runs. At the app's 20 km/s, 15 km reproduces the ~180 km crater:

| Diameter @ 20 km/s, 60° | Crater |
| --- | --- |
| 10 km | 129 km |
| 14 km | 173 km |
| **15 km** | **184 km** |

## Population and casualties (`src/population/`)

- **Where people live:** NASA SEDAC *Gridded Population of the World* v4, 2015 counts
  adjusted to UN totals (CC BY 4.0), at 0.1° (~11 km) cells, via the reduction in
  github.com/openaddresses/population. `scripts/build-population.py` packs it into
  `src/data/populationGrid.ts` (1.8 MB, log-quantised bytes with zero-run compression;
  world total within 0.1%). Rings over 300 km use a 1° version. Counts are scaled
  uniformly to 8.3 billion (UN WPP 2024 projection for 2026).
- **Local casualties:** NASA's PAIR model (Mathias, Wheeler & Dotson 2017, *Acta
  Astronautica* 134:334) — everyone inside the larger of the 4 psi (27.6 kPa) blast radius
  and the third-degree-burn radius is a casualty (killed or seriously injured). The crater
  radius is included for very large impacts.
- **Global deaths:** Chapman & Morrison (1994, *Nature* 367:33): above ~1.5 km
  (~2.5×10⁵ Mt) a global catastrophe kills at least a quarter of humanity, rising towards
  extinction for the largest impacts. The app interpolates log-linearly through
  (10⁵ Mt, 0%), (2.5×10⁵ Mt, 25%), (10⁸ Mt, 95%) and applies it to everyone not already
  counted locally. This is the roughest number in the app.
- **World counter:** each simulated strike removes its casualties from a running
  world-population total (stored on the device, resettable). Later strikes scale local
  counts by the share of humanity still alive.

Validation (`src/population/__tests__`): ~15 million within 50 km of New York and ~14 million
within 40 km of Istanbul (2015); nobody at Tunguska; the grid totals 7.33 billion.

Known gaps: cells are 11 km, so rings smaller than a city block-scale use the cell's average
density (a 1 km ring in Manhattan is undercounted); no ocean/tsunami casualties.

## Aftermath timeline (`src/physics/aftermath.ts`)

| Stage | Shown when | Numbers |
| --- | --- | --- |
| Impact (second 0) | Always | Crater width, or burst altitude; fireball diameter |
| Shock wave (seconds–minutes) | Always | Arrival at the collapse and window rings at ~340 m/s; ground shaking at ~5 km/s (Collins et al. 2005) |
| Falling debris (minutes) | Ground impacts | Ejecta blanket thickness t = D_tc⁴ / (112 r³) (Collins et al. eq. 47): where it is 1 m and 1 cm deep |
| Fires (hours) | Burns ring, or global effects | Area inside the 3rd-degree-burn radius; fires on every continent above the global threshold |
| Dark skies (days–months) | Crater ≥ 1 km or ≥ 100 Mt; global above 2.5×10⁵ Mt | Qualitative |
| Climate (years) | ≥ 2.5×10⁵ Mt: a year or more of cooling, failed harvests. ≥ 10⁸ Mt (Chicxulub-class): impact winter | Brugger, Feulner & Petri (2017, GRL): ≥26 °C global cooling, ~3 years below freezing, ~30 years to recover |

Stages that don't apply are left out, so a small impact ends after the shock wave.

## Known limitations (v1)

- Every target is treated as land — no water layer, no tsunami.
- Airbursts have no crater or seismic output.
- High, shallow airbursts are under-predicted. Chelyabinsk (≈30 km up at 18°) gets no
  ground damage ring even though it broke windows region-wide; the preset's note says so.
- Numbers are order-of-magnitude estimates for education and entertainment.
