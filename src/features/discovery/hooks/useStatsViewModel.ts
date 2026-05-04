import { useMemo } from 'react';

import type { PeriodMode } from '@/src/domain/stats';
import { useDiscoveryData } from '@/src/features/discovery/hooks/useDiscoveryData';
import { selectDiscoveryMetrics, selectPeriodStats } from '@/src/features/discovery/selectors';

export function useStatsViewModel(mode: PeriodMode, anchorIsoDate: string) {
  const discovery = useDiscoveryData();
  const metrics = useMemo(
    () => (discovery.data ? selectDiscoveryMetrics(discovery.data) : null),
    [discovery.data]
  );
  const periodStats = useMemo(
    () => (discovery.data ? selectPeriodStats(discovery.data, mode, anchorIsoDate) : null),
    [anchorIsoDate, discovery.data, mode]
  );

  return {
    ...discovery,
    metrics,
    periodStats,
    weeklyMotivationDecision: discovery.data?.weeklyMotivationDecision ?? null,
  };
}
