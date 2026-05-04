import { useMemo } from 'react';

export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type VisibleSegment = {
  id: string;
  lengthMeters: number;
  discoveredMeters: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
};

export function useVisibleSegments(
  segments: VisibleSegment[],
  region: MapRegion | null,
  margin = 0.02
): VisibleSegment[] {
  return useMemo(() => {
    if (!region) {
      return segments;
    }
    return filterSegmentsByRegion(segments, region, margin);
  }, [segments, region, margin]);
}

export function filterSegmentsByRegion(
  segments: VisibleSegment[],
  region: MapRegion,
  margin = 0.02
): VisibleSegment[] {
  const latMin = region.latitude - region.latitudeDelta / 2 - margin;
  const latMax = region.latitude + region.latitudeDelta / 2 + margin;
  const lonMin = region.longitude - region.longitudeDelta / 2 - margin;
  const lonMax = region.longitude + region.longitudeDelta / 2 + margin;

  return segments.filter((segment) => {
    const segmentLatMin = Math.min(segment.fromY, segment.toY);
    const segmentLatMax = Math.max(segment.fromY, segment.toY);
    const segmentLonMin = Math.min(segment.fromX, segment.toX);
    const segmentLonMax = Math.max(segment.fromX, segment.toX);
    return segmentLatMax >= latMin && segmentLatMin <= latMax && segmentLonMax >= lonMin && segmentLonMin <= lonMax;
  });
}
