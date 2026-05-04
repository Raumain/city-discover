import type { RawTrackPoint } from '@/src/features/tracking/session';
import { matchTrackPointToSegment, type MatchableSegment } from '@/src/features/tracking/mapMatcher';

const segments: MatchableSegment[] = [
  {
    id: 'seg-1',
    fromX: 0,
    fromY: 0,
    toX: 10,
    toY: 0,
  },
  {
    id: 'seg-2',
    fromX: 20,
    fromY: 20,
    toX: 30,
    toY: 20,
  },
];

describe('mapMatcher', () => {
  test('matches the closest segment when snap distance and confidence are acceptable', () => {
    const point: RawTrackPoint = {
      lat: 1,
      lon: 4,
      accuracyMeters: 5,
      speedMps: 1.2,
      timestampIso: '2026-05-01T10:00:00.000Z',
    };

    const match = matchTrackPointToSegment(point, segments, {
      maxSnapDistanceMeters: 3,
      minConfidence: 0.3,
      mapCoordinates: (rawPoint) => ({ x: rawPoint.lon, y: rawPoint.lat }),
    });

    expect(match?.segmentId).toBe('seg-1');
    expect(match?.confidence).toBeGreaterThan(0.6);
  });

  test('rejects a point when no candidate is within snap threshold', () => {
    const point: RawTrackPoint = {
      lat: 50,
      lon: 50,
      accuracyMeters: 5,
      speedMps: 1.2,
      timestampIso: '2026-05-01T10:00:00.000Z',
    };

    const match = matchTrackPointToSegment(point, segments, {
      maxSnapDistanceMeters: 10,
      minConfidence: 0.1,
      mapCoordinates: (rawPoint) => ({ x: rawPoint.lon, y: rawPoint.lat }),
    });

    expect(match).toBeNull();
  });

  test('rejects a point when confidence is below threshold', () => {
    const point: RawTrackPoint = {
      lat: 2.8,
      lon: 4,
      accuracyMeters: 5,
      speedMps: 1.2,
      timestampIso: '2026-05-01T10:00:00.000Z',
    };

    const match = matchTrackPointToSegment(point, segments, {
      maxSnapDistanceMeters: 3,
      minConfidence: 0.2,
      mapCoordinates: (rawPoint) => ({ x: rawPoint.lon, y: rawPoint.lat }),
    });

    expect(match).toBeNull();
  });
});
