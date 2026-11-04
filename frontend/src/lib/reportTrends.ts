export interface ReportTrendPoint { date: string; revenue: number; units: number; transactions: number }
export interface MonthlyCategoryPoint { month: string; categoryId: string; name: string; quantity: number }
export interface ReportTrends { sales: ReportTrendPoint[]; monthly: MonthlyCategoryPoint[] }
export type ReportInterval = 'day' | 'week' | 'month';

function bucket(value: string, interval: ReportInterval) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (interval === 'month') date.setUTCDate(1);
  if (interval === 'week') date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  return date;
}
// Missing dates are zero sales, not a straight line connecting two selling days.
export function reportDates(first: string, last: string, interval: ReportInterval): string[] {
  if (!first || !last) return [];
  const start = bucket(first, interval);
  const end = bucket(last, interval);
  const dates: string[] = [];
  while (start <= end) {
    dates.push(start.toISOString().slice(0, 10));
    if (interval === 'month') start.setUTCMonth(start.getUTCMonth() + 1);
    else start.setUTCDate(start.getUTCDate() + (interval === 'week' ? 7 : 1));
  }
  return dates;
}
export function completeTrend(rows: ReportTrendPoint[], interval: ReportInterval, from = '', to = '') {
  if (!rows.length) return [];
  const lookup = new Map(rows.map(row => [row.date, row]));
  return reportDates(from || rows[0]!.date, to || rows.at(-1)!.date, interval)
    .map(date => lookup.get(date) ?? { date, revenue: 0, units: 0, transactions: 0 });
}
export function categoryTimeline(rows: MonthlyCategoryPoint[], from = '', to = '') {
  if (!rows.length) return { categories: [], points: [] };
  const categories = Array.from(new Map(rows.map(row => [row.categoryId, { id: row.categoryId, name: row.name }])).values());
  const months = rows.map(row => row.month).sort();
  const lookup = new Map(rows.map(row => [`${row.month}:${row.categoryId}`, row.quantity]));
  const points = reportDates(from || months[0]!, to || months.at(-1)!, 'month').map(date => ({ date,
    ...Object.fromEntries(categories.map(category => [category.id, lookup.get(`${date}:${category.id}`) ?? 0])),
  }));
  return { categories, points };
}
