import {
  updateDiscoveredSegmentsFromTrack,
  type StreetSegment,
  type TrackPoint,
} from '@/src/domain/discovery';

export type DiscoveryDelta = {
  segmentId: string;
  discoveredMetersDelta: number;
};

export function buildDiscoveryDeltasFromMatchedPoints(
  segments: StreetSegment[],
  matchedPoints: TrackPoint[]
): DiscoveryDelta[] {
  const beforeById = new Map(segments.map((segment) => [segment.id, segment.discoveredMeters]));
  const updated = updateDiscoveredSegmentsFromTrack(segments, matchedPoints);

  return updated
    .map((segment) => ({
      segmentId: segment.id,
      discoveredMetersDelta: segment.discoveredMeters - (beforeById.get(segment.id) ?? 0),
    }))
    .filter((delta) => delta.discoveredMetersDelta > 0);
}
