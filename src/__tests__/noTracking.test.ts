import app from '../../app.json';
import pkg from '../../package.json';
import de from '../../languages/de.json';
import en from '../../languages/en.json';
import es from '../../languages/es.json';
import fr from '../../languages/fr.json';
import ja from '../../languages/ja.json';
import pt from '../../languages/pt.json';
import tr from '../../languages/tr.json';

// App Review rejects a binary that mentions App Tracking Transparency when the
// app never asks to track. Keep every trace of it out of the config, including
// the per-language plist strings in languages/.
const BANNED = /NSUserTrackingUsageDescription|tracking-transparency|google-mobile-ads/;

describe('no tracking', () => {
  it.each(Object.entries({ app, pkg, de, en, es, fr, ja, pt, tr }))('%s has no tracking keys', (_name, json) => {
    expect(JSON.stringify(json)).not.toMatch(BANNED);
  });

  it('every language in app.json is checked', () => {
    expect(Object.keys(app.expo.locales).sort()).toEqual(['de', 'en', 'es', 'fr', 'ja', 'pt', 'tr']);
  });
});
