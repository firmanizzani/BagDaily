import { APP_TIME_ZONE } from './utils';

export interface DateRange {
  from: string;
  to: string;
}
export function jakartaDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = (type: string) => parts.find(part => part.type === type)!.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}
export function recentDateRange(days = 30, now = new Date()): DateRange {
  const to = jakartaDateKey(now);
  const start = new Date(`${to}T00:00:00+07:00`);
  start.setTime(start.getTime() - (days - 1) * 86400000);
  return { from: jakartaDateKey(start), to };
}
export function dateRangeParams(range: DateRange): URLSearchParams {
  const params = new URLSearchParams();
  if (range.from)
    params.set('from', new Date(`${range.from}T00:00:00+07:00`).toISOString());
  if (range.to)
    params.set(
      'to',
      new Date(new Date(`${range.to}T00:00:00+07:00`).getTime() + 86400000).toISOString(),
    );
  return params;
}
