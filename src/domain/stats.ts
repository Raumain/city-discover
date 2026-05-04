export type DailyStat = {
  isoDate: string;
  steps: number;
  kilometers: number;
  newlyDiscoveredMeters: number;
};

export type PeriodMode = 'day' | 'week';

export type AggregatePeriodInput = {
  mode: PeriodMode;
  anchorIsoDate: string;
  totalCityStreetLengthMeters: number;
};

export type AggregatedPeriodStats = {
  steps: number;
  kilometers: number;
  periodDiscoveryPercent: number;
};

export function aggregatePeriodStats(
  dailyStats: DailyStat[],
  input: AggregatePeriodInput
): AggregatedPeriodStats {
  const matching = dailyStats.filter((entry) => isInPeriod(entry.isoDate, input.mode, input.anchorIsoDate));
  const steps = matching.reduce((sum, entry) => sum + entry.steps, 0);
  const kilometers = matching.reduce((sum, entry) => sum + entry.kilometers, 0);
  const newlyDiscoveredMeters = matching.reduce((sum, entry) => sum + entry.newlyDiscoveredMeters, 0);

  return {
    steps,
    kilometers,
    periodDiscoveryPercent:
      input.totalCityStreetLengthMeters > 0
        ? (newlyDiscoveredMeters / input.totalCityStreetLengthMeters) * 100
        : 0,
  };
}

function isInPeriod(isoDate: string, mode: PeriodMode, anchorIsoDate: string): boolean {
  if (mode === 'day') {
    return isoDate === anchorIsoDate;
  }

  const anchor = new Date(`${anchorIsoDate}T00:00:00Z`);
  const date = new Date(`${isoDate}T00:00:00Z`);
  const diffDays = Math.floor((anchor.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  return diffDays >= 0 && diffDays <= 6;
}
