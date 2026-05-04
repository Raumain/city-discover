import type { RawTrackPoint } from '@/src/features/tracking/session';
import {
  createSessionManager,
  type ActiveTrackedSession,
  type LocationUpdatesAdapter,
  type SessionPersistence,
} from '@/src/features/tracking/sessionManager';

class InMemorySessionPersistence implements SessionPersistence {
  public activeSession: ActiveTrackedSession | null = null;
  public acceptedPoints: RawTrackPoint[] = [];

  async saveActiveSession(session: ActiveTrackedSession): Promise<void> {
    this.activeSession = session;
  }

  async appendAcceptedPoint(_sessionId: string, point: RawTrackPoint): Promise<void> {
    this.acceptedPoints.push(point);
  }

  async getActiveSession(): Promise<ActiveTrackedSession | null> {
    return this.activeSession;
  }

}

describe('sessionManager', () => {
  test('starts only when foreground permission is granted', async () => {
    const persistence = new InMemorySessionPersistence();
    const adapter: LocationUpdatesAdapter = {
      async getForegroundPermissionState() {
        return 'denied';
      },
      async requestForegroundPermission() {
        return 'denied';
      },
      async startForegroundUpdates() {
        return {
          async stop() {},
        };
      },
    };

    const manager = createSessionManager({ adapter, persistence });

    await expect(manager.startSession('session-1', '2026-05-01T10:00:00.000Z')).rejects.toThrow(
      'Foreground location permission is required to start tracking.'
    );
  });

  test('saves accepted points and summary when a session is stopped', async () => {
    const persistence = new InMemorySessionPersistence();
    const adapter: LocationUpdatesAdapter = {
      async getForegroundPermissionState() {
        return 'granted';
      },
      async requestForegroundPermission() {
        return 'granted';
      },
      async startForegroundUpdates(onPoint) {
        onPoint({
          lat: 48.0,
          lon: 2.0,
          accuracyMeters: 8,
          timestampIso: '2026-05-01T10:00:01.000Z',
          speedMps: 1.2,
        });
        onPoint({
          lat: 48.0002,
          lon: 2.0002,
          accuracyMeters: 10,
          timestampIso: '2026-05-01T10:00:05.000Z',
          speedMps: 1.3,
        });
        return {
          async stop() {},
        };
      },
    };

    const manager = createSessionManager({ adapter, persistence });

    await manager.startSession('session-2', '2026-05-01T10:00:00.000Z');
    const summary = await manager.stopSession('2026-05-01T10:05:00.000Z');

    expect(persistence.acceptedPoints).toHaveLength(2);
    expect(summary.acceptedPointCount).toBe(2);
    expect(summary.distanceMeters).toBeGreaterThan(20);
  });

  test('recovers active session from persistence', async () => {
    const persistence = new InMemorySessionPersistence();
    persistence.activeSession = {
      id: 'session-3',
      startedAtIso: '2026-05-01T08:00:00.000Z',
    };
    let updateStarted = false;
    const adapter: LocationUpdatesAdapter = {
      async getForegroundPermissionState() {
        return 'granted';
      },
      async requestForegroundPermission() {
        return 'granted';
      },
      async startForegroundUpdates() {
        updateStarted = true;
        return {
          async stop() {},
        };
      },
    };

    const manager = createSessionManager({ adapter, persistence });

    const recovered = await manager.recoverActiveSession();

    expect(recovered?.id).toBe('session-3');
    expect(updateStarted).toBe(true);
  });
});
