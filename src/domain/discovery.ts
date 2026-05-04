export type StreetSegment = {
  id: string;
  lengthMeters: number;
  discoveredMeters: number;
};

export type TrackPoint = {
  segmentId: string;
  distanceFromPreviousMeters: number;
  speedMps: number;
};

export type DiscoveryMetrics = {
  totalLengthMeters: number;
  discoveredLengthMeters: number;
  lengthPercent: number;
  segmentPercent: number;
};

const MIN_ELIGIBLE_SPEED_MPS = 0.7;
const MAX_ELIGIBLE_SPEED_MPS = 5.5;
const DISCOVERY_THRESHOLD_METERS = 20;

export function calculateDiscoveryMetrics(segments: StreetSegment[]): DiscoveryMetrics {
  const totalLengthMeters = segments.reduce((sum, segment) => sum + segment.lengthMeters, 0);
  const discoveredLengthMeters = segments.reduce(
    (sum, segment) => sum + Math.min(segment.lengthMeters, segment.discoveredMeters),
    0
  );
  const discoveredSegmentsCount = segments.filter((segment) => segment.discoveredMeters > 0).length;

  return {
    totalLengthMeters,
    discoveredLengthMeters,
    lengthPercent: totalLengthMeters > 0 ? (discoveredLengthMeters / totalLengthMeters) * 100 : 0,
    segmentPercent: segments.length > 0 ? (discoveredSegmentsCount / segments.length) * 100 : 0,
  };
}

export function updateDiscoveredSegmentsFromTrack(
  segments: StreetSegment[],
  points: TrackPoint[]
): StreetSegment[] {
  const discoveredBySegment = new Map<string, number>();

  for (const point of points) {
    if (!isEligibleSpeed(point.speedMps)) continue;
    if (point.distanceFromPreviousMeters <= 0) continue;
    discoveredBySegment.set(
      point.segmentId,
      (discoveredBySegment.get(point.segmentId) ?? 0) + point.distanceFromPreviousMeters
    );
  }

  return segments.map((segment) => {
    const newlyObserved = discoveredBySegment.get(segment.id) ?? 0;
    if (newlyObserved < DISCOVERY_THRESHOLD_METERS) {
      return segment;
    }

    return {
      ...segment,
      discoveredMeters: Math.min(segment.lengthMeters, segment.discoveredMeters + newlyObserved),
    };
  });
}

function isEligibleSpeed(speedMps: number): boolean {
  return speedMps >= MIN_ELIGIBLE_SPEED_MPS && speedMps <= MAX_ELIGIBLE_SPEED_MPS;
}
