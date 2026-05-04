import { useCallback, useEffect, useState } from 'react';

import { getDiscoveryOrchestrator } from '@/src/features/discovery/bootstrap';
import type { DiscoveryState } from '@/src/features/discovery/orchestrator';
import type { DiscoverySettings } from '@/src/features/discovery/providers';

type DiscoveryDataResult = {
  data: DiscoveryState | null;
  loading: boolean;
  error: Error | null;
  updateSetting: (key: keyof DiscoverySettings, value: boolean) => Promise<void>;
  completeOnboarding: (input: { cityName: string; countryCode?: string; autoDetectCityEnabled: boolean }) => Promise<void>;
  resetDiscoveryData: () => Promise<void>;
  retryLoad: () => Promise<void>;
  requestForegroundPermission: () => Promise<void>;
  startTracking: () => Promise<void>;
  stopTracking: () => Promise<void>;
};

export function useDiscoveryData(): DiscoveryDataResult {
  const [data, setData] = useState<DiscoveryState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const orchestrator = await getDiscoveryOrchestrator();
      const nextState = await orchestrator.initialize();
      setData(nextState);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError : new Error('Failed to load discovery data.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        await load();
      } finally {
        if (!mounted) {
          return;
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [load]);

  const updateSetting = useCallback(async (key: keyof DiscoverySettings, value: boolean) => {
    try {
      const orchestrator = await getDiscoveryOrchestrator();
      const nextState = await orchestrator.setSetting(key, value);
      setData(nextState);
      setError(null);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError : new Error('Failed to update setting.'));
      throw actionError;
    }
  }, []);

  const requestForegroundPermission = useCallback(async () => {
    try {
      const orchestrator = await getDiscoveryOrchestrator();
      const nextState = await orchestrator.requestForegroundPermission();
      setData(nextState);
      setError(null);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError : new Error('Failed to request foreground permission.'));
      throw actionError;
    }
  }, []);

  const completeOnboarding = useCallback(
    async (input: { cityName: string; countryCode?: string; autoDetectCityEnabled: boolean }) => {
      try {
        const orchestrator = await getDiscoveryOrchestrator();
        const nextState = await orchestrator.completeOnboarding(input);
        setData(nextState);
        setError(null);
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError : new Error('Failed to complete onboarding.'));
        throw actionError;
      }
    },
    []
  );

  const resetDiscoveryData = useCallback(async () => {
    try {
      const orchestrator = await getDiscoveryOrchestrator();
      const nextState = await orchestrator.resetDiscoveryData();
      setData(nextState);
      setError(null);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError : new Error('Failed to reset discovery data.'));
      throw actionError;
    }
  }, []);

  const startTracking = useCallback(async () => {
    try {
      const orchestrator = await getDiscoveryOrchestrator();
      const nextState = await orchestrator.startTracking();
      setData(nextState);
      setError(null);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError : new Error('Failed to start tracking.'));
      throw actionError;
    }
  }, []);

  const stopTracking = useCallback(async () => {
    try {
      const orchestrator = await getDiscoveryOrchestrator();
      const nextState = await orchestrator.stopTracking();
      setData(nextState);
      setError(null);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError : new Error('Failed to stop tracking.'));
      throw actionError;
    }
  }, []);

  return {
    data,
    loading,
    error,
    updateSetting,
    completeOnboarding,
    resetDiscoveryData,
    retryLoad: load,
    requestForegroundPermission,
    startTracking,
    stopTracking,
  };
}
