import {
  CitySnapshotRepository,
  type PersistedCitySegment,
  type PersistedCitySnapshot,
} from '@/src/features/storage/repositories/citySnapshotRepository';
import { DiscoveryRepository } from '@/src/features/storage/repositories/discoveryRepository';
import { NudgeRepository } from '@/src/features/storage/repositories/nudgeRepository';
import { SessionRepository } from '@/src/features/storage/repositories/sessionRepository';
import { SettingsRepository } from '@/src/features/storage/repositories/settingsRepository';
import { TrackingRepository } from '@/src/features/storage/repositories/trackingRepository';
import type { StorageDatabase } from '@/src/features/storage/client';

type SqlParams = unknown[] | Record<string, unknown> | undefined;

class FakeStorageDatabase implements StorageDatabase {
  public execCalls: string[] = [];
  public runCalls: Array<{ sql: string; params: SqlParams }> = [];
  public firstResults = new Map<string, unknown>();
  public allResults = new Map<string, unknown[]>();

  async execAsync(source: string): Promise<void> {
    this.execCalls.push(source);
  }

  async runAsync(sql: string, params?: SqlParams): Promise<{ changes: number; lastInsertRowId: number }> {
    this.runCalls.push({ sql, params });
    return { changes: 1, lastInsertRowId: 1 };
  }

  async getFirstAsync<T>(sql: string, _params?: SqlParams): Promise<T | null> {
    return (this.firstResults.get(sql) as T | null | undefined) ?? null;
  }

  async getAllAsync<T>(sql: string, _params?: SqlParams): Promise<T[]> {
    return (this.allResults.get(sql) as T[] | undefined) ?? [];
  }
}

const SELECT_CITY_SNAPSHOT_SQL =
  'SELECT city_name as cityName, area_km2 as areaKm2, total_street_length_meters as totalStreetLengthMeters, city_key as cityKey, fetched_at_iso as fetchedAtIso, source as source, schema_version as schemaVersion FROM city_snapshot LIMIT 1';
const SELECT_CITY_SEGMENTS_SQL =
  'SELECT id, from_node_id as fromNodeId, to_node_id as toNodeId, length_meters as lengthMeters, from_x as fromX, from_y as fromY, to_x as toX, to_y as toY FROM city_segments ORDER BY id';
const SELECT_DISCOVERY_PROGRESS_SQL =
  'SELECT segment_id as segmentId, discovered_meters as discoveredMeters FROM discovery_progress ORDER BY segment_id';
const SELECT_SESSION_SUMMARIES_SQL =
  'SELECT id, started_at_iso as startedAtIso, ended_at_iso as endedAtIso, accepted_point_count as acceptedPointCount, distance_meters as distanceMeters, discovered_meters as discoveredMeters FROM walk_session_summaries ORDER BY ended_at_iso DESC';
const SELECT_ACTIVE_SESSION_SQL =
  'SELECT id, started_at_iso as startedAtIso FROM active_walk_session LIMIT 1';
const SELECT_ACCEPTED_POINTS_SQL =
  'SELECT lat, lon, accuracy_meters as accuracyMeters, timestamp_iso as timestampIso, speed_mps as speedMps FROM walk_session_points WHERE session_id = ? ORDER BY id';
const SELECT_SETTING_SQL =
  'SELECT value FROM app_settings WHERE key = ? LIMIT 1';

describe('storage repositories', () => {
  test('city snapshot repository persists and loads snapshot with segments', async () => {
    const db = new FakeStorageDatabase();
    const repository = new CitySnapshotRepository(db);
    const snapshot: PersistedCitySnapshot = {
      cityName: 'Paris',
      cityKey: 'paris-fr',
      areaKm2: 105.4,
      totalStreetLengthMeters: 120_500,
      fetchedAtIso: '2026-05-01T00:00:00.000Z',
      source: 'overpass',
      schemaVersion: 1,
    };
    const segments: PersistedCitySegment[] = [
      {
        id: 'seg-a',
        fromNodeId: 'n1',
        toNodeId: 'n2',
        lengthMeters: 180,
        fromX: 2.31,
        fromY: 48.86,
        toX: 2.32,
        toY: 48.87,
      },
    ];

    await repository.saveSnapshot(snapshot, segments);

    db.firstResults.set(SELECT_CITY_SNAPSHOT_SQL, snapshot);
    db.allResults.set(SELECT_CITY_SEGMENTS_SQL, segments);

    const loaded = await repository.getSnapshot();

    expect(loaded).toEqual({ snapshot, segments });
    expect(db.execCalls).toContain('BEGIN');
    expect(db.execCalls).toContain('COMMIT');
    expect(db.runCalls.some((entry) => entry.sql.startsWith('INSERT INTO city_segments'))).toBe(true);
  });

  test('discovery repository upserts and reads progress', async () => {
    const db = new FakeStorageDatabase();
    const repository = new DiscoveryRepository(db);

    await repository.upsertProgress('seg-a', 95);
    db.allResults.set(SELECT_DISCOVERY_PROGRESS_SQL, [{ segmentId: 'seg-a', discoveredMeters: 95 }]);

    const progress = await repository.listProgress();

    expect(progress).toEqual([{ segmentId: 'seg-a', discoveredMeters: 95 }]);
    expect(db.runCalls.some((entry) => entry.sql.startsWith('INSERT INTO discovery_progress'))).toBe(true);
  });

  test('discovery repository can clear all persisted progress', async () => {
    const db = new FakeStorageDatabase();
    const repository = new DiscoveryRepository(db);

    await repository.clearAllProgress();

    expect(db.runCalls.some((entry) => entry.sql === 'DELETE FROM discovery_progress')).toBe(true);
  });

  test('session repository saves and lists session summaries', async () => {
    const db = new FakeStorageDatabase();
    const repository = new SessionRepository(db);
    const summary = {
      id: 'session-1',
      startedAtIso: '2026-04-30T10:00:00.000Z',
      endedAtIso: '2026-04-30T10:20:00.000Z',
      acceptedPointCount: 4,
      distanceMeters: 1450,
      discoveredMeters: 320,
    };

    await repository.saveSummary(summary);
    db.allResults.set(SELECT_SESSION_SUMMARIES_SQL, [summary]);

    const summaries = await repository.listSummaries();

    expect(summaries).toEqual([summary]);
  });

  test('session repository persists active session and accepted points', async () => {
    const db = new FakeStorageDatabase();
    const repository = new SessionRepository(db);

    await repository.saveActiveSession({ id: 'session-live', startedAtIso: '2026-05-01T10:00:00.000Z' });
    await repository.appendAcceptedPoint('session-live', {
      lat: 48.2,
      lon: 2.3,
      accuracyMeters: 8,
      timestampIso: '2026-05-01T10:00:01.000Z',
      speedMps: 1.4,
    });
    db.firstResults.set(SELECT_ACTIVE_SESSION_SQL, {
      id: 'session-live',
      startedAtIso: '2026-05-01T10:00:00.000Z',
    });
    db.allResults.set(SELECT_ACCEPTED_POINTS_SQL, [
      {
        lat: 48.2,
        lon: 2.3,
        accuracyMeters: 8,
        timestampIso: '2026-05-01T10:00:01.000Z',
        speedMps: 1.4,
      },
    ]);

    const activeSession = await repository.getActiveSession();
    const points = await repository.listAcceptedPoints('session-live');

    expect(activeSession?.id).toBe('session-live');
    expect(points).toHaveLength(1);
  });

  test('session repository clears session history and active state transactionally', async () => {
    const db = new FakeStorageDatabase();
    const repository = new SessionRepository(db);

    await repository.clearHistory();

    expect(db.execCalls).toContain('BEGIN');
    expect(db.execCalls).toContain('COMMIT');
    expect(db.runCalls.some((entry) => entry.sql === 'DELETE FROM walk_session_points')).toBe(true);
    expect(db.runCalls.some((entry) => entry.sql === 'DELETE FROM walk_session_summaries')).toBe(true);
    expect(db.runCalls.some((entry) => entry.sql === 'DELETE FROM active_walk_session')).toBe(true);
  });

  test('tracking repository applies discovery updates transactionally with session summary', async () => {
    const db = new FakeStorageDatabase();
    const repository = new TrackingRepository(db);
    await repository.finalizeSessionAndApplyDiscovery(
      {
        id: 'session-live',
        startedAtIso: '2026-05-01T10:00:00.000Z',
        endedAtIso: '2026-05-01T10:20:00.000Z',
        acceptedPointCount: 3,
        distanceMeters: 1200,
      },
      [
        { segmentId: 'seg-1', discoveredMetersDelta: 35 },
        { segmentId: 'seg-2', discoveredMetersDelta: 12 },
      ]
    );

    expect(db.execCalls).toContain('BEGIN');
    expect(db.execCalls).toContain('COMMIT');
    expect(
      db.runCalls.some((entry) => entry.sql.startsWith('INSERT INTO discovery_progress'))
    ).toBe(true);
  });

  test('settings repository stores and reads boolean values', async () => {
    const db = new FakeStorageDatabase();
    const repository = new SettingsRepository(db);

    await repository.setBoolean('smartNudgesEnabled', true);
    db.firstResults.set(SELECT_SETTING_SQL, { value: 'true' });

    const smartNudgesEnabled = await repository.getBoolean('smartNudgesEnabled', false);

    expect(smartNudgesEnabled).toBe(true);
  });

  test('nudge repository can clear all persisted nudges', async () => {
    const db = new FakeStorageDatabase();
    const repository = new NudgeRepository(db);

    await repository.clearAll();

    expect(db.runCalls.some((entry) => entry.sql === 'DELETE FROM nudges')).toBe(true);
  });
});
