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
| Scale height / sea-level air density | 8 km / 1 kg/m³ |
| Drag coefficient / pancake factor | 2 / 7 |
| TNT | 1 kt = 4.184×10¹² J; Hiroshima = 15 kt |

## Validation (see `src/physics/__tests__`)

| Case | Model | Reality |
| --- | --- | --- |
| Meteor Crater — 50 m iron, 12.8 km/s | 1.46 km crater | 1.2 km |
| Tunguska preset — 60 m rock, 20 km/s | ~15 Mt airburst at ~4.8 km, severe damage ~15 km | 10–15 Mt, 5–10 km up, 2,150 km² flattened |
| Chicxulub preset — 10 km rock, 20 km/s, 60° | ~129 km crater, M 9.9 | ~180 km crater |
| 1 Mt surface burst, 5 psi | ~4.4 km | ~4.6 km (Glasstone) |

## Known limitations (v1)

- Every target is treated as land — no water layer, no tsunami.
- Airbursts have no crater or seismic output.
- High, shallow airbursts are under-predicted. Chelyabinsk (≈30 km up at 18°) gets no
  ground damage ring even though it broke windows region-wide; the preset's note says so.
- Numbers are order-of-magnitude estimates for education and entertainment.
