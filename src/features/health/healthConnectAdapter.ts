import type { HealthConnectDailyData, resolveDailyDistanceKm } from '@/src/features/health/healthConnect';

export type HealthStatus = 'available' | 'permission_denied' | 'unavailable';

export type HealthConnectAdapter = {
  isAvailable(): Promise<boolean>;
  requestPermission(): Promise<boolean>;
  fetchDailyData(isoDate: string): Promise<HealthConnectDailyData>;
  getStatus(): Promise<HealthStatus>;
};

export function createFallbackHealthAdapter(): HealthConnectAdapter {
  return {
    async isAvailable() {
      return false;
    },

    async requestPermission() {
      return false;
    },

    async fetchDailyData() {
      return { steps: 0 };
    },

    async getStatus() {
      return 'unavailable';
    },
  };
}
