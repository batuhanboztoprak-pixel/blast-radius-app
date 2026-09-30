// Types for the parts of the vendored d3-geo the app uses (see ../README.md).
// Trimmed from @types/d3-geo; the implementation is ./index.js.

export interface GeoGeometry {
  type: string;
  coordinates?: unknown;
}

export interface GeoProjection {
  (point: [number, number]): [number, number] | null;
  invert(point: [number, number]): [number, number] | null;
  scale(): number;
  scale(k: number): this;
  translate(): [number, number];
  translate(t: [number, number]): this;
  rotate(): [number, number, number];
  rotate(r: [number, number] | [number, number, number]): this;
  clipAngle(): number | null;
  clipAngle(angle: number | null): this;
  precision(): number;
  precision(p: number): this;
}

export interface GeoPath {
  (object: GeoGeometry | { type: 'Sphere' }): string | null;
  projection(p: GeoProjection): this;
  /** Decimal places in the output path string (null = full precision). */
  digits(d: number | null): this;
}

export interface GeoCircle {
  (): { type: 'Polygon'; coordinates: [number, number][][] };
  center(c: [number, number]): this;
  radius(r: number): this;
  precision(p: number): this;
}

export interface GeoGraticule {
  (): { type: 'MultiLineString'; coordinates: [number, number][][] };
  step(s: [number, number]): this;
}

export function geoOrthographic(): GeoProjection;
export function geoPath(projection?: GeoProjection | null): GeoPath;
export function geoCircle(): GeoCircle;
export function geoGraticule(): GeoGraticule;
export function geoDistance(a: [number, number], b: [number, number]): number;
