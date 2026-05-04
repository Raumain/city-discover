import type { MotivationDecision } from '@/src/features/motivation/engine';
import { scheduleNudgeIfNeeded } from '@/src/features/notifications/notificationService';

type FakeNotifications = {
  scheduled: unknown[];
  getPermissionsAsync: jest.Mock;
  requestPermissionsAsync: jest.Mock;
  scheduleNotificationAsync: jest.Mock;
  SchedulableTriggerInputTypes: { TIME_INTERVAL: string };
};

function createFakeNotifications(permissionGranted: boolean): FakeNotifications {
  const scheduled: unknown[] = [];

  return {
    scheduled,
    getPermissionsAsync: jest.fn().mockResolvedValue({ status: permissionGranted ? 'granted' : 'denied' }),
    requestPermissionsAsync: jest.fn().mockResolvedValue({ status: permissionGranted ? 'granted' : 'denied' }),
    scheduleNotificationAsync: jest.fn().mockImplementation((notification: unknown) => {
      scheduled.push(notification);
      return Promise.resolve();
    }),
    SchedulableTriggerInputTypes: {
      TIME_INTERVAL: 'timeInterval' as const,
    },
  };
}

const behindGoalDecision: MotivationDecision = {
  shouldSendNudge: true,
  reason: 'behind_goal',
  suggestion: 'Try a short walk near unexplored streets to boost this week.',
};

const onTrackDecision: MotivationDecision = {
  shouldSendNudge: false,
  reason: 'on_track',
  suggestion: 'You are on track for your weekly discovery goal.',
};

describe('scheduleNudgeIfNeeded', () => {
  let notifications: FakeNotifications;

  beforeEach(() => {
    notifications = createFakeNotifications(true);
  });

  test('returns false when smart nudges are disabled', async () => {
    const recordNudge = jest.fn();

    const result = await scheduleNudgeIfNeeded(
      behindGoalDecision,
      false,
      recordNudge,
      notifications as unknown as Parameters<typeof scheduleNudgeIfNeeded>[3]
    );

    expect(result).toBe(false);
    expect(notifications.scheduled).toHaveLength(0);
    expect(recordNudge).not.toHaveBeenCalled();
  });

  test('returns false when decision says not to nudge', async () => {
    const recordNudge = jest.fn();

    const result = await scheduleNudgeIfNeeded(
      onTrackDecision,
      true,
      recordNudge,
      notifications as unknown as Parameters<typeof scheduleNudgeIfNeeded>[3]
    );

    expect(result).toBe(false);
    expect(notifications.scheduled).toHaveLength(0);
  });

  test('schedules notification and records nudge when conditions are met', async () => {
    const recordNudge = jest.fn();

    const result = await scheduleNudgeIfNeeded(
      behindGoalDecision,
      true,
      recordNudge,
      notifications as unknown as Parameters<typeof scheduleNudgeIfNeeded>[3]
    );

    expect(result).toBe(true);
    expect(notifications.scheduled).toHaveLength(1);
    expect(recordNudge).toHaveBeenCalledTimes(1);

    const nudgeCall = recordNudge.mock.calls[0] as [string, string, string, string];
    expect(nudgeCall[1]).toContain('Z');
    expect(nudgeCall[2]).toBe('behind_goal');
    expect(nudgeCall[3]).toBe(behindGoalDecision.suggestion);
  });

  test('requests permission when not yet granted', async () => {
    const recordNudge = jest.fn();
    const deniedNotifications = createFakeNotifications(false);
    deniedNotifications.requestPermissionsAsync = jest.fn().mockResolvedValue({ status: 'granted' });

    const result = await scheduleNudgeIfNeeded(
      behindGoalDecision,
      true,
      recordNudge,
      deniedNotifications as unknown as Parameters<typeof scheduleNudgeIfNeeded>[3]
    );

    expect(result).toBe(true);
    expect(deniedNotifications.requestPermissionsAsync).toHaveBeenCalled();
    expect(deniedNotifications.scheduled).toHaveLength(1);
  });

  test('returns false when permission is denied', async () => {
    const recordNudge = jest.fn();
    const deniedNotifications = createFakeNotifications(false);

    const result = await scheduleNudgeIfNeeded(
      behindGoalDecision,
      true,
      recordNudge,
      deniedNotifications as unknown as Parameters<typeof scheduleNudgeIfNeeded>[3]
    );

    expect(result).toBe(false);
    expect(deniedNotifications.scheduled).toHaveLength(0);
  });
});
