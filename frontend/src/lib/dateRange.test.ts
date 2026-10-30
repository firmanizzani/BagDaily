import { describe, expect, it } from 'vitest';
import { dateRangeParams, jakartaDateKey, recentDateRange } from './dateRange';
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
  it('keeps an unfiltered order range empty', () => {
    expect(dateRangeParams({ from: '', to: '' }).toString()).toBe('');
  });
});
