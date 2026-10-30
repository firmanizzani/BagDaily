import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatDate, formatShortDate } from './utils';

describe('Jakarta date display', () => {
  afterEach(() => vi.unstubAllEnvs());

  it.each(['UTC', 'America/Los_Angeles', 'Asia/Tokyo'])(
    'displays WIB regardless of device timezone %s',
    timezone => {
      vi.stubEnv('TZ', timezone);
      const result = formatDate('2026-10-29T18:30:00Z');
      expect(result).toContain('30 Okt 2026');
      expect(result).toMatch(/01[.:]30 WIB$/);
    },
  );

  it('switches the calendar date at Jakarta midnight', () => {
    expect(formatDate('2026-10-29T16:59:00Z')).toMatch(/29 Okt 2026.*23[.:]59 WIB$/);
    expect(formatDate('2026-10-29T17:00:00Z')).toMatch(/30 Okt 2026.*00[.:]00 WIB$/);
  });

  it('handles the year boundary in Jakarta', () => {
    expect(formatDate('2026-12-31T18:00:00Z')).toMatch(/1 Jan 2027.*01[.:]00 WIB$/);
  });

  it('does not add seven hours twice when the input already has an offset', () => {
    expect(formatDate('2026-10-30T01:30:00+07:00')).toBe(
      formatDate('2026-10-29T18:30:00Z'),
    );
  });

  it('uses the same Jakarta date for headers and chart labels', () => {
    expect(formatShortDate('2026-10-29T18:30:00Z')).toBe('30 Okt 2026');
    expect(formatShortDate('2026-10-29T18:30:00Z', false)).toBe('30 Okt');
    expect(formatShortDate('2026-10-30', false)).toBe('30 Okt');
  });

  it('preserves invalid input instead of breaking the page', () => {
    expect(formatDate('invalid-date')).toBe('invalid-date');
    expect(formatShortDate('invalid-date')).toBe('invalid-date');
  });
});
