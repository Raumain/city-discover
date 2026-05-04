import type { DailyStat } from '@/src/domain/stats';
import type { MotivationInput, MotivationDecision } from '@/src/features/motivation/engine';
import { evaluateMotivation } from '@/src/features/motivation/engine';
import type { DiscoveryProvider, DiscoverySettings, SegmentGeometry } from '@/src/features/discovery/providers';
import { buildDailyStatsFromSessions } from '@/src/features/discovery/dailyStatsBuilder';
import { scheduleNudgeIfNeeded as defaultScheduleNudge } from '@/src/features/notifications/notificationService';
import type { LocationPermissionState } from '@/src/features/tracking/locationAdapter';
import type { MatchableSegment } from '@/src/features/tracking/mapMatcher';
import type { TrackPoint } from '@/src/domain/discovery';
import type {
  CitySnapshotRepository,
  PersistedCitySegment,
  PersistedCitySnapshot,
} from '@/src/features/storage/repositories/citySnapshotRepository';
import type {
  DiscoveryRepository,
  PersistedDiscoveryProgress,
} from '@/src/features/storage/repositories/discoveryRepository';
import type { PersistedSessionSummary, SessionRepository } from '@/src/features/storage/repositories/sessionRepository';
import type { SettingsRepository } from '@/src/features/storage/repositories/settingsRepository';
import type { SessionManagerApi } from '@/src/features/tracking/types';
import type { NudgeRepository } from '@/src/features/storage/repositories/nudgeRepository';
import { computeWeekKey } from '@/src/features/storage/weekKey';

type DiscoverySegment = PersistedCitySegment &
  SegmentGeometry & {
    discoveredMeters: number;
  };

export type DiscoveryState = {
  snapshot: PersistedCitySnapshot;
  segments: DiscoverySegment[];
  dailyStats: DailyStat[];
  nearbyUnexploredStreets: string[];
  weeklyMotivationDecision: MotivationDecision;
  latestSessionSummary: PersistedSessionSummary | null;
  settings: DiscoverySettings;
  onboarding: {
    completed: boolean;
    cityName: string;
    countryCode: string;
  };
  tracking: {
    status: 'idle' | 'active' | 'error';
    foregroundPermission: LocationPermissionState;
    activeSessionId: string | null;
    lastError: string | null;
    lastMatchedTrackPoints: TrackPoint[];
  };
};

type Repositories = {
  citySnapshots: Pick<CitySnapshotRepository, 'saveSnapshot' | 'getSnapshot'>;
  discovery: Pick<DiscoveryRepository, 'upsertProgress' | 'listProgress' | 'clearAllProgress'>;
  sessions: Pick<SessionRepository, 'saveSummary' | 'listSummaries' | 'clearHistory'>;
  settings: Pick<SettingsRepository, 'setBoolean' | 'getBoolean' | 'setNumber' | 'getNumber' | 'setString' | 'getString'>;
  nudges: Pick<NudgeRepository, 'countNudgesInWeek' | 'recordNudge' | 'listNudgesInWeek' | 'clearAll'>;
};

type TrackingService = {
  getForegroundPermissionState: () => Promise<LocationPermissionState>;
  requestForegroundPermission: () => Promise<LocationPermissionState>;
  startSession: (sessionId: string, startedAtIso: string) => Promise<{ id: string; startedAtIso: string }>;
  recoverActiveSession: SessionManagerApi['recoverActiveSession'];
  stopAndFinalize: (
    endedAtIso: string,
    segments: Array<PersistedCitySegment & { discoveredMeters: number }>,
    segmentGeometry: MatchableSegment[]
  ) => Promise<{ matchedTrackPoints: TrackPoint[] }>;
};

export class DiscoveryOrchestrator {
  private seedDataPromise: Promise<Awaited<ReturnType<DiscoveryProvider['loadSeed']>>> | null = null;
  private state: DiscoveryState | null = null;
  private trackingStatus: DiscoveryState['tracking']['status'] = 'idle';
  private trackingActiveSessionId: string | null = null;
  private trackingPermission: LocationPermissionState = 'undetermined';
  private trackingLastError: string | null = null;
  private trackingLastMatchedPoints: TrackPoint[] = [];
  private readonly scheduleNudgeFn: typeof defaultScheduleNudge;

  constructor(
    private readonly repositories: Repositories,
    private readonly provider: DiscoveryProvider,
    private readonly trackingService: TrackingService,
    scheduleNudgeFn: typeof defaultScheduleNudge = defaultScheduleNudge
  ) {
    this.scheduleNudgeFn = scheduleNudgeFn;
  }

  async initialize(): Promise<DiscoveryState> {
    this.trackingPermission = await this.trackingService.getForegroundPermissionState();
    const recovered = await this.trackingService.recoverActiveSession();
    this.trackingActiveSessionId = recovered?.id ?? null;
    this.trackingStatus = recovered ? 'active' : 'idle';
    const state = await this.buildState();
    this.state = state;
    await this.tryScheduleNudge();
    return state;
  }

  async setSetting(key: keyof DiscoverySettings, value: boolean): Promise<DiscoveryState> {
    if (!this.state) {
      await this.initialize();
    }

    await this.repositories.settings.setBoolean(key, value);
    const nextState = await this.buildState();
    this.state = nextState;
    return nextState;
  }

  async completeOnboarding(input: {
    cityName: string;
    countryCode?: string;
    autoDetectCityEnabled: boolean;
  }): Promise<DiscoveryState> {
    const normalizedCityName = input.cityName.trim();
    if (normalizedCityName.length === 0) {
      throw new Error('City name is required to complete onboarding.');
    }

    const normalizedCountryCode = (input.countryCode ?? '').trim().toUpperCase();
    await this.repositories.settings.setString('selectedCityName', normalizedCityName);
    await this.repositories.settings.setString('selectedCountryCode', normalizedCountryCode);
    await this.repositories.settings.setBoolean('autoDetectCityEnabled', input.autoDetectCityEnabled);
    await this.repositories.settings.setBoolean('onboardingCompleted', true);

    const nextState = await this.buildState();
    this.state = nextState;
    return nextState;
  }

  async resetDiscoveryData(): Promise<DiscoveryState> {
    await this.repositories.discovery.clearAllProgress();
    await this.repositories.sessions.clearHistory();
    await this.repositories.nudges.clearAll();

    this.trackingStatus = 'idle';
    this.trackingActiveSessionId = null;
    this.trackingLastMatchedPoints = [];
    this.trackingLastError = null;

    const nextState = await this.buildState();
    this.state = nextState;
    return nextState;
  }

  async requestForegroundPermission(): Promise<DiscoveryState> {
    this.trackingPermission = await this.trackingService.requestForegroundPermission();
    const nextState = await this.buildState();
    this.state = nextState;
    return nextState;
  }

  async startTracking(startedAtIso: string = new Date().toISOString()): Promise<DiscoveryState> {
    const sessionId = `session-${Date.now()}`;
    try {
      this.trackingStatus = 'active';
      this.trackingLastError = null;
      const session = await this.trackingService.startSession(sessionId, startedAtIso);
      this.trackingActiveSessionId = session.id;
      this.trackingPermission = await this.trackingService.getForegroundPermissionState();
    } catch (error) {
      this.trackingStatus = 'error';
      this.trackingLastError = error instanceof Error ? error.message : String(error);
      throw error;
    }

    const nextState = await this.buildState();
    this.state = nextState;
    return nextState;
  }

  async stopTracking(endedAtIso: string = new Date().toISOString()): Promise<DiscoveryState> {
    if (!this.state) {
      await this.initialize();
    }

    if (!this.state) {
      throw new Error('Discovery state is unavailable.');
    }

    const segmentGeometry = this.state.segments.map((segment) => ({
      id: segment.id,
      fromX: segment.fromX,
      fromY: segment.fromY,
      toX: segment.toX,
      toY: segment.toY,
    }));

    const finalized = await this.trackingService.stopAndFinalize(endedAtIso, this.state.segments, segmentGeometry);
    this.trackingStatus = 'idle';
    this.trackingActiveSessionId = null;
    this.trackingLastMatchedPoints = finalized.matchedTrackPoints;
    this.trackingLastError = null;

    const nextState = await this.buildState();
    this.state = nextState;
    await this.tryScheduleNudge();
    return nextState;
  }

  private async buildState(): Promise<DiscoveryState> {
    const seed = await this.loadSeedData();
    await this.ensureSeeded(seed);

    const bundle = await this.repositories.citySnapshots.getSnapshot();
    if (!bundle) {
      throw new Error('City snapshot should be available after seeding.');
    }

    const progress = await this.repositories.discovery.listProgress();
    const discoveredBySegmentId = new Map(progress.map((entry) => [entry.segmentId, entry.discoveredMeters]));
    const segmentGeometryById = new Map(seed.segments.map((segment) => [segment.id, segment]));
    const segments: DiscoverySegment[] = bundle.segments.map((segment) => ({
      ...segment,
      fromX: segmentGeometryById.get(segment.id)?.fromX ?? 0,
      fromY: segmentGeometryById.get(segment.id)?.fromY ?? 0,
      toX: segmentGeometryById.get(segment.id)?.toX ?? 0,
      toY: segmentGeometryById.get(segment.id)?.toY ?? 0,
      discoveredMeters: discoveredBySegmentId.get(segment.id) ?? 0,
    }));

    const sessionSummaries = await this.repositories.sessions.listSummaries();
    const latestSessionSummary = sessionSummaries[0] ?? null;
    const dailyStats = buildDailyStatsFromSessions(sessionSummaries);
    const weeklyMotivationDecision = await this.evaluateMotivationNow(sessionSummaries);
    const nearbyUnexploredStreets = computeUnexploredStreets(segments, seed.nearbyUnexploredStreets);

    return {
      snapshot: bundle.snapshot,
      segments,
      dailyStats,
      nearbyUnexploredStreets,
      weeklyMotivationDecision,
      latestSessionSummary,
      settings: {
        smartNudgesEnabled: await this.repositories.settings.getBoolean(
          'smartNudgesEnabled',
          seed.defaultSettings.smartNudgesEnabled
        ),
        autoDetectCityEnabled: await this.repositories.settings.getBoolean(
          'autoDetectCityEnabled',
          seed.defaultSettings.autoDetectCityEnabled
        ),
        onboardingCompleted: await this.repositories.settings.getBoolean(
          'onboardingCompleted',
          seed.defaultSettings.onboardingCompleted
        ),
      },
      onboarding: {
        completed: await this.repositories.settings.getBoolean(
          'onboardingCompleted',
          seed.defaultSettings.onboardingCompleted
        ),
        cityName: await this.repositories.settings.getString('selectedCityName', bundle.snapshot.cityName),
        countryCode: await this.repositories.settings.getString('selectedCountryCode', ''),
      },
      tracking: {
        status: this.trackingStatus,
        foregroundPermission: this.trackingPermission,
        activeSessionId: this.trackingActiveSessionId,
        lastError: this.trackingLastError,
        lastMatchedTrackPoints: this.trackingLastMatchedPoints,
      },
    };
  }

  private async evaluateMotivationNow(
    sessionSummaries: PersistedSessionSummary[]
  ): Promise<MotivationDecision> {
    const today = new Date().toISOString().slice(0, 10);
    const weekKey = computeWeekKey(today);
    const weeklyNudgesAlreadySent = await this.repositories.nudges.countNudgesInWeek(weekKey);
    const lastSession = sessionSummaries[0];
    const lastActivityIsoDate = lastSession?.endedAtIso.slice(0, 10) ?? today;
    const weeklyDiscoveryGoalMeters = await this.repositories.settings.getNumber(
      'weeklyDiscoveryGoalMeters',
      1000
    );

    const discoveredThisWeekMeters = sessionSummaries
      .filter((session) => computeWeekKey(session.endedAtIso.slice(0, 10)) === weekKey)
      .reduce((sum, session) => sum + session.discoveredMeters, 0);

    return evaluateMotivation({
      currentIsoDate: today,
      weeklyNudgesAlreadySent,
      lastActivityIsoDate,
      weeklyDiscoveryGoalMeters,
      discoveredThisWeekMeters,
    });
  }

  private async ensureSeeded(seed: Awaited<ReturnType<DiscoveryProvider['loadSeed']>>): Promise<void> {
    const bundle = await this.repositories.citySnapshots.getSnapshot();
    if (bundle) {
      return;
    }

    await this.repositories.citySnapshots.saveSnapshot(seed.snapshot, seed.segments);
    await this.upsertProgressRows(seed.progress);
    await this.repositories.settings.setBoolean('smartNudgesEnabled', seed.defaultSettings.smartNudgesEnabled);
    await this.repositories.settings.setBoolean('autoDetectCityEnabled', seed.defaultSettings.autoDetectCityEnabled);
    await this.repositories.settings.setBoolean('onboardingCompleted', seed.defaultSettings.onboardingCompleted);
    await this.repositories.settings.setString('selectedCityName', seed.snapshot.cityName);
    await this.repositories.settings.setString('selectedCountryCode', '');
    if (seed.latestSessionSummary) {
      await this.repositories.sessions.saveSummary(seed.latestSessionSummary);
    }
  }

  private async tryScheduleNudge(): Promise<void> {
    if (!this.state) {
      return;
    }

    const { weeklyMotivationDecision, settings } = this.state;

    await this.scheduleNudgeFn(
      weeklyMotivationDecision,
      settings.smartNudgesEnabled,
      (weekKey, sentAtIso, reason, suggestion) =>
        this.repositories.nudges.recordNudge(weekKey, sentAtIso, reason, suggestion)
    );
  }

  private async upsertProgressRows(progressRows: PersistedDiscoveryProgress[]): Promise<void> {
    for (const row of progressRows) {
      await this.repositories.discovery.upsertProgress(row.segmentId, row.discoveredMeters);
    }
  }

  private async loadSeedData(): Promise<Awaited<ReturnType<DiscoveryProvider['loadSeed']>>> {
    if (!this.seedDataPromise) {
      this.seedDataPromise = this.provider.loadSeed();
    }
    return this.seedDataPromise;
  }
}

function computeUnexploredStreets(
  segments: DiscoverySegment[],
  fallback: string[]
): string[] {
  const unexplored = segments
    .filter((segment) => segment.discoveredMeters === 0)
    .map((segment) => segment.id);

  return unexplored.length > 0 ? unexplored.slice(0, 5) : fallback;
}
