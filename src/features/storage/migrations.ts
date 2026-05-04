import type { StorageDatabase } from '@/src/features/storage/client';
import { STORAGE_SCHEMA_STATEMENTS } from '@/src/features/storage/schema';

export const STORAGE_SCHEMA_VERSION = 4;

export async function applyStorageMigrations(database: StorageDatabase): Promise<void> {
  await database.execAsync(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at_iso TEXT NOT NULL
    )`
  );

  const migrationRow = await database.getFirstAsync<{ version: number | null }>(
    'SELECT MAX(version) as version FROM schema_migrations'
  );
  const currentVersion = migrationRow?.version ?? 0;

  if (currentVersion >= STORAGE_SCHEMA_VERSION) {
    return;
  }

  const migrations: Array<{ version: number; run: (database: StorageDatabase) => Promise<void> }> = [
    {
      version: 1,
      run: async (db) => {
        for (const statement of STORAGE_SCHEMA_STATEMENTS) {
          await db.execAsync(statement);
        }
      },
    },
    {
      version: 2,
      run: ensureCitySnapshotMetadataColumns,
    },
    {
      version: 3,
      run: async () => Promise.resolve(),
    },
    {
      version: 4,
      run: ensureStorageIndexes,
    },
  ];

  for (const migration of migrations) {
    if (migration.version <= currentVersion) {
      continue;
    }
    await migration.run(database);
    await database.runAsync('INSERT INTO schema_migrations (version, applied_at_iso) VALUES (?, ?)', [
      migration.version,
      new Date().toISOString(),
    ]);
  }
}

async function ensureCitySnapshotMetadataColumns(database: StorageDatabase): Promise<void> {
  const columns = await database.getAllAsync<{ name: string }>('PRAGMA table_info(city_snapshot)');
  const existingColumns = new Set(columns.map((column) => column.name));

  if (!existingColumns.has('city_key')) {
    await database.execAsync("ALTER TABLE city_snapshot ADD COLUMN city_key TEXT NOT NULL DEFAULT ''");
  }

  if (!existingColumns.has('fetched_at_iso')) {
    await database.execAsync("ALTER TABLE city_snapshot ADD COLUMN fetched_at_iso TEXT NOT NULL DEFAULT ''");
  }

  if (!existingColumns.has('source')) {
    await database.execAsync("ALTER TABLE city_snapshot ADD COLUMN source TEXT NOT NULL DEFAULT 'seed'");
  }

  if (!existingColumns.has('schema_version')) {
    await database.execAsync('ALTER TABLE city_snapshot ADD COLUMN schema_version INTEGER NOT NULL DEFAULT 1');
  }
}

async function ensureStorageIndexes(database: StorageDatabase): Promise<void> {
  await database.execAsync(
    'CREATE INDEX IF NOT EXISTS idx_walk_session_points_session_id ON walk_session_points(session_id)'
  );
  await database.execAsync('CREATE INDEX IF NOT EXISTS idx_nudges_week_key ON nudges(week_key)');
}
