import { useMemo } from 'react';

import { selectDiscoveryMetrics } from '@/src/features/discovery/selectors';
import { useDiscoveryData } from '@/src/features/discovery/hooks/useDiscoveryData';

export function useMapViewModel() {
  const discovery = useDiscoveryData();
  const metrics = useMemo(
    () => (discovery.data ? selectDiscoveryMetrics(discovery.data) : null),
    [discovery.data]
  );

  return {
    ...discovery,
    metrics,
    segments: discovery.data?.segments ?? [],
    nearbyUnexploredStreets: discovery.data?.nearbyUnexploredStreets ?? [],
    weeklyMotivationDecision: discovery.data?.weeklyMotivationDecision ?? null,
    latestSessionSummary: discovery.data?.latestSessionSummary ?? null,
    tracking: discovery.data?.tracking ?? {
      status: 'idle',
      foregroundPermission: 'undetermined',
      activeSessionId: null,
      lastError: null,
      lastMatchedTrackPoints: [],
    },
  };
}
