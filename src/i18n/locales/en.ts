/**
 * English source strings. Every other language must provide exactly these keys
 * (enforced by the Messages type and src/i18n/__tests__/catalogs.test.ts).
 * {name} marks a value filled in at runtime; keep them in translations.
 */
export const en = {
  // Shared
  'common.back': 'Back',
  'common.close': 'Close',
  'common.share': 'Share',
  'common.none': 'None',

  // Units
  'units.label': 'Units',
  'units.metric': 'km',
  'units.imperial': 'miles',
  'units.a11y': 'Distance units',

  // Step 1 — location
  'pick.step': 'STEP 1 OF 3',
  'pick.title': 'Where should it hit?',
  'pick.subtitle': 'Tap anywhere on the map or search a city.',
  'pick.searchPlaceholder': 'Search a city or address',
  'pick.noResult': 'No place found for “{query}”.',
  'pick.searchUnavailable': 'Search is unavailable right now. Tap the map instead.',
  'pick.locationOff': 'Location access is off. Search or tap the map instead.',
  'pick.locationFailed': 'Could not find your location. Search or tap the map instead.',
  'pick.useMyLocation': 'Use my location',
  'pick.continue': 'Continue',
  'pick.dropPin': 'Drop a pin to continue',

  // Step 2 — asteroid
  'asteroid.step': 'STEP 2 OF 3',
  'asteroid.title': 'Set the asteroid',
  'asteroid.target': 'Target: {place}',
  'asteroid.subtitle': 'Size and speed decide how bad it gets.',
  'asteroid.diameter': 'Diameter',
  'asteroid.diameterA11y': 'Asteroid diameter',
  'asteroid.composition': 'Composition',
  'asteroid.speed': 'Entry speed',
  'asteroid.speedA11y': 'Entry speed',
  'asteroid.speedNote':
    'Every real asteroid or comet hits in this range: 11 km/s is Earth’s escape speed, 72 km/s a comet meeting Earth head-on. Typical asteroids arrive at 17–20 km/s.',
  'asteroid.presets': 'Famous impacts',
  'asteroid.presetAngle': '{angle}° entry angle, as reconstructed for the real event.',
  'asteroid.energyPreview': '≈ {value} {unit} of TNT',
  'asteroid.simulate': 'Simulate impact',
  'composition.rock': 'Rock',
  'composition.iron': 'Iron',
  'composition.comet': 'Comet',
  'chip.requiresPro': '{label}, requires Pro',

  // Numbers and units in words
  'num.million': '{n} million',
  'num.billion': '{n} billion',
  'energy.kilotons': 'kilotons',
  'energy.megatons': 'megatons',
  'energy.millionMegatons': 'million megatons',
  'years.severalPerYear': 'several times a year',
  'years.every': 'every ~{n} years',

  // Step 3 — result
  'result.replay': '↻ Replay',
  'result.replayA11y': 'Replay impact',
  'result.map': 'Map',
  'result.globe': 'Globe',
  'result.dragToSpin': 'Drag to spin',
  'result.airburstEnergy': 'AIRBURST ENERGY',
  'result.energyReleased': 'ENERGY RELEASED',
  'result.hiroshimaTimes': '≈ {x}× the Hiroshima bomb',
  'result.hiroshimaPercent': '≈ {pct}% of the Hiroshima bomb',
  'result.craterWidth': 'CRATER WIDTH',
  'result.exploded': 'Exploded {altitude} up',
  'result.deep': '{depth} deep',
  'result.quake': 'QUAKE EQUIVALENT',
  'result.quakeValue': 'M {m}',
  'result.richter': 'Richter scale',
  'result.quakeAirburst': 'Airbursts barely shake the ground',
  'result.buildings': 'BUILDINGS COLLAPSE',
  'result.buildingsHint': 'radius, ~5 psi',
  'result.windows': 'WINDOWS SHATTER',
  'result.windowsHint': 'radius, ~1 psi',
  'result.burns': '3RD-DEGREE BURNS',
  'result.burnsHint': 'radius, exposed skin',
  'result.burnsNone': 'No thermal pulse at ground',
  'result.recurrence': 'HAPPENS ON EARTH',
  'result.peopleInside': 'radius · {n} people inside',
  'result.unlockBurns': 'Unlock thermal burns ring · Pro',
  'result.proHint': 'Pro adds iron & comet asteroids, the burns ring and famous impacts.',
  'result.footnote':
    'Estimates from the Earth Impact Effects Program equations (Collins, Melosh & Marcus, 2005). Assumes a land impact at {angle}°. People from NASA SEDAC GPWv4 scaled to 2026; casualties per NASA’s PAIR model (everyone inside the 4 psi or burns radius), global deaths per Chapman & Morrison (1994). Rough estimates.',
  'result.tryAgain': 'Try again',

  // Rings and legend
  'ring.crater': 'Crater',
  'ring.thermal': '3rd-degree burns',
  'ring.severe': 'Severe shockwave',
  'ring.windows': 'Window breakage',
  'legend.tapToZoom': 'Tap a ring to zoom',
  'legend.tapAgain': 'Tap again to see all',
  'legend.zoomA11y': '{ring}. Zoom to this ring',
  'legend.showAllA11y': '{ring}. Show all rings',
  'legend.thermalLockedA11y': 'Thermal burns ring, requires Pro',

  // Population
  'population.casualties': 'CASUALTIES HERE',
  'population.casualtiesHint': 'killed or seriously injured near the impact',
  'population.worldwide': 'WORLDWIDE',
  'population.worldwideHint': '{pct}% of the rest of humanity, from global effects',
  'population.worldLeft': 'WORLD POPULATION LEFT',
  'population.reset': 'Reset Earth',
  'population.resetA11y': 'Reset world population',
  'population.barA11y': '{pct} percent of humanity left',
  'population.intro': 'Every strike you simulate is taken off this total.',
  'plural.strikes_one': '{pct}% of humanity after {count} strike.',
  'plural.strikes_other': '{pct}% of humanity after {count} strikes.',

  // Share
  'share.step': 'SHARE',
  'share.title': 'Your impact card',
  'share.kicker': 'If a {size} {object} hit {place}',
  'share.object.rock': 'rock',
  'share.object.iron': 'iron asteroid',
  'share.object.comet': 'comet',
  'share.hiroshimaTimes': '{x}× Hiroshima',
  'share.hiroshimaPercent': '{pct}% of Hiroshima',
  'share.airburst': 'Airburst — no crater, little damage on the ground',
  'share.footer': 'Simulated with Blast Radius',
  'share.quake': 'M{m} quake',
  'share.button': 'Share image',
  'share.preparing': 'Preparing map…',
  'share.dialogTitle': 'Share your impact',
  'share.unavailable': 'Sharing is not available on this device.',
  'share.failed': 'Could not create the image. Please try again.',

  // Paywall
  'paywall.kicker': 'BLAST RADIUS PRO',
  'paywall.title': 'Unlock the full arsenal',
  'paywall.subtitle': 'One payment. Yours forever. No subscription.',
  'paywall.noAds': 'No ads',
  'paywall.noAdsBody': 'Banners and full-screen ads, gone for good.',
  'paywall.compositions': 'Iron & comet asteroids',
  'paywall.compositionsBody': 'Dense iron punches deeper; icy comets burst higher and faster.',
  'paywall.thermal': 'Thermal burns ring',
  'paywall.thermalBody': 'See how far the fireball’s heat causes 3rd-degree burns.',
  'paywall.presets': 'Famous impacts',
  'paywall.presetsBody': 'Tunguska, Chelyabinsk and Chicxulub — dropped anywhere you like.',
  'paywall.unlock': 'Unlock Pro',
  'paywall.unlockPrice': 'Unlock Pro · {price}',
  'paywall.restore': 'Restore purchase',
  'paywall.privacy': 'Ad privacy choices',
  'purchase.failed': 'Purchase failed. Please try again.',
  'purchase.restoreFailed': 'Restore failed. Please try again.',
  'purchase.nothingToRestore': 'No previous purchase found for this Apple ID.',

  // Presets
  'preset.tunguska.name': 'Tunguska',
  'preset.tunguska.year': '1908',
  'preset.tunguska.note':
    'Exploded a few km above the Siberian taiga and flattened ~80 million trees over 2,150 km².',
  'preset.chelyabinsk.name': 'Chelyabinsk',
  'preset.chelyabinsk.year': '2013',
  'preset.chelyabinsk.note':
    'Burst ~30 km up on a shallow path. Its shockwave broke windows across the region and injured ~1,500 people — more than this simplified model predicts for such a high, grazing airburst.',
  'preset.chicxulub.name': 'Chicxulub',
  'preset.chicxulub.year': '66 million years ago',
  'preset.chicxulub.note':
    'The dinosaur killer. Left a ~180 km crater and triggered a mass extinction. Ring sizes at this scale are rough — the effects were global.',
} as const;

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;
