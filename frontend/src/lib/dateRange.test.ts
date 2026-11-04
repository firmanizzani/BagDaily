import { describe, expect, it } from 'vitest';
import {
  dateRangeParams,
  jakartaDateKey,
  recentDateRange,
  presetDateRange,
} from './dateRange';
describe('admin date ranges in Jakarta', () => {
  it('uses the Jakarta calendar day across UTC midnight', () => {
    expect(jakartaDateKey(new Date('2026-12-31T17:05:00Z'))).toBe('2027-01-01');
  });
  it('includes thirty calendar days across a year boundary', () => {
    expect(recentDateRange(30, new Date('2027-01-01T02:00:00Z'))).toEqual({
      from: '2026-12-03',
      to: '2027-01-01',
    });
  });
  it('sends inclusive start and exclusive next midnight to the API', () => {
    expect(
      Object.fromEntries(dateRangeParams({ from: '2026-10-01', to: '2026-10-31' })),
    ).toEqual({ from: '2026-09-30T17:00:00.000Z', to: '2026-10-31T17:00:00.000Z' });
  });
  it('explicitly requests all time instead of triggering backend 30-day defaults', () => {
    expect(dateRangeParams(presetDateRange('all')).toString()).toBe('all=true');
  });
  it('uses the same inclusive day for today in Jakarta', () => {
    expect(presetDateRange('today', new Date('2026-11-03T18:00:00Z'))).toEqual({
      from: '2026-11-04',
      to: '2026-11-04',
    });
  });
  it('starts this week on Monday', () => {
    expect(presetDateRange('week', new Date('2026-11-04T04:00:00Z'))).toEqual({
      from: '2026-11-02',
      to: '2026-11-04',
    });
    expect(presetDateRange('week', new Date('2027-01-03T04:00:00Z'))).toEqual({
      from: '2026-12-28',
      to: '2027-01-03',
    });
  });
  it('starts this month on the first day', () => {
    expect(presetDateRange('month', new Date('2026-11-04T04:00:00Z'))).toEqual({
      from: '2026-11-01',
      to: '2026-11-04',
    });
  });
});
