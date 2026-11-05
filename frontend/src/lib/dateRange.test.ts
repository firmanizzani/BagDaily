import { describe, expect, it } from 'vitest';
import {
  dateRangeParams,
  jakartaDateKey,
  recentDateRange,
  datePresetForRange,
  presetDateRange,
} from './dateRange';
describe('admin date ranges in Jakarta', () => {
  it('sends an explicit comparison mode so matching preset dates remain unambiguous', () => {
    const range={from:'2026-11-02',to:'2026-11-02'};
    expect(dateRangeParams({...range,comparison:'day'}).get('compare')).toBe('day');
    expect(dateRangeParams({...range,comparison:'week'}).get('compare')).toBe('week');
    expect(dateRangeParams({...range,comparison:'month'}).get('compare')).toBe('month');
    expect(dateRangeParams({...range,comparison:'period'}).get('compare')).toBe('period');
  });
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
    ).toEqual({ from: '2026-09-30T17:00:00.000Z', to: '2026-10-31T17:00:00.000Z', compare: 'period' });
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
  it('uses rolling seven days rather than Monday-to-today', () => {
    expect(presetDateRange('last7', new Date('2026-11-05T04:00:00Z'))).toEqual({from:'2026-10-30',to:'2026-11-05'});
    expect(dateRangeParams(presetDateRange('last7', new Date('2026-11-05T04:00:00Z'))).get('compare')).toBe('7days');
  });
  it('uses rolling thirty days and selects the matching preset instead of all time', () => {
    const now=new Date('2026-11-05T04:00:00Z');
    const range=presetDateRange('last30',now);
    expect(range).toEqual({from:'2026-10-07',to:'2026-11-05'});
    expect(dateRangeParams(range).get('compare')).toBe('30days');
    expect(datePresetForRange(range,now)).toBe('last30');
    expect(datePresetForRange({from:'',to:''},now)).toBe('all');
    expect(datePresetForRange({from:'2026-09-01',to:'2026-10-04'},now)).toBeUndefined();
  });
});
