import type { StreetSegment } from '@/src/domain/discovery';
import { buildDiscoveryDeltasFromMatchedPoints } from '@/src/features/tracking/discoveryUpdater';

describe('discoveryUpdater', () => {
  test('builds per-segment deltas using eligible speed and discovery threshold', () => {
    const segments: StreetSegment[] = [
      {
        id: 'seg-1',
        lengthMeters: 120,
        discoveredMeters: 30,
      },
      {
        id: 'seg-2',
        lengthMeters: 80,
        discoveredMeters: 0,
      },
    ];
    const deltas = buildDiscoveryDeltasFromMatchedPoints(segments, [
      {
        segmentId: 'seg-1',
        distanceFromPreviousMeters: 24,
        speedMps: 1.2,
      },
      {
        segmentId: 'seg-1',
        distanceFromPreviousMeters: 15,
        speedMps: 1.4,
      },
      {
        segmentId: 'seg-2',
        distanceFromPreviousMeters: 10,
        speedMps: 1.2,
      },
      {
        segmentId: 'seg-2',
        distanceFromPreviousMeters: 30,
        speedMps: 7.5,
      },
    ]);

    expect(deltas).toEqual([
      {
        segmentId: 'seg-1',
        discoveredMetersDelta: 39,
      },
    ]);
  });
});
