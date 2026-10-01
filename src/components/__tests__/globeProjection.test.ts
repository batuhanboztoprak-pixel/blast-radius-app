import { drawShapes, LAND_SHAPES, pushRing, type Shapes } from '../globeProjection';

/** Records path commands instead of drawing them. */
function recorder() {
  const pts: { op: 'M' | 'L'; x: number; y: number }[] = [];
  let closes = 0;
  return {
    pts,
    closes: () => closes,
    sink: {
      moveTo: (x: number, y: number) => pts.push({ op: 'M', x, y }),
      lineTo: (x: number, y: number) => pts.push({ op: 'L', x, y }),
      close: () => closes++,
    },
  };
}

const shape = (ring: number[][]): Shapes => {
  const s: Shapes = { xyz: [], runs: [] };
  pushRing(s, ring);
  return s;
};

describe('globe projection', () => {
  it('puts the view centre in the middle of the globe', () => {
    const r = recorder();
    drawShapes(r.sink, shape([[30, 40]]), 40, 30, 100, 200, 300, true);
    expect(r.pts[0].x).toBeCloseTo(200, 6);
    expect(r.pts[0].y).toBeCloseTo(300, 6);
  });

  it('puts north up and east to the right', () => {
    const r = recorder();
    drawShapes(r.sink, shape([[0, 10], [10, 0]]), 0, 0, 100, 0, 0, false);
    expect(r.pts[0].x).toBeCloseTo(0, 6);
    expect(r.pts[0].y).toBeLessThan(0); // north is up (smaller y)
    expect(r.pts[1].x).toBeGreaterThan(0); // east is right
  });

  it('draws nothing for a shape entirely on the far side', () => {
    const r = recorder();
    drawShapes(r.sink, shape([[180, 0], [170, 20], [-170, 20]]), 0, 0, 100, 0, 0, true);
    expect(r.pts).toHaveLength(0);
  });

  it('fills the whole disc for a far-side ring that surrounds the viewer', () => {
    const r = recorder();
    // A circle 120° around the view centre lies entirely on the far side.
    const ring: number[][] = [];
    for (let a = 0; a <= 360; a += 5) ring.push([180 + 60 * Math.cos((a * Math.PI) / 180), 60 * Math.sin((a * Math.PI) / 180)]);
    drawShapes(r.sink, shape(ring), 0, 0, 100, 0, 0, true, true);
    expect(r.pts.length).toBeGreaterThan(40);
    for (const p of r.pts) expect(Math.hypot(p.x, p.y)).toBeCloseTo(100, 6);
  });

  it('breaks lines on the far side', () => {
    const r = recorder();
    drawShapes(r.sink, shape([[0, 0], [100, 0], [-160, 0], [-100, 0], [-60, 0]]), 0, 0, 100, 0, 0, false);
    // front (0), back (100, -160, -100), front again (-60): two separate strokes
    expect(r.pts.filter((p) => p.op === 'M')).toHaveLength(2);
  });

  it('keeps land inside the globe and never cuts across it, from any side', () => {
    for (const [lat, lon] of [
      [21.4, -89.5],
      [90, 0],
      [-90, 0],
      [51.8, 32.3],
      [-30, 150],
      [0, 180],
    ]) {
      const r = recorder();
      drawShapes(r.sink, LAND_SHAPES, lat, lon, 100, 0, 0, true);
      for (const p of r.pts) expect(Math.hypot(p.x, p.y)).toBeLessThanOrEqual(100 + 1e-6);
      // Along the rim the path is a smooth arc: short steps only.
      for (let i = 1; i < r.pts.length; i++) {
        const a = r.pts[i - 1];
        const b = r.pts[i];
        if (b.op !== 'L') continue;
        const onRim = (p: { x: number; y: number }) => Math.abs(Math.hypot(p.x, p.y) - 100) < 1e-6;
        if (onRim(a) && onRim(b)) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(8);
      }
    }
  });

  it('does not fill the disc with Antarctica when looking at the North Pole', () => {
    const r = recorder();
    drawShapes(r.sink, LAND_SHAPES, 90, 0, 100, 0, 0, true);
    // Antarctica is entirely on the far side: it must not turn into a full rim
    // circle that would paint the whole disc.
    const rim = r.pts.filter((p) => Math.abs(Math.hypot(p.x, p.y) - 100) < 1e-6);
    expect(rim.length).toBeLessThan(r.pts.length);
    const angles = new Set(rim.map((p) => Math.round((Math.atan2(p.y, p.x) * 180) / Math.PI / 10)));
    expect(angles.size).toBeLessThan(36);
  });
});
