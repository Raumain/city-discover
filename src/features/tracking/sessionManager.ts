import {
  addTrackPoint,
  createWalkSession,
  finishWalkSession,
  type RawTrackPoint,
  type WalkSession,
  type WalkSessionSummary,
} from '@/src/features/tracking/session';
import type { LocationPermissionState } from '@/src/features/tracking/locationAdapter';

export type ActiveTrackedSession = {
  id: string;
  startedAtIso: string;
};

export type LocationUpdatesAdapter = {
  getForegroundPermissionState: () => Promise<LocationPermissionState>;
  requestForegroundPermission: () => Promise<LocationPermissionState>;
  startForegroundUpdates: (
    onPoint: (point: RawTrackPoint) => void
  ) => Promise<{
    stop: () => Promise<void>;
  }>;
};

export type SessionPersistence = {
  saveActiveSession: (session: ActiveTrackedSession) => Promise<void>;
  appendAcceptedPoint: (sessionId: string, point: RawTrackPoint) => Promise<void>;
  getActiveSession: () => Promise<ActiveTrackedSession | null>;
};

type SessionManagerDependencies = {
  adapter: LocationUpdatesAdapter;
  persistence: SessionPersistence;
};

export function createSessionManager({ adapter, persistence }: SessionManagerDependencies) {
  let activeSession: WalkSession | null = null;
  let activeSubscription: { stop: () => Promise<void> } | null = null;

  return {
    async startSession(id: string, startedAtIso: string): Promise<ActiveTrackedSession> {
      if (activeSession) {
        throw new Error('A tracking session is already active.');
      }

      await ensureForegroundPermission(adapter);
      const trackedSession = createWalkSession(id, startedAtIso);
      await persistence.saveActiveSession({ id, startedAtIso });
      activeSession = trackedSession;
      activeSubscription = await adapter.startForegroundUpdates(async (point) => {
        if (!activeSession || activeSession.id !== id) {
          return;
        }

        const previousCount = activeSession.acceptedPoints.length;
        const nextSession = addTrackPoint(activeSession, point);
        activeSession = nextSession;

        if (nextSession.acceptedPoints.length > previousCount) {
          await persistence.appendAcceptedPoint(id, point);
        }
      });

      return { id, startedAtIso };
    },

    async stopSession(endedAtIso: string): Promise<WalkSessionSummary> {
      if (!activeSession) {
        throw new Error('No active tracking session to stop.');
      }

      if (activeSubscription) {
        await activeSubscription.stop();
      }

      const summary = finishWalkSession(activeSession, endedAtIso);

      activeSession = null;
      activeSubscription = null;
      return summary;
    },

    async recoverActiveSession(): Promise<ActiveTrackedSession | null> {
      if (activeSession) {
        return {
          id: activeSession.id,
          startedAtIso: activeSession.startedAtIso,
        };
      }

      const persistedSession = await persistence.getActiveSession();
      if (!persistedSession) {
        return null;
      }

      await ensureForegroundPermission(adapter);
      activeSession = createWalkSession(persistedSession.id, persistedSession.startedAtIso);
      activeSubscription = await adapter.startForegroundUpdates(async (point) => {
        if (!activeSession) {
          return;
        }

        const previousCount = activeSession.acceptedPoints.length;
        const nextSession = addTrackPoint(activeSession, point);
        activeSession = nextSession;
        if (nextSession.acceptedPoints.length > previousCount) {
          await persistence.appendAcceptedPoint(persistedSession.id, point);
        }
      });

      return persistedSession;
    },
  };
}

async function ensureForegroundPermission(adapter: LocationUpdatesAdapter): Promise<void> {
  const current = await adapter.getForegroundPermissionState();
  if (current === 'granted') {
    return;
  }

  const requested = await adapter.requestForegroundPermission();
  if (requested !== 'granted') {
    throw new Error('Foreground location permission is required to start tracking.');
  }
}
