import type { DailyStat } from '@/src/domain/stats';
import type { PersistedSessionSummary } from '@/src/features/storage/repositories/sessionRepository';

const DEFAULT_STRIDE_METERS = 0.75;

export function buildDailyStatsFromSessions(
  sessions: PersistedSessionSummary[],
  strideMeters = DEFAULT_STRIDE_METERS
): DailyStat[] {
  const byDate = new Map<string, { totalDistanceMeters: number; totalDiscoveredMeters: number }>();

  for (const session of sessions) {
    const dateKey = session.endedAtIso.slice(0, 10);
    const existing = byDate.get(dateKey) ?? { totalDistanceMeters: 0, totalDiscoveredMeters: 0 };

    existing.totalDistanceMeters += session.distanceMeters;
    existing.totalDiscoveredMeters += session.discoveredMeters;
    byDate.set(dateKey, existing);
  }

  const stats: DailyStat[] = [];

  for (const [isoDate, entry] of byDate) {
    const steps = Math.round(entry.totalDistanceMeters / strideMeters);

    stats.push({
      isoDate,
      steps,
      kilometers: entry.totalDistanceMeters / 1000,
      newlyDiscoveredMeters: entry.totalDiscoveredMeters,
    });
  }

  stats.sort((a, b) => b.isoDate.localeCompare(a.isoDate));

  return stats;
}
