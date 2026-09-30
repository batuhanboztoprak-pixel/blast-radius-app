#!/usr/bin/env node
// Checks store/listing.json against App Store Connect limits and flags keywords
// that repeat words from the name or subtitle (those are indexed already).
//   node scripts/check-store-listing.js
const fs = require('fs');
const path = require('path');

const LIMITS = { name: 30, subtitle: 30, keywords: 100, promotionalText: 170, description: 4000, whatsNew: 4000 };
const listing = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'store', 'listing.json'), 'utf8'));
const len = (s) => [...s].length;

let errors = 0;
for (const [locale, meta] of Object.entries(listing)) {
  if (locale.startsWith('_')) continue;
  const rows = [];
  for (const [field, limit] of Object.entries(LIMITS)) {
    const value = meta[field];
    if (typeof value !== 'string' || !value.trim()) {
      rows.push(`  ✗ ${field}: missing`);
      errors++;
      continue;
    }
    const n = len(value);
    const ok = n <= limit;
    if (!ok) errors++;
    rows.push(`  ${ok ? '✓' : '✗'} ${field}: ${n}/${limit}`);
  }
  const kw = meta.keywords.split(',');
  if (kw.some((k) => k !== k.trim() || !k)) {
    rows.push('  ✗ keywords: no spaces around commas, no empty entries');
    errors++;
  }
  const titleWords = new Set(
    `${meta.name} ${meta.subtitle}`.toLocaleLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean),
  );
  const repeats = kw.filter((k) => titleWords.has(k.toLocaleLowerCase()));
  if (repeats.length) rows.push(`  ! keywords repeat name/subtitle words (wasted space): ${repeats.join(', ')}`);
  const dupes = kw.filter((k, i) => kw.indexOf(k) !== i);
  if (dupes.length) {
    rows.push(`  ✗ duplicate keywords: ${dupes.join(', ')}`);
    errors++;
  }
  if (!Array.isArray(meta.screenshots) || meta.screenshots.length === 0) {
    rows.push('  ✗ screenshots: add captions');
    errors++;
  }
  console.log(`${locale}\n${rows.join('\n')}`);
}
if (errors) {
  console.error(`\n${errors} problem(s).`);
  process.exit(1);
}
console.log('\nAll listings fit.');
