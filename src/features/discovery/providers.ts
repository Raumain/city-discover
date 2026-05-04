import type { DailyStat } from '@/src/domain/stats';
import type { MotivationDecision } from '@/src/features/motivation/engine';
import type { PersistedCitySegment, PersistedCitySnapshot } from '@/src/features/storage/repositories/citySnapshotRepository';
import type { PersistedSessionSummary } from '@/src/features/storage/repositories/sessionRepository';

export type SegmentGeometry = {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
};

export type DiscoveryProgressSeed = {
  segmentId: string;
  discoveredMeters: number;
};

export type DiscoverySettings = {
  smartNudgesEnabled: boolean;
  autoDetectCityEnabled: boolean;
  onboardingCompleted: boolean;
};

export type DiscoverySeedData = {
  snapshot: PersistedCitySnapshot;
  segments: Array<PersistedCitySegment & SegmentGeometry>;
  progress: DiscoveryProgressSeed[];
  dailyStats: DailyStat[];
  nearbyUnexploredStreets: string[];
  weeklyMotivationDecision: MotivationDecision;
  latestSessionSummary: PersistedSessionSummary | null;
  defaultSettings: DiscoverySettings;
};

export type DiscoveryProvider = {
  loadSeed(): Promise<DiscoverySeedData>;
};
