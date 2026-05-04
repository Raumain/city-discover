import { resolveDailyDistanceKm, type HealthConnectDailyData } from './healthConnect';

describe('resolveDailyDistanceKm', () => {
  it('prefers Health Connect distance when available', () => {
    const data: HealthConnectDailyData = { steps: 7000, distanceKm: 5.3 };
    expect(resolveDailyDistanceKm(data, 0.75)).toBeCloseTo(5.3, 5);
  });

  it('falls back to step-based estimate when distance is missing', () => {
    const data: HealthConnectDailyData = { steps: 8000 };
    expect(resolveDailyDistanceKm(data, 0.75)).toBeCloseTo(6, 5);
  });
});
