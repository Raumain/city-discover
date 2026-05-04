import { computeWeekKey } from '@/src/features/storage/weekKey';

describe('computeWeekKey', () => {
  test('returns ISO week for known date', () => {
    expect(computeWeekKey('2026-04-30')).toBe('2026-W18');
  });

  test('returns W01 for early January dates', () => {
    expect(computeWeekKey('2026-01-01')).toBe('2026-W01');
  });

  test('returns W53 when applicable', () => {
    expect(computeWeekKey('2026-12-31')).toBe('2026-W53');
  });

  test('handles Sunday-to-Monday week boundary', () => {
    expect(computeWeekKey('2026-05-03')).toBe('2026-W18');
    expect(computeWeekKey('2026-05-04')).toBe('2026-W19');
  });
});
