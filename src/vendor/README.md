# Vendored libraries

Copied unmodified (except import paths) so the app needs no extra npm packages.

| Folder | Source | Version | License |
| --- | --- | --- | --- |
| `d3-geo/` | https://github.com/d3/d3-geo `src/` | 3.1.1 | ISC (`d3-geo/LICENSE`) |
| `d3-array/` | https://github.com/d3/d3-array `src/fsum.js`, `merge.js`, `range.js` | 3.x | ISC (`d3-array/LICENSE`) |

`d3-geo`'s imports of `"d3-array"` were rewritten to `../d3-array/index.js`.
Types for the parts the app uses are in `src/vendor/d3-geo.d.ts`.
