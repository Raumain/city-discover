export type RawTrackPoint = {
  lat: number;
  lon: number;
  accuracyMeters: number;
  timestampIso: string;
  speedMps: number;
};

export type WalkSession = {
  id: string;
  startedAtIso: string;
  acceptedPoints: RawTrackPoint[];
};

export type WalkSessionSummary = {
  id: string;
  startedAtIso: string;
  endedAtIso: string;
  acceptedPointCount: number;
  distanceMeters: number;
};

const MAX_ACCEPTED_ACCURACY_METERS = 25;
const MAX_POINT_JUMP_METERS = 120;

export function createWalkSession(id: string, startedAtIso: string): WalkSession {
  return { id, startedAtIso, acceptedPoints: [] };
}

export function addTrackPoint(session: WalkSession, point: RawTrackPoint): WalkSession {
  if (point.accuracyMeters > MAX_ACCEPTED_ACCURACY_METERS) {
    return session;
  }

  const lastPoint = session.acceptedPoints[session.acceptedPoints.length - 1];
  if (lastPoint && isDuplicate(lastPoint, point)) {
    return session;
  }

  if (lastPoint) {
    const jumpMeters = haversineMeters(lastPoint.lat, lastPoint.lon, point.lat, point.lon);
    if (jumpMeters > MAX_POINT_JUMP_METERS) {
      return session;
    }
  }

  return {
    ...session,
    acceptedPoints: [...session.acceptedPoints, point],
  };
}

export function finishWalkSession(session: WalkSession, endedAtIso: string): WalkSessionSummary {
  let distanceMeters = 0;
  for (let index = 1; index < session.acceptedPoints.length; index += 1) {
    const previous = session.acceptedPoints[index - 1];
    const current = session.acceptedPoints[index];
    distanceMeters += haversineMeters(previous.lat, previous.lon, current.lat, current.lon);
  }

  return {
    id: session.id,
    startedAtIso: session.startedAtIso,
    endedAtIso,
    acceptedPointCount: session.acceptedPoints.length,
    distanceMeters,
  };
}

function isDuplicate(previous: RawTrackPoint, current: RawTrackPoint): boolean {
  return previous.lat === current.lat && previous.lon === current.lon;
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusMeters = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const a =
    sinLat * sinLat +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sinLon * sinLon;

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
