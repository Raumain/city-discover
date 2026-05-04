import type { StreetSegment, TrackPoint } from '@/src/domain/discovery';
import { buildDiscoveryDeltasFromMatchedPoints } from '@/src/features/tracking/discoveryUpdater';
import { matchTrackPointToSegment, type MapMatchOptions, type MatchableSegment } from '@/src/features/tracking/mapMatcher';
import type { TrackingRepository } from '@/src/features/storage/repositories/trackingRepository';
import type { SessionRepository } from '@/src/features/storage/repositories/sessionRepository';
import type { RawTrackPoint } from '@/src/features/tracking/session';
import type { LocationPermissionState } from '@/src/features/tracking/locationAdapter';
import type { ActiveTrackedSession } from '@/src/features/tracking/sessionManager';
import type { SessionManagerApi } from '@/src/features/tracking/types';

type TrackingServiceDependencies = {
  sessionManager: SessionManagerApi;
  sessionRepository: Pick<SessionRepository, 'listAcceptedPoints'>;
  trackingRepository: Pick<TrackingRepository, 'finalizeSessionAndApplyDiscovery'>;
  locationAdapter: {
    getForegroundPermissionState: () => Promise<LocationPermissionState>;
    requestForegroundPermission: () => Promise<LocationPermissionState>;
  };
  mapMatchOptions: MapMatchOptions;
};

export function createTrackingService({
  sessionManager,
  sessionRepository,
  trackingRepository,
  locationAdapter,
  mapMatchOptions,
}: TrackingServiceDependencies) {
  return {
    getForegroundPermissionState(): Promise<LocationPermissionState> {
      return locationAdapter.getForegroundPermissionState();
    },

    requestForegroundPermission(): Promise<LocationPermissionState> {
      return locationAdapter.requestForegroundPermission();
    },

    startSession(sessionId: string, startedAtIso: string) {
      return sessionManager.startSession(sessionId, startedAtIso);
    },

    recoverActiveSession(): Promise<ActiveTrackedSession | null> {
      return sessionManager.recoverActiveSession();
    },

    async stopAndFinalize(
      endedAtIso: string,
      segments: StreetSegment[],
      segmentGeometry: MatchableSegment[]
    ): Promise<{ matchedTrackPoints: TrackPoint[] }> {
      const summary = await sessionManager.stopSession(endedAtIso);
      const rawPoints = await sessionRepository.listAcceptedPoints(summary.id);
      const matchedTrackPoints = buildMatchedTrackPoints(rawPoints, segmentGeometry, mapMatchOptions);
      const discoveryDeltas = buildDiscoveryDeltasFromMatchedPoints(segments, matchedTrackPoints);
      await trackingRepository.finalizeSessionAndApplyDiscovery(summary, discoveryDeltas);
      return { matchedTrackPoints };
    },
  };
}

function buildMatchedTrackPoints(
  rawPoints: RawTrackPoint[],
  segmentGeometry: MatchableSegment[],
  options: MapMatchOptions
): TrackPoint[] {
  const matchedTrackPoints: TrackPoint[] = [];

  for (let index = 1; index < rawPoints.length; index += 1) {
    const previous = rawPoints[index - 1];
    const current = rawPoints[index];
    const matched = matchTrackPointToSegment(current, segmentGeometry, options);
    if (!matched) {
      continue;
    }

    matchedTrackPoints.push({
      segmentId: matched.segmentId,
      distanceFromPreviousMeters: haversineMeters(previous.lat, previous.lon, current.lat, current.lon),
      speedMps: current.speedMps,
    });
  }

  return matchedTrackPoints;
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusMeters = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const a = sinLat * sinLat + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sinLon * sinLon;

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
