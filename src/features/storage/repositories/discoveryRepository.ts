import type { StorageDatabase } from '@/src/features/storage/client';

export type PersistedDiscoveryProgress = {
  segmentId: string;
  discoveredMeters: number;
};

const SELECT_DISCOVERY_PROGRESS_SQL =
  'SELECT segment_id as segmentId, discovered_meters as discoveredMeters FROM discovery_progress ORDER BY segment_id';

export class DiscoveryRepository {
  constructor(private readonly database: StorageDatabase) {}

  async upsertProgress(segmentId: string, discoveredMeters: number): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO discovery_progress (segment_id, discovered_meters)
       VALUES (?, ?)
       ON CONFLICT(segment_id) DO UPDATE SET discovered_meters = excluded.discovered_meters`,
      [segmentId, discoveredMeters]
    );
  }

  async listProgress(): Promise<PersistedDiscoveryProgress[]> {
    return this.database.getAllAsync<PersistedDiscoveryProgress>(SELECT_DISCOVERY_PROGRESS_SQL);
  }

  async clearAllProgress(): Promise<void> {
    await this.database.runAsync('DELETE FROM discovery_progress');
  }
}
