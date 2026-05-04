import { evaluateMotivation } from './engine';

describe('evaluateMotivation', () => {
  it('returns no nudge after recent activity', () => {
    const result = evaluateMotivation({
      currentIsoDate: '2026-04-30',
      weeklyNudgesAlreadySent: 1,
      lastActivityIsoDate: '2026-04-29',
      weeklyDiscoveryGoalMeters: 1500,
      discoveredThisWeekMeters: 400,
    });

    expect(result.shouldSendNudge).toBe(false);
    expect(result.reason).toBe('recent_activity');
  });

  it('returns nudge and nearby suggestion when user is behind and under weekly cap', () => {
    const result = evaluateMotivation({
      currentIsoDate: '2026-04-30',
      weeklyNudgesAlreadySent: 2,
      lastActivityIsoDate: '2026-04-25',
      weeklyDiscoveryGoalMeters: 1500,
      discoveredThisWeekMeters: 350,
    });

    expect(result.shouldSendNudge).toBe(true);
    expect(result.reason).toBe('behind_goal');
    expect(result.suggestion).toContain('unexplored');
  });

  it('returns no nudge when weekly cap is reached', () => {
    const result = evaluateMotivation({
      currentIsoDate: '2026-04-30',
      weeklyNudgesAlreadySent: 3,
      lastActivityIsoDate: '2026-04-25',
      weeklyDiscoveryGoalMeters: 1500,
      discoveredThisWeekMeters: 400,
    });

    expect(result.shouldSendNudge).toBe(false);
    expect(result.reason).toBe('weekly_limit');
  });

  it('returns on_track when progress is at or above 80% of goal', () => {
    const result = evaluateMotivation({
      currentIsoDate: '2026-04-30',
      weeklyNudgesAlreadySent: 1,
      lastActivityIsoDate: '2026-04-25',
      weeklyDiscoveryGoalMeters: 1500,
      discoveredThisWeekMeters: 1200,
    });

    expect(result.shouldSendNudge).toBe(false);
    expect(result.reason).toBe('on_track');
  });
});
