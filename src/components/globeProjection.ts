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
 * Orthographic projection, run on the UI thread every frame.
 *
 * Shapes are clipped exactly at the horizon: where an edge crosses it, the
 * crossing point is computed on the great circle. Filled shapes then follow
 * the rim (as a smooth arc) until they come back to the front, so nothing
 * cuts across the globe however far it is zoomed in. Lines just stop and
 * restart at the horizon.
 *
 * `coversFront` is for shapes that lie entirely on the far side: if true (a
 * ring bigger than a hemisphere around a point facing away), the whole visible
 * disc is inside it and is filled.
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
  coversFront = false,
) {
  'worklet';
  const sl = Math.sin(lon0 * RAD);
  const cl = Math.cos(lon0 * RAD);
  const sa = Math.sin(lat0 * RAD);
  const ca = Math.cos(lat0 * RAD);
  const { xyz, runs } = s;
  // Rotate every point once: (x, y) on screen axes, z towards the viewer.
  const rot = new Array<number>(xyz.length);
  for (let k = 0; k < xyz.length; k += 3) {
    const x = xyz[k];
    const y = xyz[k + 1];
    const z = xyz[k + 2];
    const z1 = x * sl + z * cl;
    rot[k] = x * cl - z * sl;
    rot[k + 1] = y * ca - z1 * sa;
    rot[k + 2] = y * sa + z1 * ca;
  }
  const SX = (x: number) => cx + R * x;
  const SY = (y: number) => cy - R * y;
  /** Where the edge a→b crosses the horizon, as a unit vector on screen axes. */
  const cross = (a: number, b: number): [number, number] => {
    const t = rot[a + 2] / (rot[a + 2] - rot[b + 2]);
    const x = rot[a] + t * (rot[b] - rot[a]);
    const y = rot[a + 1] + t * (rot[b + 1] - rot[a + 1]);
    const len = Math.sqrt(x * x + y * y) || 1;
    return [x / len, y / len];
  };
  const wrap = (d: number) => {
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return d;
  };
  const arc = (from: number, to: number) => {
    const steps = Math.max(1, Math.ceil(Math.abs(to - from) / 0.07));
    for (let j = 1; j <= steps; j++) {
      const a = from + ((to - from) * j) / steps;
      p.lineTo(SX(Math.cos(a)), SY(Math.sin(a)));
    }
  };

  for (let r = 0; r < runs.length; r += 2) {
    const start = runs[r];
    const n = runs[r + 1];
    if (n === 0) continue;

    if (!filled) {
      let pen = false;
      for (let i = 0; i < n; i++) {
        const k = (start + i) * 3;
        const front = rot[k + 2] > 0;
        if (i > 0) {
          const pk = k - 3;
          const prevFront = rot[pk + 2] > 0;
          if (prevFront && !front) {
            const [x, y] = cross(pk, k);
            p.lineTo(SX(x), SY(y));
            pen = false;
          } else if (!prevFront && front) {
            const [x, y] = cross(pk, k);
            p.moveTo(SX(x), SY(y));
            pen = true;
          }
        }
        if (!front) continue;
        if (pen) p.lineTo(SX(rot[k]), SY(rot[k + 1]));
        else {
          p.moveTo(SX(rot[k]), SY(rot[k + 1]));
          pen = true;
        }
      }
      continue;
    }

    // Filled: start from a point on the front, if there is one.
    let first = -1;
    for (let i = 0; i < n; i++) {
      if (rot[(start + i) * 3 + 2] > 0) {
        first = i;
        break;
      }
    }
    if (first < 0) {
      if (coversFront) {
        p.moveTo(SX(1), SY(0));
        arc(0, 2 * Math.PI);
        p.close();
      }
      continue;
    }
    const at = (i: number) => (start + ((first + i) % n)) * 3;
    p.moveTo(SX(rot[at(0)]), SY(rot[at(0) + 1]));
    let exitAng = 0;
    let acc = 0;
    let last = 0;
    for (let i = 1; i <= n; i++) {
      const pk = at(i - 1);
      const k = at(i);
      const prevFront = rot[pk + 2] > 0;
      const front = rot[k + 2] > 0;
      if (prevFront && front) {
        p.lineTo(SX(rot[k]), SY(rot[k + 1]));
      } else if (prevFront && !front) {
        const [x, y] = cross(pk, k);
        p.lineTo(SX(x), SY(y));
        exitAng = Math.atan2(y, x);
        acc = exitAng;
        last = exitAng;
      } else if (!prevFront && !front) {
        // Follow the far-side path's direction around the rim.
        const x = rot[k];
        const y = rot[k + 1];
        if (x * x + y * y > 1e-12) {
          const a = Math.atan2(y, x);
          acc += wrap(a - last);
          last = a;
        }
      } else {
        const [x, y] = cross(pk, k);
        const a = Math.atan2(y, x);
        acc += wrap(a - last);
        arc(exitAng, acc);
        p.lineTo(SX(rot[k]), SY(rot[k + 1]));
      }
    }
    p.close();
  }
}
