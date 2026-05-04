import {
  calculateDiscoveryMetrics,
  updateDiscoveredSegmentsFromTrack,
  type TrackPoint,
  type StreetSegment,
} from './discovery';

const segments: StreetSegment[] = [
  { id: 'a', lengthMeters: 100, discoveredMeters: 0 },
  { id: 'b', lengthMeters: 150, discoveredMeters: 0 },
];

describe('calculateDiscoveryMetrics', () => {
  it('returns length primary and segment secondary percentages', () => {
    const result = calculateDiscoveryMetrics([
      { id: 'a', lengthMeters: 100, discoveredMeters: 100 },
      { id: 'b', lengthMeters: 150, discoveredMeters: 30 },
    ]);

    expect(result.totalLengthMeters).toBe(250);
    expect(result.discoveredLengthMeters).toBe(130);
    expect(result.lengthPercent).toBeCloseTo(52, 5);
    expect(result.segmentPercent).toBeCloseTo(100, 5);
  });
});

describe('updateDiscoveredSegmentsFromTrack', () => {
  it('marks a segment discovered after at least 20 meters of eligible movement', () => {
    const points: TrackPoint[] = [
      { segmentId: 'a', distanceFromPreviousMeters: 10, speedMps: 1.4 },
      { segmentId: 'a', distanceFromPreviousMeters: 12, speedMps: 1.6 },
      { segmentId: 'b', distanceFromPreviousMeters: 8, speedMps: 1.2 },
    ];

    const updated = updateDiscoveredSegmentsFromTrack(segments, points);

    expect(updated.find((segment) => segment.id === 'a')?.discoveredMeters).toBe(22);
    expect(updated.find((segment) => segment.id === 'b')?.discoveredMeters).toBe(0);
  });

  it('ignores points outside walking or running speed range', () => {
    const points: TrackPoint[] = [
      { segmentId: 'a', distanceFromPreviousMeters: 50, speedMps: 9.5 },
      { segmentId: 'a', distanceFromPreviousMeters: 30, speedMps: 0.2 },
    ];

    const updated = updateDiscoveredSegmentsFromTrack(segments, points);
    expect(updated.find((segment) => segment.id === 'a')?.discoveredMeters).toBe(0);
  });
});
