import type { StorageDatabase } from '@/src/features/storage/client';

export type DiscoveryDelta = {
  segmentId: string;
  discoveredMetersDelta: number;
};

export type FinalizeSessionInput = {
  id: string;
  startedAtIso: string;
  endedAtIso: string;
  acceptedPointCount: number;
  distanceMeters: number;
};

export class TrackingRepository {
  constructor(private readonly database: StorageDatabase) {}

  async finalizeSessionAndApplyDiscovery(
    summary: FinalizeSessionInput,
    discoveryDeltas: DiscoveryDelta[]
  ): Promise<void> {
    await this.database.execAsync('BEGIN');
    try {
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
          discoveryDeltas.reduce((sum, delta) => sum + delta.discoveredMetersDelta, 0),
        ]
      );

      for (const delta of discoveryDeltas) {
        await this.database.runAsync(
          `INSERT INTO discovery_progress (segment_id, discovered_meters)
           VALUES (?, ?)
           ON CONFLICT(segment_id) DO UPDATE SET discovered_meters = discovery_progress.discovered_meters + excluded.discovered_meters`,
          [delta.segmentId, delta.discoveredMetersDelta]
        );
      }

      await this.database.runAsync('DELETE FROM active_walk_session WHERE id = ?', [summary.id]);
      await this.database.execAsync('COMMIT');
    } catch (error) {
      await this.database.execAsync('ROLLBACK');
      throw error;
    }
  }
}
