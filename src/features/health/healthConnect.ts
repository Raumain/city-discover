export type HealthConnectDailyData = {
  steps: number;
  distanceKm?: number;
};

export function resolveDailyDistanceKm(data: HealthConnectDailyData, strideMeters: number): number {
  if (typeof data.distanceKm === 'number') {
    return data.distanceKm;
  }

  return (data.steps * strideMeters) / 1000;
}
