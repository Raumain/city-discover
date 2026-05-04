import type { WalkSessionSummary } from '@/src/features/tracking/session';
import type { ActiveTrackedSession } from '@/src/features/tracking/sessionManager';

export type SessionManagerApi = {
  startSession: (id: string, startedAtIso: string) => Promise<ActiveTrackedSession>;
  stopSession: (endedAtIso: string) => Promise<WalkSessionSummary>;
  recoverActiveSession: () => Promise<ActiveTrackedSession | null>;
};
