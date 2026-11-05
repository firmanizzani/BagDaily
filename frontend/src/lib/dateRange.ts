import { APP_TIME_ZONE } from './utils';

export interface DateRange {
  from: string;
  to: string;
  comparison?: 'day' | 'week' | 'month' | 'period' | '7days' | '30days';
}
export type DatePreset = 'all' | 'today' | 'last7' | 'last30';
export function presetDateRange(preset: DatePreset, now = new Date()): DateRange {
  if (preset === 'all') return { from: '', to: '' };
  return recentDateRange(preset === 'today' ? 1 : preset === 'last7' ? 7 : 30, now);
}
export function datePresetForRange(range: DateRange, now = new Date()): DatePreset | undefined {
  return (['all', 'today', 'last7', 'last30'] as const).find(preset => {
    const candidate = presetDateRange(preset, now);
    return candidate.from === range.from && candidate.to === range.to;
  });
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
  if (!range.from && !range.to) params.set('all', 'true');
  if (range.from)
    params.set('from', new Date(`${range.from}T00:00:00+07:00`).toISOString());
  if (range.to)
    params.set(
      'to',
      new Date(new Date(`${range.to}T00:00:00+07:00`).getTime() + 86400000).toISOString(),
    );
  if (range.from && range.to) {
    const days = Math.round((new Date(range.to).getTime() - new Date(range.from).getTime()) / 86400000) + 1;
    const inferred = days === 1 ? 'day' : days === 7 ? '7days' : days === 30 ? '30days' : 'period';
    params.set('compare', range.comparison ?? inferred);
  }
  return params;
}
