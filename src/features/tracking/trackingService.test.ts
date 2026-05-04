import type { StreetSegment, TrackPoint } from '@/src/domain/discovery';
import type { RawTrackPoint, WalkSessionSummary } from '@/src/features/tracking/session';
import { createTrackingService } from '@/src/features/tracking/trackingService';

describe('trackingService', () => {
  test('finalizes session and applies discovery deltas transactionally', async () => {
    let finalizedInput:
      | {
          summary: WalkSessionSummary;
          deltas: Array<{ segmentId: string; discoveredMetersDelta: number }>;
        }
      | undefined;

    const service = createTrackingService({
      sessionManager: {
        async startSession() {
          return { id: 'session-1', startedAtIso: '2026-05-01T10:00:00.000Z' };
        },
        async stopSession() {
          return {
            id: 'session-1',
            startedAtIso: '2026-05-01T10:00:00.000Z',
            endedAtIso: '2026-05-01T10:20:00.000Z',
            acceptedPointCount: 2,
            distanceMeters: 100,
          };
        },
        async recoverActiveSession() {
          return null;
        },
      },
      sessionRepository: {
        async listAcceptedPoints() {
          return [
            {
              lat: 0,
              lon: 0,
              accuracyMeters: 6,
              timestampIso: '2026-05-01T10:00:01.000Z',
              speedMps: 1.2,
            },
            {
              lat: 0,
              lon: 24,
              accuracyMeters: 6,
              timestampIso: '2026-05-01T10:00:04.000Z',
              speedMps: 1.4,
            },
          ] as RawTrackPoint[];
        },
      },
      trackingRepository: {
        async finalizeSessionAndApplyDiscovery(summary, deltas) {
          finalizedInput = { summary, deltas };
        },
      },
      locationAdapter: {
        async getForegroundPermissionState() {
          return 'granted';
        },
        async requestForegroundPermission() {
          return 'granted';
        },
      },
      mapMatchOptions: {
        maxSnapDistanceMeters: 25,
        minConfidence: 0.2,
        mapCoordinates: (point) => ({ x: point.lon, y: point.lat }),
      },
    });

    const segments: StreetSegment[] = [
      {
        id: 'seg-1',
        lengthMeters: 50,
        discoveredMeters: 0,
      },
    ];
    const geometry = [
      {
        id: 'seg-1',
        fromX: 0,
        fromY: 0,
        toX: 50,
        toY: 0,
      },
    ];

    const result = await service.stopAndFinalize('2026-05-01T10:20:00.000Z', segments, geometry);

    expect(result.matchedTrackPoints).toHaveLength(1);
    expect((result.matchedTrackPoints[0] as TrackPoint).segmentId).toBe('seg-1');
    expect(finalizedInput?.deltas).toEqual([{ segmentId: 'seg-1', discoveredMetersDelta: 50 }]);
  });
});
