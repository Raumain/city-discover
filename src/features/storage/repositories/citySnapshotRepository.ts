import type { StorageDatabase } from '@/src/features/storage/client';

export type PersistedCitySnapshot = {
  cityName: string;
  cityKey: string;
  areaKm2: number;
  totalStreetLengthMeters: number;
  fetchedAtIso: string;
  source: string;
  schemaVersion: number;
};

export type PersistedCitySegment = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  lengthMeters: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
};

export type PersistedSnapshotBundle = {
  snapshot: PersistedCitySnapshot;
  segments: PersistedCitySegment[];
};

const SELECT_CITY_SNAPSHOT_SQL =
  'SELECT city_name as cityName, area_km2 as areaKm2, total_street_length_meters as totalStreetLengthMeters, city_key as cityKey, fetched_at_iso as fetchedAtIso, source as source, schema_version as schemaVersion FROM city_snapshot LIMIT 1';
const SELECT_CITY_SEGMENTS_SQL =
  'SELECT id, from_node_id as fromNodeId, to_node_id as toNodeId, length_meters as lengthMeters, from_x as fromX, from_y as fromY, to_x as toX, to_y as toY FROM city_segments ORDER BY id';

export class CitySnapshotRepository {
  constructor(private readonly database: StorageDatabase) {}

  async saveSnapshot(snapshot: PersistedCitySnapshot, segments: PersistedCitySegment[]): Promise<void> {
    await this.database.execAsync('BEGIN');
    try {
      await this.database.runAsync('DELETE FROM city_snapshot');
      await this.database.runAsync(
        `INSERT INTO city_snapshot (
          city_name,
          area_km2,
          total_street_length_meters,
          city_key,
          fetched_at_iso,
          source,
          schema_version
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          snapshot.cityName,
          snapshot.areaKm2,
          snapshot.totalStreetLengthMeters,
          snapshot.cityKey,
          snapshot.fetchedAtIso,
          snapshot.source,
          snapshot.schemaVersion,
        ]
      );

      await this.database.runAsync('DELETE FROM city_segments');
      for (const segment of segments) {
        await this.database.runAsync(
          `INSERT INTO city_segments (id, from_node_id, to_node_id, length_meters, from_x, from_y, to_x, to_y)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            segment.id,
            segment.fromNodeId,
            segment.toNodeId,
            segment.lengthMeters,
            segment.fromX,
            segment.fromY,
            segment.toX,
            segment.toY,
          ]
        );
      }

      await this.database.execAsync('COMMIT');
    } catch (error) {
      await this.database.execAsync('ROLLBACK');
      throw error;
    }
  }

  async getSnapshot(): Promise<PersistedSnapshotBundle | null> {
    const snapshot = await this.database.getFirstAsync<PersistedCitySnapshot>(SELECT_CITY_SNAPSHOT_SQL);
    if (!snapshot) {
      return null;
    }

    const segments = await this.database.getAllAsync<PersistedCitySegment>(SELECT_CITY_SEGMENTS_SQL);
    return { snapshot, segments };
  }
}
