import { applyStorageMigrations } from '@/src/features/storage/migrations';

export type SqlParams = unknown[] | Record<string, unknown>;

export type StorageRunResult = {
  changes: number;
  lastInsertRowId: number;
};

export type StorageDatabase = {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params?: SqlParams): Promise<StorageRunResult>;
  getFirstAsync<T>(source: string, params?: SqlParams): Promise<T | null>;
  getAllAsync<T>(source: string, params?: SqlParams): Promise<T[]>;
};

export async function createStorageDatabase(databaseName = 'city-discover.db'): Promise<StorageDatabase> {
  const sqliteModule = await import('expo-sqlite');
  return sqliteModule.openDatabaseAsync(databaseName) as Promise<StorageDatabase>;
}

export async function createInitializedStorageDatabase(
  databaseName = 'city-discover.db'
): Promise<StorageDatabase> {
  const database = await createStorageDatabase(databaseName);
  await applyStorageMigrations(database);
  return database;
}
