import type { StorageDatabase } from '@/src/features/storage/client';
import type { RawTrackPoint } from '@/src/features/tracking/session';

export type PersistedSessionSummary = {
  id: string;
  startedAtIso: string;
  endedAtIso: string;
  acceptedPointCount: number;
  distanceMeters: number;
  discoveredMeters: number;
};

export type PersistedActiveSession = {
  id: string;
  startedAtIso: string;
};

const SELECT_SESSION_SUMMARIES_SQL =
  'SELECT id, started_at_iso as startedAtIso, ended_at_iso as endedAtIso, accepted_point_count as acceptedPointCount, distance_meters as distanceMeters, discovered_meters as discoveredMeters FROM walk_session_summaries ORDER BY ended_at_iso DESC';
const SELECT_ACTIVE_SESSION_SQL =
  'SELECT id, started_at_iso as startedAtIso FROM active_walk_session LIMIT 1';
const SELECT_ACCEPTED_POINTS_SQL =
  'SELECT lat, lon, accuracy_meters as accuracyMeters, timestamp_iso as timestampIso, speed_mps as speedMps FROM walk_session_points WHERE session_id = ? ORDER BY id';

export class SessionRepository {
  constructor(private readonly database: StorageDatabase) {}

  async saveSummary(summary: PersistedSessionSummary): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO walk_session_summaries (id, started_at_iso, ended_at_iso, accepted_point_count, distance_meters, discovered_meters)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         started_at_iso = excluded.started_at_iso,
         ended_at_iso = excluded.ended_at_iso,
         accepted_point_count = excluded.accepted_point_count,
         distance_meters = excluded.distance_meters,
         discovered_meters = excluded.discovered_meters`,
      [
        summary.id,
        summary.startedAtIso,
        summary.endedAtIso,
        summary.acceptedPointCount,
        summary.distanceMeters,
        summary.discoveredMeters,
      ]
    );
  }

  async listSummaries(): Promise<PersistedSessionSummary[]> {
    return this.database.getAllAsync<PersistedSessionSummary>(SELECT_SESSION_SUMMARIES_SQL);
  }

  async saveActiveSession(session: PersistedActiveSession): Promise<void> {
    await this.database.runAsync('DELETE FROM active_walk_session');
    await this.database.runAsync(
      `INSERT INTO active_walk_session (id, started_at_iso)
       VALUES (?, ?)
       ON CONFLICT(id) DO UPDATE SET started_at_iso = excluded.started_at_iso`,
      [session.id, session.startedAtIso]
    );
  }

  async getActiveSession(): Promise<PersistedActiveSession | null> {
    return this.database.getFirstAsync<PersistedActiveSession>(SELECT_ACTIVE_SESSION_SQL);
  }

  async appendAcceptedPoint(sessionId: string, point: RawTrackPoint): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO walk_session_points (session_id, lat, lon, accuracy_meters, timestamp_iso, speed_mps)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [sessionId, point.lat, point.lon, point.accuracyMeters, point.timestampIso, point.speedMps]
    );
  }

  async listAcceptedPoints(sessionId: string): Promise<RawTrackPoint[]> {
    return this.database.getAllAsync<RawTrackPoint>(SELECT_ACCEPTED_POINTS_SQL, [sessionId]);
  }

  async clearActiveSession(sessionId: string): Promise<void> {
    await this.database.runAsync('DELETE FROM active_walk_session WHERE id = ?', [sessionId]);
  }

  async clearHistory(): Promise<void> {
    await this.database.execAsync('BEGIN');
    try {
      await this.database.runAsync('DELETE FROM walk_session_points');
      await this.database.runAsync('DELETE FROM walk_session_summaries');
      await this.database.runAsync('DELETE FROM active_walk_session');
      await this.database.execAsync('COMMIT');
    } catch (error) {
      await this.database.execAsync('ROLLBACK');
      throw error;
    }
  }
}
