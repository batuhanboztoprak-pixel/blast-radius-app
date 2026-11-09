import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

// App Review rejects a binary that mentions App Tracking Transparency when the
// app never asks to track. Keep every trace of it out of the config.
const ROOT = join(__dirname, '..', '..');
const BANNED = /NSUserTrackingUsageDescription|tracking-transparency|google-mobile-ads/;

describe('no tracking', () => {
  it('app.json and the per-language plist strings never mention tracking', () => {
    const files = ['app.json', 'package.json', ...readdirSync(join(ROOT, 'languages')).map((f) => join('languages', f))];
    for (const f of files) expect(readFileSync(join(ROOT, f), 'utf8')).not.toMatch(BANNED);
  });
});
