import { calculateDiscoveryMetrics } from '@/src/domain/discovery';
import { aggregatePeriodStats, type PeriodMode } from '@/src/domain/stats';
import type { DiscoveryState } from '@/src/features/discovery/orchestrator';

export function selectDiscoveryMetrics(state: DiscoveryState) {
  return calculateDiscoveryMetrics(state.segments);
}

export function selectPeriodStats(state: DiscoveryState, mode: PeriodMode, anchorIsoDate: string) {
  const metrics = selectDiscoveryMetrics(state);
  return aggregatePeriodStats(state.dailyStats, {
    mode,
    anchorIsoDate,
    totalCityStreetLengthMeters: metrics.totalLengthMeters,
  });
}
