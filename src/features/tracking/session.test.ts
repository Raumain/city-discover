import { addTrackPoint, createWalkSession, finishWalkSession, type RawTrackPoint } from './session';

const now = new Date('2026-04-30T10:00:00.000Z');

describe('walk session tracking', () => {
  it('keeps only accurate non-duplicate points and computes covered distance', () => {
    const points: RawTrackPoint[] = [
      { lat: 48.0, lon: 2.0, accuracyMeters: 12, timestampIso: '2026-04-30T10:00:10.000Z', speedMps: 1.3 },
      { lat: 48.0002, lon: 2.0002, accuracyMeters: 15, timestampIso: '2026-04-30T10:00:20.000Z', speedMps: 1.5 },
      { lat: 48.0002, lon: 2.0002, accuracyMeters: 15, timestampIso: '2026-04-30T10:00:21.000Z', speedMps: 1.5 },
      { lat: 48.0005, lon: 2.0005, accuracyMeters: 70, timestampIso: '2026-04-30T10:00:40.000Z', speedMps: 1.8 },
    ];

    let session = createWalkSession('s1', now.toISOString());
    for (const point of points) {
      session = addTrackPoint(session, point);
    }

    const summary = finishWalkSession(session, '2026-04-30T10:20:00.000Z');
    expect(summary.acceptedPointCount).toBe(2);
    expect(summary.distanceMeters).toBeGreaterThan(20);
    expect(summary.distanceMeters).toBeLessThan(40);
  });
});
