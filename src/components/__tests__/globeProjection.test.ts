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

  it('pushes far-side points of filled shapes onto the rim', () => {
    const r = recorder();
    drawShapes(r.sink, shape([[180, 0], [170, 20], [-170, 20]]), 0, 0, 100, 0, 0, true);
    for (const p of r.pts) expect(Math.hypot(p.x, p.y)).toBeCloseTo(100, 6);
    expect(r.closes()).toBe(1);
  });

  it('breaks lines on the far side', () => {
    const r = recorder();
    drawShapes(r.sink, shape([[0, 0], [100, 0], [-160, 0], [-100, 0], [-60, 0]]), 0, 0, 100, 0, 0, false);
    // front (0), back (100, -160, -100), front again (-60): two separate strokes
    expect(r.pts.filter((p) => p.op === 'M')).toHaveLength(2);
  });

  it('projects every land point inside the globe', () => {
    const r = recorder();
    drawShapes(r.sink, LAND_SHAPES, 21.4, -89.5, 150, 0, 0, true);
    expect(r.pts.length).toBe(LAND_SHAPES.xyz.length / 3);
    for (const p of r.pts) expect(Math.hypot(p.x, p.y)).toBeLessThanOrEqual(150 + 1e-6);
  });
});
