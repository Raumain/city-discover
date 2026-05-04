import { buildDailyStatsFromSessions } from '@/src/features/discovery/dailyStatsBuilder';

describe('buildDailyStatsFromSessions', () => {
  test('groups sessions by date and computes totals', () => {
    const stats = buildDailyStatsFromSessions([
      {
        id: 's1',
        startedAtIso: '2026-04-30T10:00:00.000Z',
        endedAtIso: '2026-04-30T10:20:00.000Z',
        acceptedPointCount: 5,
        distanceMeters: 1450,
        discoveredMeters: 80,
      },
      {
        id: 's2',
        startedAtIso: '2026-04-30T14:00:00.000Z',
        endedAtIso: '2026-04-30T14:15:00.000Z',
        acceptedPointCount: 3,
        distanceMeters: 750,
        discoveredMeters: 40,
      },
    ]);

    expect(stats).toHaveLength(1);
    expect(stats[0].isoDate).toBe('2026-04-30');
    expect(stats[0].kilometers).toBe(2.2);
    expect(stats[0].steps).toBe(Math.round(2200 / 0.75));
    expect(stats[0].newlyDiscoveredMeters).toBe(120);
  });

  test('separates sessions on different dates', () => {
    const stats = buildDailyStatsFromSessions([
      {
        id: 's1',
        startedAtIso: '2026-04-29T10:00:00.000Z',
        endedAtIso: '2026-04-29T10:20:00.000Z',
        acceptedPointCount: 4,
        distanceMeters: 1000,
        discoveredMeters: 50,
      },
      {
        id: 's2',
        startedAtIso: '2026-04-30T14:00:00.000Z',
        endedAtIso: '2026-04-30T14:15:00.000Z',
        acceptedPointCount: 3,
        distanceMeters: 500,
        discoveredMeters: 30,
      },
    ]);

    expect(stats).toHaveLength(2);
  });

  test('returns empty array for no sessions', () => {
    expect(buildDailyStatsFromSessions([])).toEqual([]);
  });

  test('uses default stride of 0.75 when not provided', () => {
    const stats = buildDailyStatsFromSessions([
      {
        id: 's1',
        startedAtIso: '2026-04-30T10:00:00.000Z',
        endedAtIso: '2026-04-30T10:20:00.000Z',
        acceptedPointCount: 5,
        distanceMeters: 750,
        discoveredMeters: 0,
      },
    ]);

    expect(stats[0].steps).toBe(1000);
  });

  test('accepts custom stride', () => {
    const stats = buildDailyStatsFromSessions(
      [
        {
          id: 's1',
          startedAtIso: '2026-04-30T10:00:00.000Z',
          endedAtIso: '2026-04-30T10:20:00.000Z',
          acceptedPointCount: 5,
          distanceMeters: 1600,
          discoveredMeters: 0,
        },
      ],
      0.8
    );

    expect(stats[0].steps).toBe(2000);
  });
});
