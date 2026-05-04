import { aggregatePeriodStats, type DailyStat } from './stats';

const daily: DailyStat[] = [
  { isoDate: '2026-04-28', steps: 4200, kilometers: 3.2, newlyDiscoveredMeters: 300 },
  { isoDate: '2026-04-29', steps: 5100, kilometers: 4.0, newlyDiscoveredMeters: 450 },
  { isoDate: '2026-04-30', steps: 6300, kilometers: 4.7, newlyDiscoveredMeters: 250 },
];

describe('aggregatePeriodStats', () => {
  it('aggregates day period for a single date', () => {
    const result = aggregatePeriodStats(daily, {
      mode: 'day',
      anchorIsoDate: '2026-04-30',
      totalCityStreetLengthMeters: 10000,
    });

    expect(result.steps).toBe(6300);
    expect(result.kilometers).toBeCloseTo(4.7, 5);
    expect(result.periodDiscoveryPercent).toBeCloseTo(2.5, 5);
  });

  it('aggregates week period for the last 7 days ending on anchor date', () => {
    const result = aggregatePeriodStats(daily, {
      mode: 'week',
      anchorIsoDate: '2026-04-30',
      totalCityStreetLengthMeters: 10000,
    });

    expect(result.steps).toBe(15600);
    expect(result.kilometers).toBeCloseTo(11.9, 5);
    expect(result.periodDiscoveryPercent).toBeCloseTo(10, 5);
  });
});
