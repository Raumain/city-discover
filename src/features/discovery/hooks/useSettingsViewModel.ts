import { useState, useEffect } from 'react';
import * as Notifications from 'expo-notifications';

import { useDiscoveryData } from '@/src/features/discovery/hooks/useDiscoveryData';

type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export function useSettingsViewModel() {
  const discovery = useDiscoveryData();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermissionStatus>('undetermined');

  useEffect(() => {
    Notifications.getPermissionsAsync()
      .then(({ status }) => {
        setNotificationPermission(status as NotificationPermissionStatus);
      })
      .catch(() => {
        setNotificationPermission('unavailable');
      });
  }, []);

  const settings = discovery.data?.settings ?? {
    smartNudgesEnabled: false,
    autoDetectCityEnabled: false,
    onboardingCompleted: false,
  };

  return {
    ...discovery,
    settings,
    onboarding: discovery.data?.onboarding ?? {
      completed: false,
      cityName: '',
      countryCode: '',
    },
    latestSessionSummary: discovery.data?.latestSessionSummary ?? null,
    tracking: discovery.data?.tracking ?? {
      status: 'idle',
      foregroundPermission: 'undetermined',
      activeSessionId: null,
      lastError: null,
      lastMatchedTrackPoints: [],
    },
    notificationPermission,
    healthStatus: 'fallback' as const,
  };
}
