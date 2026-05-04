import { selectDiscoveryMetrics, selectPeriodStats } from '@/src/features/discovery/selectors';
import type { DiscoveryState } from '@/src/features/discovery/orchestrator';

const state: DiscoveryState = {
  snapshot: {
    cityName: 'Demo City',
    cityKey: 'demo-city',
    areaKm2: 50,
    totalStreetLengthMeters: 300,
    fetchedAtIso: '2026-04-30T00:00:00.000Z',
    source: 'seed',
    schemaVersion: 1,
  },
  segments: [
    {
      id: 'seg-1',
      fromNodeId: 'n1',
      toNodeId: 'n2',
      lengthMeters: 100,
      fromX: 0,
      fromY: 0,
      toX: 1,
      toY: 1,
      discoveredMeters: 100,
    },
    {
      id: 'seg-2',
      fromNodeId: 'n2',
      toNodeId: 'n3',
      lengthMeters: 200,
      fromX: 1,
      fromY: 1,
      toX: 2,
      toY: 2,
      discoveredMeters: 50,
    },
  ],
  dailyStats: [
    { isoDate: '2026-04-30', steps: 4000, kilometers: 3, newlyDiscoveredMeters: 80 },
    { isoDate: '2026-04-29', steps: 3000, kilometers: 2.2, newlyDiscoveredMeters: 60 },
  ],
  nearbyUnexploredStreets: ['Rue A'],
  weeklyMotivationDecision: {
    shouldSendNudge: false,
    reason: 'on_track',
    suggestion: 'Keep going',
  },
  latestSessionSummary: null,
  settings: {
    smartNudgesEnabled: true,
    autoDetectCityEnabled: true,
    onboardingCompleted: true,
  },
  onboarding: {
    completed: true,
    cityName: 'Demo City',
    countryCode: 'FR',
  },
  tracking: {
    status: 'idle',
    foregroundPermission: 'granted',
    activeSessionId: null,
    lastError: null,
    lastMatchedTrackPoints: [],
  },
};

describe('discovery selectors', () => {
  test('selectDiscoveryMetrics computes primary and secondary discovery values', () => {
    const metrics = selectDiscoveryMetrics(state);

    expect(metrics.discoveredLengthMeters).toBe(150);
    expect(metrics.totalLengthMeters).toBe(300);
    expect(metrics.lengthPercent).toBe(50);
    expect(metrics.segmentPercent).toBe(100);
  });

  test('selectPeriodStats computes period aggregates', () => {
    const period = selectPeriodStats(state, 'day', '2026-04-30');

    expect(period.steps).toBe(4000);
    expect(period.kilometers).toBe(3);
    expect(period.periodDiscoveryPercent).toBeCloseTo(26.666, 2);
  });
});
