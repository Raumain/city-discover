import { DiscoveryOrchestrator } from '@/src/features/discovery/orchestrator';
import type { DiscoveryProvider } from '@/src/features/discovery/providers';
import type {
  PersistedCitySegment,
  PersistedCitySnapshot,
} from '@/src/features/storage/repositories/citySnapshotRepository';

function noopScheduleNudge() {
  return Promise.resolve(false);
}

class FakeCitySnapshotRepository {
  public saved: { snapshot: PersistedCitySnapshot; segments: PersistedCitySegment[] } | null = null;
  private current: { snapshot: PersistedCitySnapshot; segments: PersistedCitySegment[] } | null = null;

  async saveSnapshot(snapshot: PersistedCitySnapshot, segments: PersistedCitySegment[]): Promise<void> {
    this.saved = { snapshot, segments };
    this.current = { snapshot, segments };
  }

  async getSnapshot() {
    return this.current;
  }
}

class FakeDiscoveryRepository {
  private rows: Array<{ segmentId: string; discoveredMeters: number }> = [];

  async upsertProgress(segmentId: string, discoveredMeters: number): Promise<void> {
    const existing = this.rows.find((row) => row.segmentId === segmentId);
    if (existing) {
      existing.discoveredMeters = discoveredMeters;
      return;
    }
    this.rows.push({ segmentId, discoveredMeters });
  }

  async listProgress() {
    return this.rows;
  }

  async clearAllProgress(): Promise<void> {
    this.rows = [];
  }
}

class FakeSessionRepository {
  private summaries: Array<{
    id: string;
    startedAtIso: string;
    endedAtIso: string;
    acceptedPointCount: number;
    distanceMeters: number;
    discoveredMeters: number;
  }> = [];

  async saveSummary(summary: {
    id: string;
    startedAtIso: string;
    endedAtIso: string;
    acceptedPointCount: number;
    distanceMeters: number;
    discoveredMeters: number;
  }): Promise<void> {
    this.summaries = [summary, ...this.summaries.filter((candidate) => candidate.id !== summary.id)];
  }

  async listSummaries() {
    return this.summaries;
  }

  async clearHistory(): Promise<void> {
    this.summaries = [];
  }
}

class FakeSettingsRepository {
  private values = new Map<string, string>();

  async setString(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }

  async getString(key: string, fallbackValue: string): Promise<string> {
    return this.values.get(key) ?? fallbackValue;
  }

  async setBoolean(key: string, value: boolean): Promise<void> {
    this.values.set(key, value ? 'true' : 'false');
  }

  async getBoolean(key: string, fallbackValue: boolean): Promise<boolean> {
    const value = this.values.get(key);
    if (value == null) {
      return fallbackValue;
    }
    return value === 'true';
  }

  async setNumber(key: string, value: number): Promise<void> {
    this.values.set(key, String(value));
  }

  async getNumber(key: string, fallbackValue: number): Promise<number> {
    const raw = this.values.get(key);
    if (raw == null) {
      return fallbackValue;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallbackValue;
  }
}

class FakeNudgeRepository {
  public counts = new Map<string, number>();
  public records: Array<{ weekKey: string; sentAtIso: string; reason: string; suggestion: string }> = [];

  async countNudgesInWeek(weekKey: string): Promise<number> {
    return this.counts.get(weekKey) ?? 0;
  }

  async recordNudge(weekKey: string, sentAtIso: string, reason: string, suggestion: string): Promise<void> {
    this.records.push({ weekKey, sentAtIso, reason, suggestion });
  }

  async listNudgesInWeek() {
    return [];
  }

  async clearAll(): Promise<void> {
    this.records = [];
    this.counts.clear();
  }
}

const provider: DiscoveryProvider = {
  async loadSeed() {
    return {
      snapshot: {
        cityName: 'Demo City',
        cityKey: 'demo-city',
        areaKm2: 40,
        totalStreetLengthMeters: 220,
        fetchedAtIso: '2026-04-30T00:00:00.000Z',
        source: 'seed',
        schemaVersion: 1,
      },
      segments: [
        {
          id: 'seg-1',
          fromNodeId: 'n1',
          toNodeId: 'n2',
          lengthMeters: 120,
          fromX: 0,
          fromY: 0,
          toX: 1,
          toY: 1,
        },
        {
          id: 'seg-2',
          fromNodeId: 'n2',
          toNodeId: 'n3',
          lengthMeters: 100,
          fromX: 1,
          fromY: 1,
          toX: 2,
          toY: 2,
        },
      ],
      progress: [
        { segmentId: 'seg-1', discoveredMeters: 90 },
        { segmentId: 'seg-2', discoveredMeters: 25 },
      ],
      dailyStats: [{ isoDate: '2026-04-30', steps: 1200, kilometers: 0.9, newlyDiscoveredMeters: 80 }],
      nearbyUnexploredStreets: ['Rue de la Fontaine'],
      weeklyMotivationDecision: {
        shouldSendNudge: true,
        reason: 'behind_goal',
        suggestion: 'Take a short walk.',
      },
      latestSessionSummary: {
        id: 's1',
        startedAtIso: '2026-04-30T10:00:00.000Z',
        endedAtIso: '2026-04-30T10:20:00.000Z',
        acceptedPointCount: 5,
        distanceMeters: 1400,
        discoveredMeters: 0,
      },
      defaultSettings: {
        smartNudgesEnabled: true,
        autoDetectCityEnabled: true,
        onboardingCompleted: false,
      },
    };
  },
};

describe('DiscoveryOrchestrator', () => {
  test('initialization seeds storage once and returns persisted app state', async () => {
    const citySnapshots = new FakeCitySnapshotRepository();
    const discovery = new FakeDiscoveryRepository();
    const sessions = new FakeSessionRepository();
    const settings = new FakeSettingsRepository();
    const orchestrator = new DiscoveryOrchestrator(
      {
        citySnapshots,
        discovery,
        sessions,
        settings,
        nudges: new FakeNudgeRepository(),
      },
      provider,
      {
        async getForegroundPermissionState() {
          return 'granted';
        },
        async requestForegroundPermission() {
          return 'granted';
        },
        async startSession(id: string, startedAtIso: string) {
          return { id, startedAtIso };
        },
        async stopAndFinalize() {
          return { matchedTrackPoints: [] };
        },
        async recoverActiveSession() {
          return null;
        },
      },
      noopScheduleNudge
    );

    const state = await orchestrator.initialize();

    expect(citySnapshots.saved?.snapshot.cityName).toBe('Demo City');
    expect(state.segments[0].discoveredMeters).toBe(90);
    expect(state.settings.smartNudgesEnabled).toBe(true);
    expect(state.latestSessionSummary?.id).toBe('s1');
    expect(state.tracking.foregroundPermission).toBe('granted');
    expect(state.onboarding.completed).toBe(false);
    expect(state.onboarding.cityName).toBe('Demo City');
  });

  test('setting updates are persisted and reflected in state', async () => {
    const orchestrator = new DiscoveryOrchestrator(
      {
        citySnapshots: new FakeCitySnapshotRepository(),
        discovery: new FakeDiscoveryRepository(),
        sessions: new FakeSessionRepository(),
        settings: new FakeSettingsRepository(),
        nudges: new FakeNudgeRepository(),
      },
      provider,
      {
        async getForegroundPermissionState() {
          return 'granted';
        },
        async requestForegroundPermission() {
          return 'granted';
        },
        async startSession(id: string, startedAtIso: string) {
          return { id, startedAtIso };
        },
        async stopAndFinalize() {
          return { matchedTrackPoints: [] };
        },
        async recoverActiveSession() {
          return null;
        },
      },
      noopScheduleNudge
    );

    await orchestrator.initialize();
    const updated = await orchestrator.setSetting('smartNudgesEnabled', false);

    expect(updated.settings.smartNudgesEnabled).toBe(false);
  });

  test('completeOnboarding persists selected city and clears onboarding requirement', async () => {
    const orchestrator = new DiscoveryOrchestrator(
      {
        citySnapshots: new FakeCitySnapshotRepository(),
        discovery: new FakeDiscoveryRepository(),
        sessions: new FakeSessionRepository(),
        settings: new FakeSettingsRepository(),
        nudges: new FakeNudgeRepository(),
      },
      provider,
      {
        async getForegroundPermissionState() {
          return 'granted';
        },
        async requestForegroundPermission() {
          return 'granted';
        },
        async startSession(id: string, startedAtIso: string) {
          return { id, startedAtIso };
        },
        async stopAndFinalize() {
          return { matchedTrackPoints: [] };
        },
        async recoverActiveSession() {
          return null;
        },
      },
      noopScheduleNudge
    );

    await orchestrator.initialize();
    const updated = await orchestrator.completeOnboarding({
      cityName: 'Lyon',
      countryCode: 'FR',
      autoDetectCityEnabled: false,
    });

    expect(updated.onboarding.completed).toBe(true);
    expect(updated.onboarding.cityName).toBe('Lyon');
    expect(updated.onboarding.countryCode).toBe('FR');
    expect(updated.settings.autoDetectCityEnabled).toBe(false);
  });

  test('resetDiscoveryData clears discovery progress, sessions, and nudges', async () => {
    const orchestrator = new DiscoveryOrchestrator(
      {
        citySnapshots: new FakeCitySnapshotRepository(),
        discovery: new FakeDiscoveryRepository(),
        sessions: new FakeSessionRepository(),
        settings: new FakeSettingsRepository(),
        nudges: new FakeNudgeRepository(),
      },
      provider,
      {
        async getForegroundPermissionState() {
          return 'granted';
        },
        async requestForegroundPermission() {
          return 'granted';
        },
        async startSession(id: string, startedAtIso: string) {
          return { id, startedAtIso };
        },
        async stopAndFinalize() {
          return { matchedTrackPoints: [] };
        },
        async recoverActiveSession() {
          return null;
        },
      },
      noopScheduleNudge
    );

    await orchestrator.initialize();
    const resetState = await orchestrator.resetDiscoveryData();

    expect(resetState.latestSessionSummary).toBeNull();
    expect(resetState.segments.every((segment) => segment.discoveredMeters === 0)).toBe(true);
  });
});
