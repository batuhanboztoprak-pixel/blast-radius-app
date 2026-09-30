import { formatCoords, snapshotFrame } from '../geo';

describe('snapshotFrame', () => {
  it('fits the radius to the requested fraction of the shorter side', () => {
    const { pxPerMeter } = snapshotFrame(41, 29, 50_000, 300, 400, 0.4);
    expect(50_000 * pxPerMeter).toBeCloseTo(120, 5);
  });

  it('is centred on the impact latitude for small regions', () => {
    const { region } = snapshotFrame(41, 29, 10_000, 300, 400);
    expect(region.latitude).toBeCloseTo(41, 1);
    expect(region.longitude).toBe(29);
    expect(region.latitudeDelta).toBeGreaterThan(0);
  });

  it('keeps huge regions on the globe', () => {
    const { region } = snapshotFrame(21, -89, 10_000_000, 300, 400);
    expect(region.longitudeDelta).toBeLessThanOrEqual(360.0001);
    expect(region.latitude + region.latitudeDelta / 2).toBeLessThanOrEqual(85);
    expect(region.latitude - region.latitudeDelta / 2).toBeGreaterThanOrEqual(-85);
  });
});

describe('formatCoords', () => {
  it('uses hemisphere letters', () => {
    expect(formatCoords(-33.87, 151.21)).toBe('33.87°S, 151.21°E');
    expect(formatCoords(40.71, -74.01)).toBe('40.71°N, 74.01°W');
  });
});
