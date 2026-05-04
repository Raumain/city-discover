import type { RawTrackPoint } from '@/src/features/tracking/session';

export type MatchableSegment = {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
};

export type SegmentMatch = {
  segmentId: string;
  confidence: number;
  snapDistanceMeters: number;
};

export type MapMatchOptions = {
  maxSnapDistanceMeters: number;
  minConfidence: number;
  mapCoordinates: (point: RawTrackPoint) => {
    x: number;
    y: number;
  };
};

export function matchTrackPointToSegment(
  point: RawTrackPoint,
  segments: MatchableSegment[],
  options: MapMatchOptions
): SegmentMatch | null {
  const coordinate = options.mapCoordinates(point);
  let bestMatch: SegmentMatch | null = null;

  for (const segment of segments) {
    const snapDistanceMeters = distanceToSegment(
      coordinate.x,
      coordinate.y,
      segment.fromX,
      segment.fromY,
      segment.toX,
      segment.toY
    );
    if (snapDistanceMeters > options.maxSnapDistanceMeters) {
      continue;
    }

    const confidence = Math.max(0, 1 - snapDistanceMeters / options.maxSnapDistanceMeters);
    if (confidence < options.minConfidence) {
      continue;
    }

    if (!bestMatch || snapDistanceMeters < bestMatch.snapDistanceMeters) {
      bestMatch = {
        segmentId: segment.id,
        confidence,
        snapDistanceMeters,
      };
    }
  }

  return bestMatch;
}

function distanceToSegment(
  pointX: number,
  pointY: number,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): number {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return Math.hypot(pointX - fromX, pointY - fromY);
  }

  const t = Math.max(0, Math.min(1, ((pointX - fromX) * dx + (pointY - fromY) * dy) / lengthSquared));
  const projectionX = fromX + t * dx;
  const projectionY = fromY + t * dy;
  return Math.hypot(pointX - projectionX, pointY - projectionY);
}
