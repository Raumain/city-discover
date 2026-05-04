import { applyStorageMigrations, STORAGE_SCHEMA_VERSION } from '@/src/features/storage/migrations';
import type { StorageDatabase } from '@/src/features/storage/client';

class FakeStorageDatabase implements StorageDatabase {
  public execCalls: string[] = [];
  public runCalls: Array<{ sql: string; params?: unknown[] | Record<string, unknown> }> = [];
  public migrationVersion: number | null = null;
  public citySnapshotColumns = ['city_name', 'area_km2', 'total_street_length_meters'];

  async execAsync(source: string): Promise<void> {
    this.execCalls.push(source);
  }

  async runAsync(
    source: string,
    params?: unknown[] | Record<string, unknown>
  ): Promise<{ changes: number; lastInsertRowId: number }> {
    this.runCalls.push({ sql: source, params });
    return { changes: 1, lastInsertRowId: 1 };
  }

  async getFirstAsync<T>(source: string): Promise<T | null> {
    if (source.includes('SELECT MAX(version)')) {
      return { version: this.migrationVersion } as T;
    }
    return null;
  }

  async getAllAsync<T>(source: string): Promise<T[]> {
    if (source === 'PRAGMA table_info(city_snapshot)') {
      return this.citySnapshotColumns.map((name) => ({ name })) as T[];
    }
    return [];
  }
}

describe('storage migrations', () => {
  test('applies migrations up to latest schema version', async () => {
    const db = new FakeStorageDatabase();
    db.migrationVersion = 0;

    await applyStorageMigrations(db);

    const versions = db.runCalls
      .filter((call) => call.sql.includes('INSERT INTO schema_migrations'))
      .map((call) => (call.params as unknown[])[0]);
    expect(versions).toContain(STORAGE_SCHEMA_VERSION);
  });

  test('skips applying when already at latest schema version', async () => {
    const db = new FakeStorageDatabase();
    db.migrationVersion = STORAGE_SCHEMA_VERSION;

    await applyStorageMigrations(db);

    const schemaWrites = db.runCalls.filter((call) => call.sql.includes('INSERT INTO schema_migrations'));
    expect(schemaWrites).toHaveLength(0);
  });
});
