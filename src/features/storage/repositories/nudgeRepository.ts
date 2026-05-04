import type { StorageDatabase } from '@/src/features/storage/client';

const COUNT_WEEK_NUDGES_SQL =
  'SELECT COUNT(*) as count FROM nudges WHERE week_key = ?';
const INSERT_NUDGE_SQL =
  'INSERT INTO nudges (week_key, sent_at_iso, reason, suggestion) VALUES (?, ?, ?, ?)';
const SELECT_WEEK_NUDGES_SQL =
  'SELECT id, week_key as weekKey, sent_at_iso as sentAtIso, reason, suggestion FROM nudges WHERE week_key = ? ORDER BY id';

export type PersistedNudge = {
  id: number;
  weekKey: string;
  sentAtIso: string;
  reason: string;
  suggestion: string;
};

export class NudgeRepository {
  constructor(private readonly database: StorageDatabase) {}

  async countNudgesInWeek(weekKey: string): Promise<number> {
    const record = await this.database.getFirstAsync<{ count: number }>(COUNT_WEEK_NUDGES_SQL, [weekKey]);
    return record?.count ?? 0;
  }

  async recordNudge(weekKey: string, sentAtIso: string, reason: string, suggestion: string): Promise<void> {
    await this.database.runAsync(INSERT_NUDGE_SQL, [weekKey, sentAtIso, reason, suggestion]);
  }

  async listNudgesInWeek(weekKey: string): Promise<PersistedNudge[]> {
    return this.database.getAllAsync<PersistedNudge>(SELECT_WEEK_NUDGES_SQL, [weekKey]);
  }

  async clearAll(): Promise<void> {
    await this.database.runAsync('DELETE FROM nudges');
  }
}
