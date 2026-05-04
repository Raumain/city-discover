export type MotivationInput = {
  currentIsoDate: string;
  weeklyNudgesAlreadySent: number;
  lastActivityIsoDate: string;
  weeklyDiscoveryGoalMeters: number;
  discoveredThisWeekMeters: number;
};

export type MotivationDecision = {
  shouldSendNudge: boolean;
  reason: 'recent_activity' | 'weekly_limit' | 'on_track' | 'behind_goal';
  suggestion: string;
};

const MAX_WEEKLY_NUDGES = 3;
const RECENT_ACTIVITY_WINDOW_DAYS = 1;

export function evaluateMotivation(input: MotivationInput): MotivationDecision {
  if (input.weeklyNudgesAlreadySent >= MAX_WEEKLY_NUDGES) {
    return {
      shouldSendNudge: false,
      reason: 'weekly_limit',
      suggestion: 'Weekly nudge cap reached. Great consistency.',
    };
  }

  const daysSinceActivity = dayDiff(input.currentIsoDate, input.lastActivityIsoDate);
  if (daysSinceActivity <= RECENT_ACTIVITY_WINDOW_DAYS) {
    return {
      shouldSendNudge: false,
      reason: 'recent_activity',
      suggestion: 'Nice work staying active. No reminder needed today.',
    };
  }

  const targetProgress = input.weeklyDiscoveryGoalMeters * 0.8;
  if (input.discoveredThisWeekMeters < targetProgress) {
    return {
      shouldSendNudge: true,
      reason: 'behind_goal',
      suggestion: 'Try a short walk near unexplored streets to boost this week.',
    };
  }

  return {
    shouldSendNudge: false,
    reason: 'on_track',
    suggestion: 'You are on track for your weekly discovery goal.',
  };
}

function dayDiff(leftIsoDate: string, rightIsoDate: string): number {
  const left = new Date(`${leftIsoDate}T00:00:00Z`);
  const right = new Date(`${rightIsoDate}T00:00:00Z`);
  return Math.floor((left.getTime() - right.getTime()) / (1000 * 60 * 60 * 24));
}
