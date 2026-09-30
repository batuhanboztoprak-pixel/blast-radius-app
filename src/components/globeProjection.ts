/**
 * Orthographic globe maths for the Skia globe (GlobeView). Pure, and the
 * projection is a Reanimated worklet so it runs on the UI thread every frame.
 */
import { LAND } from '../data/land';

const RAD = Math.PI / 180;

/** Flattened unit vectors (x, y, z) plus [start, count] per polygon ring. */
export interface Shapes {
  xyz: number[];
  runs: number[];
}

export function pushRing(out: Shapes, ring: number[][]) {
  out.runs.push(out.xyz.length / 3, ring.length);
  for (const [lon, lat] of ring) {
    const c = Math.cos(lat * RAD);
    out.xyz.push(c * Math.sin(lon * RAD), Math.sin(lat * RAD), c * Math.cos(lon * RAD));
  }
}

// Land and the graticule never change: convert them to 3-D points once.
export const LAND_SHAPES: Shapes = (() => {
  const s: Shapes = { xyz: [], runs: [] };
  for (const poly of LAND.coordinates) for (const ring of poly) pushRing(s, ring);
  return s;
})();
export const GRATICULE: Shapes = (() => {
  const s: Shapes = { xyz: [], runs: [] };
  for (let lon = -180; lon < 180; lon += 30) {
    const line: number[][] = [];
    for (let lat = -80; lat <= 80; lat += 4) line.push([lon, lat]);
    pushRing(s, line);
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const line: number[][] = [];
    for (let lon = -180; lon <= 180; lon += 4) line.push([lon, lat]);
    pushRing(s, line);
  }
  return s;
})();

export type PathSink = { moveTo(x: number, y: number): unknown; lineTo(x: number, y: number): unknown; close(): unknown };

/**
 * Orthographic projection, run on the UI thread every frame. Points on the far
 * side are pushed out to the rim for filled shapes (so land and rings stay
 * closed and clip cleanly at the horizon), and break the line for strokes.
 */
export function drawShapes(
  p: PathSink,
  s: Shapes,
  lat0: number,
  lon0: number,
  R: number,
  cx: number,
  cy: number,
  filled: boolean,
) {
  'worklet';
  const sl = Math.sin(lon0 * RAD);
  const cl = Math.cos(lon0 * RAD);
  const sa = Math.sin(lat0 * RAD);
  const ca = Math.cos(lat0 * RAD);
  const { xyz, runs } = s;
  for (let r = 0; r < runs.length; r += 2) {
    const start = runs[r];
    const n = runs[r + 1];
    let pen = false;
    for (let i = 0; i < n; i++) {
      const k = (start + i) * 3;
      const x = xyz[k];
      const y = xyz[k + 1];
      const z = xyz[k + 2];
      let px = x * cl - z * sl;
      const z1 = x * sl + z * cl;
      let py = y * ca - z1 * sa;
      const pz = y * sa + z1 * ca;
      if (pz <= 0) {
        if (!filled) {
          pen = false;
          continue;
        }
        const len = Math.sqrt(px * px + py * py) || 1;
        px /= len;
        py /= len;
      }
      const sx = cx + R * px;
      const sy = cy - R * py;
      if (pen) p.lineTo(sx, sy);
      else {
        p.moveTo(sx, sy);
        pen = true;
      }
    }
    if (filled && pen) p.close();
  }
}
