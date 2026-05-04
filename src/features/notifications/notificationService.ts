import * as Notifications from 'expo-notifications';

import type { MotivationDecision } from '@/src/features/motivation/engine';
import { computeWeekKey } from '@/src/features/storage/weekKey';

async function requestNotificationPermissions(
  notifications: typeof Notifications
): Promise<boolean> {
  const { status: existingStatus } = await notifications.getPermissionsAsync();
  if (existingStatus === 'granted') {
    return true;
  }

  const { status } = await notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleNudgeIfNeeded(
  decision: MotivationDecision,
  smartNudgesEnabled: boolean,
  recordNudge: (weekKey: string, sentAtIso: string, reason: string, suggestion: string) => Promise<void>,
  notifications: typeof Notifications = Notifications
): Promise<boolean> {
  if (!smartNudgesEnabled) {
    return false;
  }

  if (!decision.shouldSendNudge) {
    return false;
  }

  const permissionGranted = await requestNotificationPermissions(notifications);
  if (!permissionGranted) {
    return false;
  }

  await notifications.scheduleNotificationAsync({
    content: {
      title: 'City Discover',
      body: decision.suggestion,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 30 * 60,
    },
  });

  const nowIso = new Date().toISOString();
  const weekKey = computeWeekKey(nowIso.slice(0, 10));

  await recordNudge(weekKey, nowIso, decision.reason, decision.suggestion);

  return true;
}